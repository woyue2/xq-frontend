import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import { coreLogger } from '../middlewares/logger.middleware';
import { aiAuditService } from './ai-audit.service';
import {
  signQuestionShareToken,
  verifyQuestionShareToken
} from '../utils/jwt';
const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export class QuestionService {
  async createShareLink(params: {
    questionId: string;
    userId: string;
    role: string;
  }) {
    const { questionId, userId, role } = params;

    // 修改原因：分享链接生成前复用现有详情权限校验，避免无权用户为他人内容生成外链。
    await this.getById(questionId, { userId, role });

    const shareToken = signQuestionShareToken(questionId);
    // 修改原因：MVP 固定 1 小时有效期，保持规则简单可控。
    const expireAt = Date.now() + 60 * 60 * 1000;

    return {
      shareToken,
      expireAt
    };
  }

  async assertShareTokenAccess(params: {
    questionId: string;
    shareToken: string;
  }) {
    const { questionId, shareToken } = params;

    let payload: { questionId: string };
    try {
      payload = verifyQuestionShareToken(shareToken);
    } catch {
      throw new AppError(401, 'INVALID_SHARE_TOKEN', '分享链接无效或已过期');
    }

    if (payload.questionId !== questionId) {
      throw new AppError(
        403,
        'SHARE_TOKEN_SCOPE_MISMATCH',
        '分享链接与目标问题不匹配'
      );
    }
  }

  // 修改原因：为“我的提问”提供独立状态计数，避免前端受分页数据影响出现统计偏差。
  async getMyStatusCounts(params: { authorId: string }) {
    const { authorId } = params;

    const grouped = await prisma.question.groupBy({
      by: ['status'],
      where: { authorId },
      _count: { _all: true }
    });

    // ⚠️ 不确定因素：历史数据可能出现非预期状态值，统一归入 other，避免前端展示中断。
    const counts = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      banned: 0,
      other: 0
    };

    for (const item of grouped) {
      const c = item._count._all ?? 0;
      counts.total += c;
      if (item.status === 'pending') counts.pending += c;
      else if (item.status === 'approved') counts.approved += c;
      else if (item.status === 'rejected') counts.rejected += c;
      else if (item.status === 'banned') counts.banned += c;
      else counts.other += c;
    }

    return counts;
  }

  async create(params: {
    title: string;
    content?: string;
    images?: string[];
    tags?: string[];
    difficulty?: string;
    subject?: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    authorRole?: string;
  }) {
    const {
      title,
      content,
      images,
      tags,
      difficulty,
      authorId,
      authorName,
      authorAvatar,
      authorRole
    } = params;

    // 修改原因：产品现阶段仅支持数学问答，后端在写入前统一兜底为 math，避免历史客户端传入其他科目。
    // ⚠️ 不确定因素：若后续恢复多学科，这里应改回“按白名单校验后落库”而非强制覆盖。
    const normalizedSubject = 'math';

    if (!title || title.length > 100) {
      throw new AppError(
        400,
        'TITLE_TOO_LONG',
        '标题长度不能超过100字符'
      );
    }

    // 查询作者信息，用于确定角色和展示名称
    let author = await prisma.user.findUnique({
      where: { id: authorId }
    });

    if (!author) {
      // 在非生产环境中，为了避免开发阶段前端拿到"用户不存在"而无法提问，
      // 当检测到作者不存在时自动创建一个占位用户，但必须确保有对应的白名单。
      if (process.env.NODE_ENV !== 'production') {
        const fallbackPhone = `199${Date.now().toString().slice(-8)}`;
        const fallbackRole =
          authorRole === 'teacher'
            ? 'teacher'
            : 'student';

        // 检查是否已有白名单记录（白名单必须由管理员预先创建）
        const existingWl = await prisma.userWhitelist.findUnique({
          where: { phone: fallbackPhone }
        });

        if (!existingWl || existingWl.deletedAt) {
          // 没有白名单，拒绝创建占位用户，避免产生孤立的User记录
          throw new AppError(
            404,
            'USER_NOT_FOUND',
            '用户不存在且没有对应的白名单，请先注册或联系管理员添加白名单'
          );
        }

        coreLogger.warn(
          {
            mode: 'degraded',
            feature: 'question.create',
            env: process.env.NODE_ENV ?? 'unknown',
            reason: 'author user not found but whitelist exists, auto-creating placeholder user',
            authorId,
            phone: fallbackPhone,
            role: fallbackRole
          },
          'QuestionService.create degraded: auto-create missing author user with existing whitelist'
        );

        author = await prisma.user.create({
          data: {
            id: authorId,
            phone: fallbackPhone,
            nickname: authorName || '未命名用户',
            role: fallbackRole,
            isActive: true,
            isBanned: false
          }
        });
      } else {
        throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
      }
    }

    // AI 内容审核（仅对非老师用户）
    let auditResult: {
      safe: boolean;
      reason?: string;
      category?: string;
      requiresManualReview?: boolean;
      quality?: { clear: boolean; suggestion?: string }
    } = {
      safe: true,
      quality: { clear: true, suggestion: undefined }
    };
    let initialStatus = author.role === 'teacher' ? 'approved' : 'pending';
    let aiResultText = '无违规';

    // 组装标签：在原有 tags 基础上为学生自动补充“年级”标签
    let effectiveTags = Array.isArray(tags) ? [...tags] : [];
    if (author.role === 'student' && author.grade) {
      const gradeTag = author.grade.trim();
      if (gradeTag && !effectiveTags.includes(gradeTag)) {
        effectiveTags.push(gradeTag);
      }
    }

    if (author.role !== 'teacher') {
      // 1. 文本审核
      const contentToAudit = `${title}\n\n${content || ''}`.trim();
      const result = await aiAuditService.auditContent(contentToAudit, 'question');
      auditResult = {
        safe: result.safe,
        reason: result.reason,
        category: result.category,
        requiresManualReview: result.requiresManualReview
      };

      // 2. 图片审核（如果有图片）
      if (images && images.length > 0) {
        const imageResults = await aiAuditService.auditImages(images);
        const unsafeImage = imageResults.find(r => !r.safe);
        const requiresManualReviewImage = imageResults.find(r => r.requiresManualReview);
        
        if (unsafeImage) {
          auditResult.safe = false;
          auditResult.reason = `图片违规：${unsafeImage.reason || '包含不适合未成年人的内容'}`;
          auditResult.category = unsafeImage.category || 'image_violation';
        }
        
        // 如果任何图片需要人工审核，标记整个问题需要人工审核
        if (requiresManualReviewImage) {
          auditResult.requiresManualReview = true;
          if (!auditResult.safe) {
            // 如果同时有违规内容，优先显示违规原因
            auditResult.reason = auditResult.reason || '图片审核服务异常，需人工复核';
          } else {
            auditResult.reason = '图片审核服务异常，需人工复核';
          }
        }
      }

      if (auditResult.requiresManualReview) {
        // AI 审核服务异常，转人工审核
        initialStatus = 'pending';
        aiResultText = JSON.stringify({
          safe: auditResult.safe,
          reason: auditResult.reason,
          category: auditResult.category,
          requiresManualReview: true
        });
      } else if (!auditResult.safe) {
        // 内容违规，直接拒绝
        initialStatus = 'rejected';
        aiResultText = JSON.stringify({
          safe: false,
          reason: auditResult.reason,
          category: auditResult.category
        });
      } else {
        // 内容安全
        // 注意：此处不自动设为 approved。
        // 根据业务规则，学生发布的内容即使通过 AI 审核，也默认为 pending (需老师复核)。
        // 初始状态已经在上方根据角色设定好了 (status = pending)，所以这里保持不变即可。

        // initialStatus = 'approved'; // DELETE: 不要自动通过

        aiResultText = JSON.stringify({
          safe: true,
          quality: auditResult.quality
        });
      }
    }

    const created = await prisma.question.create({
      data: {
        title,
        content: content ?? '',
        subject: normalizedSubject,
        tags: effectiveTags,
        images: images ?? [],
        difficulty: difficulty ?? null,
        status: initialStatus,
        isGoodQuestion: false,
        isPinned: false,
        score: null,
        aiResult: aiResultText,
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 0,
        authorId,
        // 修改原因：公开问题列表/详情默认使用昵称，降低真实姓名暴露风险。
        // ⚠️ 不确定因素：若后续确定“家长端回答页需展示部分真实姓名”，建议仅在展示层做脱敏，不改这里的落库口径。
        authorName: author.nickname || author.name || authorName,
        authorAvatar: authorAvatar ?? author.avatar ?? null
      }
    });

    return {
      id: created.id,
      title: created.title,
      content: created.content,
      images: created.images ?? [],
      tags: created.tags,
      difficulty: created.difficulty,
      authorId: created.authorId,
      authorName: created.authorName,
      status: created.status,
      aiResult: created.aiResult,
      createdAt: created.createdAt,
      // 返回审核结果供前端显示
      aiAudit: {
        safe: auditResult.safe,
        reason: auditResult.reason,
        qualitySuggestion: auditResult.quality?.suggestion
      }
    };
  }

  async list(params: {
    page?: number;
    pageSize?: number;
    subject?: string;
    status?: string;
    isGoodQuestion?: boolean;
    tags?: string[];
    authorId?: string;
    search?: string;
    userId?: string;
  }) {
    const {
      page = 1,
      pageSize = 20,
      subject,
      status,
      isGoodQuestion,
      tags,
      authorId,
      search,
      userId
    } = params;

    const rawPage = Number(page || 1);
    const rawPageSize = Number(pageSize || 20);

    // 严谨的分页参数校验与兜底
    const safePage = (Number.isInteger(rawPage) && rawPage > 0) ? rawPage : 1;
    const safePageSize = (Number.isInteger(rawPageSize) && rawPageSize > 0) ? Math.min(rawPageSize, 100) : 20;

    if (search && typeof search === 'string') {
      const MAX_SEARCH_KEYWORD_LENGTH = 64;
      if (search.trim().length > MAX_SEARCH_KEYWORD_LENGTH) {
        throw new AppError(
          400,
          'SEARCH_KEYWORD_TOO_LONG',
          `搜索关键词过长，请限制在 ${MAX_SEARCH_KEYWORD_LENGTH} 字符以内`
        );
      }
    }


    const where: any = {};

    // 默认仅首页等公共列表展示已通过的问题；
    // 若明确指定 authorId（例如"我的提问"），则不过滤状态，由调用方自行按 status 分组。
    const effectiveStatus =
      typeof status === 'string'
        ? status
        : authorId
          ? undefined
          : 'approved';

    if (effectiveStatus) {
      where.status = effectiveStatus;
    }

    if (subject) {
      where.subject = subject;
    }

    if (authorId) {
      where.authorId = authorId;
    }
    if (typeof isGoodQuestion === 'boolean') {
      where.isGoodQuestion = isGoodQuestion;
    }
    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags
      };
    }

    if (typeof search === 'string' && search.trim().length > 0) {
      const keyword = search.trim();
      // 修改原因：用户输入常出现多空格/全角空格，导致“同一语义关键词”偶发不命中。
      // 这里补充“去空白关键词”匹配分支，提升关键字匹配稳定性（仅影响 search 场景）。
      const compactKeyword = keyword.replace(/\s+/g, '');
      const orConditions: any[] = [
        {
          title: {
            contains: keyword,
            mode: 'insensitive'
          }
        }
      ];

      // 题干也参与搜索（如有）
      orConditions.push({
        content: {
          contains: keyword,
          mode: 'insensitive'
        }
      });

      if (compactKeyword.length > 0 && compactKeyword !== keyword) {
        orConditions.push({
          title: {
            contains: compactKeyword,
            mode: 'insensitive'
          }
        });
        orConditions.push({
          content: {
            contains: compactKeyword,
            mode: 'insensitive'
          }
        });
      }
      // ⚠️ 不确定因素：去空白匹配会扩大结果集；当前仅在“用户输入含空白且与原词不同”时生效以控制影响范围。

      where.OR = orConditions;
    }

    const [list, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize
      }),
      prisma.question.count({ where })
    ]);

    // 批量查询作者的 role（避免 N+1 查询）
    const authorIds = [...new Set(list.map(q => q.authorId))];
    let authors: Array<{ id: string; role: string }> = [];
    if (authorIds.length > 0) {
      authors = await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, role: true }
      });
    }
    const authorRoleMap = new Map(authors.map(a => [a.id, a.role]));

    // 修改原因：首页刷新后需要保留点赞/收藏实心态，列表接口补齐当前用户互动状态。
    let likedQuestionIds = new Set<string>();
    let favoritedQuestionIds = new Set<string>();
    if (userId && list.length > 0) {
      const questionIds = list.map((q) => q.id);
      const [likes, favorites] = await Promise.all([
        prisma.like.findMany({
          where: {
            userId,
            targetType: 'question',
            targetId: { in: questionIds }
          },
          select: { targetId: true }
        }),
        prisma.favorite.findMany({
          where: {
            userId,
            questionId: { in: questionIds }
          },
          select: { questionId: true }
        })
      ]);

      likedQuestionIds = new Set(likes.map((item) => item.targetId));
      favoritedQuestionIds = new Set(favorites.map((item) => item.questionId));
    }

    return {
      list: list.map((q) => ({
        id: q.id,
        title: q.title,
        content: q.content,
        subject: q.subject, // 返回科目字段
        images: q.images ?? [],
        tags: q.tags,
        difficulty: q.difficulty,
        authorId: q.authorId,
        authorName: q.authorName,
        authorAvatar: q.authorAvatar ?? undefined,
        authorRole: authorRoleMap.get(q.authorId),  // 补充 authorRole
        isGoodQuestion: q.isGoodQuestion,
        isPinned: q.isPinned,
        score: q.score ?? undefined,  // 补充 score
        understoodCount: q.understoodCount,
        notUnderstoodCount: q.notUnderstoodCount,
        likes: q.likes,
        favorites: q.favorites,
        comments: q.comments,
        answers: q.answers,
        isLiked: likedQuestionIds.has(q.id),
        isFavorited: favoritedQuestionIds.has(q.id),
        status: q.status,
        createdAt: q.createdAt,
        // 补充 aiAudit（从 aiResult 解析）
        aiAudit: q.aiResult ? (() => {
          try {
            const parsed = JSON.parse(q.aiResult);
            return {
              safe: parsed.safe ?? true,
              reason: parsed.reason
            };
          } catch {
            return undefined;
          }
        })() : undefined
      })),
      pagination: {
        page: rawPage,
        pageSize: safePageSize,
        total,
        totalPages: Math.ceil(total / safePageSize)
      }
    };
  }

  async getById(id: string, userContext?: { userId: string; role: string }) {
    const q = await prisma.question.findUnique({
      where: { id }
    });

    if (!q) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }

    // 隐私边界保护：如果问题未审核通过，则仅作者本人或教师可见
    if (q.status !== 'approved') {
      const isAuthor = userContext?.userId === q.authorId;
      const isTeacher = userContext?.role === 'teacher';

      if (!isAuthor && !isTeacher) {
        throw new AppError(
          403,
          'PERMISSION_DENIED',
          '该问题正在审核中或未通过审核，暂不可见',
          undefined,
          3004
        );
      }
    }

    const author = await prisma.user.findUnique({
      where: { id: q.authorId },
      select: { role: true }
    });

    return {
      id: q.id,
      title: q.title,
      content: q.content,
      images: q.images ?? [],
      audioUrl: null,
      tags: q.tags,
      difficulty: q.difficulty,
      authorId: q.authorId,
      authorName: q.authorName,
      authorAvatar: q.authorAvatar ?? undefined,
      authorRole: author?.role,
      isGoodQuestion: q.isGoodQuestion,
      isPinned: q.isPinned,
      score: q.score ?? undefined,
      understoodCount: q.understoodCount,
      notUnderstoodCount: q.notUnderstoodCount,
      likes: q.likes,
      favorites: q.favorites,
      comments: q.comments,
      answers: q.answers,
      status: q.status,
      createdAt: q.createdAt,
      isLiked: false,
      isFavorited: false,
      // 补充 aiAudit（从 aiResult 解析）
      aiAudit: q.aiResult ? (() => {
        try {
          const parsed = JSON.parse(q.aiResult);
          return {
            safe: parsed.safe ?? true,
            reason: parsed.reason
          };
        } catch {
          return undefined;
        }
      })() : undefined
    };
  }

  // 修改原因：承接列表接口的“理解状态补充”查询，减少 Route 的数据访问职责（P0-3）。
  async appendUnderstandingStatusToList<T extends { id: string }>(params: {
    list: T[];
    userId: string;
  }) {
    const { list, userId } = params;

    if (list.length === 0) {
      return list.map((item) => ({ ...item, understandingStatus: null }));
    }

    const questionIds = list.map((q) => q.id);
    const understandingList = await prisma.questionUnderstanding.findMany({
      where: {
        questionId: { in: questionIds },
        userId
      }
    });

    const understandingMap = new Map(
      understandingList.map((u) => [u.questionId, u.status])
    );

    return list.map((item) => ({
      ...item,
      understandingStatus: understandingMap.get(item.id) ?? null
    }));
  }

  // 修改原因：承接理解状态接口的事务写入，确保 Route 只保留参数校验与响应组装（P0-3）。
  async markUnderstandingStatus(params: {
    questionId: string;
    userId: string;
    status: 'understood' | 'not_understood';
  }) {
    const { questionId, userId, status } = params;

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }

    if (question.authorId !== userId) {
      throw new AppError(
        403,
        'PERMISSION_DENIED',
        '只有提问的学生可以标记是否弄懂'
      );
    }

    return prisma.$transaction(async (tx) => {
      const existing = await tx.questionUnderstanding.findUnique({
        where: {
          questionId_userId: {
            questionId,
            userId
          }
        }
      });

      let understoodDelta = 0;
      let notUnderstoodDelta = 0;

      if (!existing) {
        await tx.questionUnderstanding.create({
          data: {
            questionId,
            userId,
            status
          }
        });

        if (status === 'understood') {
          understoodDelta += 1;
        } else {
          notUnderstoodDelta += 1;
        }
      } else if (existing.status !== status) {
        await tx.questionUnderstanding.update({
          where: { id: existing.id },
          data: { status }
        });

        if (existing.status === 'understood') {
          understoodDelta -= 1;
        } else if (existing.status === 'not_understood') {
          notUnderstoodDelta -= 1;
        }

        if (status === 'understood') {
          understoodDelta += 1;
        } else {
          notUnderstoodDelta += 1;
        }
      }

      const updatedQuestion = await tx.question.update({
        where: { id: questionId },
        data: {
          understoodCount: {
            increment: understoodDelta
          },
          notUnderstoodCount: {
            increment: notUnderstoodDelta
          }
        }
      });

      return {
        questionId,
        status,
        understoodCount: updatedQuestion.understoodCount,
        notUnderstoodCount: updatedQuestion.notUnderstoodCount
      };
    });
  }

  // 修改原因：承接详情页互动状态读取，避免 Route 直接查询 like/favorite/understanding（P0-3）。
  async getInteractionState(params: { questionId: string; userId?: string }) {
    const { questionId, userId } = params;

    if (!userId) {
      return {
        isLiked: false,
        isFavorited: false,
        understandingStatus: null as string | null
      };
    }

    const [like, favorite, understanding] = await Promise.all([
      prisma.like.findUnique({
        where: {
          userId_targetType_targetId: {
            userId,
            targetType: 'question',
            targetId: questionId
          }
        }
      }),
      prisma.favorite.findUnique({
        where: {
          userId_questionId: {
            userId,
            questionId
          }
        }
      }),
      prisma.questionUnderstanding.findUnique({
        where: {
          questionId_userId: {
            questionId,
            userId
          }
        }
      })
    ]);

    return {
      isLiked: !!like,
      isFavorited: !!favorite,
      understandingStatus: understanding?.status ?? null
    };
  }

  async delete(params: { id: string; userId: string; role: string }) {
    const { id, userId, role } = params;

    const question = await prisma.question.findUnique({
      where: { id }
    });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }

    // 教师可以删除任何问题，普通用户只能删除自己的问题
    if (role !== 'teacher' && question.authorId !== userId) {
      throw new AppError(
        403,
        'PERMISSION_DENIED',
        '无权删除该问题',
        undefined,
        3003
      );
    }

    // 修改原因：业务要求“学生提问一旦通过审核（approved）即不可删除”，避免已发布内容被作者撤回。
    if (role !== 'teacher' && question.status === 'approved') {
      throw new AppError(
        403,
        'PERMISSION_DENIED',
        '已通过审核的问题不能删除',
        undefined,
        3003
      );
    }

    // 学生/普通用户只能删除尚无回答的问题；已有回答的问题只能由教师处理
    if (role !== 'teacher' && question.answers > 0) {
      throw new AppError(
        403,
        'PERMISSION_DENIED',
        '已有回答的问题不能删除',
        undefined,
        3003
      );
    }

    await prisma.question.delete({
      where: { id }
    });
  }

  async updateDifficultyByTeacher(params: {
    id: string;
    teacherId: string;
    difficulty: string;
  }) {
    const { id, teacherId, difficulty } = params;

    // 修改原因：老师二次调整难度时，后端统一校验可选值，避免写入脏数据。
    if (!ALLOWED_DIFFICULTIES.includes(difficulty as (typeof ALLOWED_DIFFICULTIES)[number])) {
      throw new AppError(400, 'VALIDATION_ERROR', '难度参数无效');
    }

    const question = await prisma.question.findUnique({
      where: { id }
    });
    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }

    // 修改原因：仅允许已通过审核的问题被老师二次调整，避免干扰待审核流程。
    if (question.status !== 'approved') {
      throw new AppError(
        400,
        'QUESTION_STATUS_INVALID',
        '仅已通过审核的问题支持调整难度'
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.question.update({
        where: { id },
        data: { difficulty }
      });

      await tx.auditLog.create({
        data: {
          auditorId: teacherId,
          targetType: 'question',
          targetId: id,
          action: 'update_difficulty'
        }
      });

      return res;
    });

    return updated;
  }
}

export const questionService = new QuestionService();
