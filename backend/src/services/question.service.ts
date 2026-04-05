/**
 * [POS] backend/src/services/question.service.ts
 *   所属：服务层 | 角色：题目业务逻辑（发布、查询、搜索、AI 审核触发）
 *
 * [INPUT]
 *   - ../config/database            → prisma
 *   - ../errors/AppError            → AppError
 *   - ../middlewares/logger.middleware → coreLogger
 *   - ./ai-audit.service            → aiAuditService
 *
 * [OUTPUT]
 *   - questionService（QuestionService 单例）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/services/CLAUDE.md 的文件清单
 */
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
            nickname: '未命名用户',
            role: fallbackRole,
            isActive: true,
            isBanned: false
          }
        });
      } else {
        throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
      }
    }

    // AI 内容审核（所有角色统一走 AI+人工双重审核）
    let auditResult: { safe: boolean; reason?: string; category?: string; quality?: { clear: boolean; suggestion?: string } } = {
      safe: true,
      quality: { clear: true, suggestion: undefined }
    };
    // 所有角色统一进 pending，需人工复核
    let initialStatus: 'pending' | 'rejected' = 'pending';
    let aiResultText = '无违规';
    
    // 组装标签：在原有 tags 基础上为学生自动补充"年级"标签
    let effectiveTags = Array.isArray(tags) ? [...tags] : [];
    if (author.role === 'student' && author.grade) {
      const gradeTag = author.grade.trim();
      if (gradeTag && !effectiveTags.includes(gradeTag)) {
        effectiveTags.push(gradeTag);
      }
    }
    
    // 1. 文本审核（所有角色）
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
      // 内容安全，进 pending 待人工复核
      aiResultText = JSON.stringify({
        safe: true,
        quality: auditResult.quality
      });
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
        authorName: author.name || author.nickname || '未命名用户',
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

    let understandingMap = new Map<string, string>();
    if (userId && list.length > 0) {
      const questionIds = list.map((q) => q.id);
      const understandingList = await prisma.questionUnderstanding.findMany({
        where: { questionId: { in: questionIds }, userId }
      });
      understandingMap = new Map(understandingList.map((u) => [u.questionId, u.status]));
    }

    return {
      list: list.map((q) => ({
        id: q.id,
        title: q.title,
        content: q.content,
        subject: q.subject,
        images: q.images ?? [],
        tags: q.tags,
        difficulty: q.difficulty,
        authorId: q.authorId,
        authorName: q.authorName,
        authorAvatar: q.authorAvatar ?? undefined,
        isGoodQuestion: q.isGoodQuestion,
        isPinned: q.isPinned,
        understoodCount: q.understoodCount,
        notUnderstoodCount: q.notUnderstoodCount,
        likes: q.likes,
        favorites: q.favorites,
        comments: q.comments,
        answers: q.answers,
        status: q.status,
        createdAt: q.createdAt,
        understandingStatus: understandingMap.get(q.id) ?? null
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

    let isLiked = false;
    let isFavorited = false;
    let understandingStatus: string | null = null;

    if (userContext?.userId) {
      const [like, favorite, understanding] = await Promise.all([
        prisma.like.findUnique({
          where: { userId_targetType_targetId: { userId: userContext.userId, targetType: 'question', targetId: id } }
        }),
        prisma.favorite.findUnique({
          where: { userId_questionId: { userId: userContext.userId, questionId: id } }
        }),
        prisma.questionUnderstanding.findUnique({
          where: { questionId_userId: { questionId: id, userId: userContext.userId } }
        })
      ]);
      isLiked = !!like;
      isFavorited = !!favorite;
      understandingStatus = understanding?.status ?? null;
    }

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
      isLiked,
      isFavorited,
      understandingStatus
    };
  }
  async setUnderstanding(params: { questionId: string; userId: string; status: string }) {
    const { questionId, userId, status } = params;

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }
    if (question.authorId !== userId) {
      throw new AppError(403, 'PERMISSION_DENIED', '只有提问的学生可以标记是否弄懂');
    }

    return prisma.$transaction(async (tx) => {
      const existing = await tx.questionUnderstanding.findUnique({
        where: { questionId_userId: { questionId, userId } }
      });

      let understoodDelta = 0;
      let notUnderstoodDelta = 0;

      if (!existing) {
        await tx.questionUnderstanding.create({ data: { questionId, userId, status } });
        if (status === 'understood') understoodDelta = 1;
        else notUnderstoodDelta = 1;
      } else if (existing.status !== status) {
        await tx.questionUnderstanding.update({ where: { id: existing.id }, data: { status } });
        if (existing.status === 'understood') understoodDelta = -1;
        else if (existing.status === 'not_understood') notUnderstoodDelta = -1;
        if (status === 'understood') understoodDelta += 1;
        else if (status === 'not_understood') notUnderstoodDelta += 1;
      }

      const updatedQuestion = await tx.question.update({
        where: { id: questionId },
        data: {
          understoodCount: { increment: understoodDelta },
          notUnderstoodCount: { increment: notUnderstoodDelta }
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

  async update(params: {
    id: string;
    userId: string;
    title?: string;
    content?: string;
    images?: string[];
    tags?: string[];
    difficulty?: string;
    subject?: string;
  }) {
    const { id, userId, title, content, images, tags, difficulty, subject } = params;

    const question = await prisma.question.findUnique({ where: { id } });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }

    if (question.authorId !== userId) {
      throw new AppError(403, 'PERMISSION_DENIED', '无权编辑该问题', undefined, 3003);
    }

    if (question.status !== 'pending') {
      throw new AppError(403, 'EDIT_NOT_ALLOWED', '只有待审核的问题可以编辑', undefined, 3005);
    }

    if (title && title.length > 100) {
      throw new AppError(400, 'TITLE_TOO_LONG', '标题长度不能超过100字符');
    }

    // AI 重新审核
    let aiResultText = question.aiResult ?? '无违规';
    const effectiveTitle = title ?? question.title;
    const effectiveContent = content ?? question.content ?? '';
    const effectiveImages = images ?? question.images ?? [];

    // 所有角色编辑问题都需重新走 AI 审核
    const contentToAudit = `${effectiveTitle}\n\n${effectiveContent}`.trim();
    const textResult = await aiAuditService.auditContent(contentToAudit, 'question');
    if (!textResult.safe) {
      aiResultText = JSON.stringify({ safe: false, reason: textResult.reason, category: textResult.category });
    } else {
      if (effectiveImages.length > 0) {
        const imageResults = await aiAuditService.auditImages(effectiveImages);
        const unsafeImage = imageResults.find(r => !r.safe);
        if (unsafeImage) {
          aiResultText = JSON.stringify({ safe: false, reason: `图片违规：${unsafeImage.reason || '包含不适合未成年人的内容'}` });
        } else {
          aiResultText = JSON.stringify({ safe: true });
        }
      } else {
        aiResultText = JSON.stringify({ safe: true });
      }
    }

    const updated = await prisma.question.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(images !== undefined && { images }),
        ...(tags !== undefined && { tags }),
        ...(difficulty !== undefined && { difficulty }),
        ...(subject !== undefined && { subject }),
        aiResult: aiResultText,
      }
    });

    return updated;
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
