import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import { coreLogger } from '../middlewares/logger.middleware';
import { aiAuditService } from './ai-audit.service';

export class QuestionService {
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
      subject,
      authorId,
      authorName,
      authorAvatar,
      authorRole
    } = params;

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
      // 当检测到作者不存在时自动创建一个占位用户，便于联调。
      if (process.env.NODE_ENV !== 'production') {
        const fallbackPhone = `199${Date.now().toString().slice(-8)}`;
        const fallbackRole =
          authorRole === 'teacher'
            ? 'teacher'
            : 'student';

        coreLogger.warn(
          {
            mode: 'degraded',
            feature: 'question.create',
            env: process.env.NODE_ENV ?? 'unknown',
            reason: 'author user not found, auto-creating placeholder user',
            authorId,
            phone: fallbackPhone,
            role: fallbackRole
          },
          'QuestionService.create degraded: auto-create missing author user in non-production'
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
    let auditResult: { safe: boolean; reason?: string; category?: string; quality?: { clear: boolean; suggestion?: string } } = {
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
        quality: result.quality
      };

      // 2. 图片审核（如果有图片且文本审核通过）
      if (auditResult.safe && images && images.length > 0) {
        const imageResults = await aiAuditService.auditImages(images);
        const unsafeImage = imageResults.find(r => !r.safe);
        if (unsafeImage) {
          auditResult.safe = false;
          auditResult.reason = `图片违规：${unsafeImage.reason || '包含不适合未成年人的内容'}`;
          auditResult.category = unsafeImage.category || 'image_violation';
        }
      }

      if (!auditResult.safe) {
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
        subject: subject ?? null,
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
        authorName: author.name || author.nickname || authorName,
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
  }) {
    const {
      page = 1,
      pageSize = 20,
      subject,
      status,
      isGoodQuestion,
      tags,
      authorId,
      search
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
}

export const questionService = new QuestionService();
