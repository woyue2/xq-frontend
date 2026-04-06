/**
 * [POS] api/content.ts
 *   所属：API 路由层 | 角色：内容管理（questions + answers + comments）
 *   兄弟：core.ts / auth.ts / social.ts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma, getUserFromToken, AppError, aiAuditService } from './_helpers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Client-Version, X-Client-Mode');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action, id } = req.query;
    const user = getUserFromToken(req);

    // Questions
    if (action === 'questions-list') {
      const { page = 1, pageSize = 20, subject, status, isGoodQuestion, tags, authorId, search } = req.query;
      const result = await listQuestions({
        page: Number(page),
        pageSize: Number(pageSize),
        subject: subject as string,
        status: status as string,
        isGoodQuestion: isGoodQuestion === 'true',
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) as string[] : undefined,
        authorId: authorId as string,
        search: search as string,
        userId: user?.id
      });
      return res.json({ code: 200, data: result });
    }

    if (action === 'questions-create') {
      if (!user) throw new AppError(401, 'UNAUTHORIZED', '请先登录');
      const result = await createQuestion({ ...req.body, authorId: user.id, authorRole: user.role });
      return res.json({ code: 200, data: result });
    }

    if (action === 'questions-get' && id) {
      const result = await getQuestionById(id as string, user ? { userId: user.id, role: user.role } : undefined);
      return res.json({ code: 200, data: result });
    }

    if (action === 'questions-update' && id) {
      if (!user) throw new AppError(401, 'UNAUTHORIZED', '请先登录');
      const result = await updateQuestion({ id: id as string, userId: user.id, ...req.body });
      return res.json({ code: 200, data: result });
    }

    if (action === 'questions-delete' && id) {
      if (!user) throw new AppError(401, 'UNAUTHORIZED', '请先登录');
      await deleteQuestion({ id: id as string, userId: user.id, role: user.role });
      return res.json({ code: 200, message: '删除成功' });
    }

    if (action === 'questions-understanding' && id) {
      if (!user) throw new AppError(401, 'UNAUTHORIZED', '请先登录');
      const { status } = req.body;
      const result = await setUnderstanding({ questionId: id as string, userId: user.id, status });
      return res.json({ code: 200, data: result });
    }

    // Answers
    if (action === 'answers-list' && id) {
      const result = await listAnswers({ questionId: id as string, userId: user?.id });
      return res.json({ code: 200, data: result });
    }

    if (action === 'answers-create' && id) {
      if (!user) throw new AppError(401, 'UNAUTHORIZED', '请先登录');
      const result = await createAnswer({ questionId: id as string, authorId: user.id, authorRole: user.role, ...req.body });
      return res.json({ code: 200, data: result });
    }

    if (action === 'answers-delete' && id) {
      if (!user) throw new AppError(401, 'UNAUTHORIZED', '请先登录');
      await deleteAnswer({ answerId: id as string, userId: user.id, role: user.role });
      return res.json({ code: 200, message: '删除成功' });
    }

    // Comments
    if (action === 'comments-list' && id) {
      const result = await listComments({ questionId: id as string });
      return res.json({ code: 200, data: result });
    }

    if (action === 'comments-create' && id) {
      if (!user) throw new AppError(401, 'UNAUTHORIZED', '请先登录');
      const result = await createComment({ questionId: id as string, authorId: user.id, authorRole: user.role, ...req.body });
      return res.json({ code: 200, data: result });
    }

    if (action === 'comments-delete' && id) {
      if (!user) throw new AppError(401, 'UNAUTHORIZED', '请先登录');
      await deleteComment({ commentId: id as string, userId: user.id, role: user.role });
      return res.json({ code: 200, message: '删除成功' });
    }

    return res.status(404).json({ code: 404, message: 'Action not found' });

  } catch (error) {
    console.error('[Content API Error]', error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        code: error.statusCode,
        error: error.code,
        message: error.message,
        errorCode: error.errorCode
      });
    }
    return res.status(500).json({ code: 500, message: 'Internal server error' });
  }
}


// ============ QUESTIONS ============

async function createQuestion(params: {
  title: string;
  content?: string;
  images?: string[];
  tags?: string[];
  difficulty?: string;
  subject?: string;
  authorId: string;
  authorRole?: string;
}) {
  const { title, content, images, tags, difficulty, subject, authorId, authorRole } = params;

  if (!title || title.length > 100) {
    throw new AppError(400, 'TITLE_TOO_LONG', '标题长度不能超过100字符');
  }

  let author = await prisma.user.findUnique({ where: { id: authorId } });

  if (!author) {
    if (process.env.NODE_ENV !== 'production') {
      const fallbackPhone = `199${Date.now().toString().slice(-8)}`;
      const fallbackRole = authorRole === 'teacher' ? 'teacher' : 'student';
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

  let auditResult: { safe: boolean; reason?: string; category?: string; quality?: { clear: boolean; suggestion?: string } } = {
    safe: true,
    quality: { clear: true, suggestion: undefined }
  };
  let initialStatus: 'pending' | 'rejected' = 'pending';
  let aiResultText = '无违规';

  let effectiveTags = Array.isArray(tags) ? [...tags] : [];
  if (author.role === 'student' && author.grade) {
    const gradeTag = author.grade.trim();
    if (gradeTag && !effectiveTags.includes(gradeTag)) {
      effectiveTags.push(gradeTag);
    }
  }

  const contentToAudit = `${title}\n\n${content || ''}`.trim();
  const result = await aiAuditService.auditContent(contentToAudit, 'question');
  auditResult = {
    safe: result.safe,
    reason: result.reason,
    category: result.category,
    quality: result.quality
  };

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
    initialStatus = 'rejected';
    aiResultText = JSON.stringify({
      safe: false,
      reason: auditResult.reason,
      category: auditResult.category
    });
  } else if (auditResult.quality && !auditResult.quality.clear) {
    throw new AppError(
      400,
      'QUESTION_UNCLEAR',
      auditResult.quality.suggestion || '问题描述不够清晰，请补充更多细节',
      undefined,
      2002
    );
  } else {
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
      authorAvatar: author.avatar ?? null
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
    aiAudit: {
      safe: auditResult.safe,
      reason: auditResult.reason,
      qualitySuggestion: auditResult.quality?.suggestion
    }
  };
}

async function listQuestions(params: {
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
  const { page = 1, pageSize = 20, subject, status, isGoodQuestion, tags, authorId, search, userId } = params;

  const rawPage = Number(page || 1);
  const rawPageSize = Number(pageSize || 20);
  const safePage = (Number.isInteger(rawPage) && rawPage > 0) ? rawPage : 1;
  const safePageSize = (Number.isInteger(rawPageSize) && rawPageSize > 0) ? Math.min(rawPageSize, 100) : 20;

  if (search && typeof search === 'string') {
    const MAX_SEARCH_KEYWORD_LENGTH = 64;
    if (search.trim().length > MAX_SEARCH_KEYWORD_LENGTH) {
      throw new AppError(400, 'SEARCH_KEYWORD_TOO_LONG', `搜索关键词过长，请限制在 ${MAX_SEARCH_KEYWORD_LENGTH} 字符以内`);
    }
  }

  const where: any = {};

  const effectiveStatus = typeof status === 'string' ? status : authorId ? undefined : 'approved';
  if (effectiveStatus) {
    where.status = effectiveStatus;
  }

  if (subject) where.subject = subject;
  if (authorId) where.authorId = authorId;
  if (typeof isGoodQuestion === 'boolean') where.isGoodQuestion = isGoodQuestion;
  if (tags && tags.length > 0) where.tags = { hasSome: tags };

  if (typeof search === 'string' && search.trim().length > 0) {
    const keyword = search.trim();
    where.OR = [
      { title: { contains: keyword, mode: 'insensitive' } },
      { content: { contains: keyword, mode: 'insensitive' } }
    ];
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
  let likedSet = new Set<string>();
  let favoritedSet = new Set<string>();

  if (userId && list.length > 0) {
    const questionIds = list.map((q) => q.id);
    const [understandingList, likes, favorites] = await Promise.all([
      prisma.questionUnderstanding.findMany({
        where: { questionId: { in: questionIds }, userId }
      }),
      prisma.like.findMany({
        where: { userId, targetType: 'question', targetId: { in: questionIds } }
      }),
      prisma.favorite.findMany({
        where: { userId, questionId: { in: questionIds } }
      })
    ]);
    understandingMap = new Map(understandingList.map((u) => [u.questionId, u.status]));
    likedSet = new Set(likes.map((l) => l.targetId));
    favoritedSet = new Set(favorites.map((f) => f.questionId));
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
      understandingStatus: understandingMap.get(q.id) ?? null,
      isLiked: likedSet.has(q.id),
      isFavorited: favoritedSet.has(q.id)
    })),
    pagination: {
      page: rawPage,
      pageSize: safePageSize,
      total,
      totalPages: Math.ceil(total / safePageSize)
    }
  };
}

async function getQuestionById(id: string, userContext?: { userId: string; role: string }) {
  const q = await prisma.question.findUnique({ where: { id } });

  if (!q) {
    throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
  }

  if (q.status !== 'approved') {
    const isAuthor = userContext?.userId === q.authorId;
    const isTeacher = userContext?.role === 'teacher';
    const isAdmin = userContext?.role === 'admin';

    if (!isAuthor && !isTeacher && !isAdmin) {
      throw new AppError(403, 'PERMISSION_DENIED', '该问题正在审核中或未通过审核，暂不可见', undefined, 3004);
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

async function updateQuestion(params: {
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

  let aiResultText = question.aiResult ?? '无违规';
  const effectiveTitle = title ?? question.title;
  const effectiveContent = content ?? question.content ?? '';
  const effectiveImages = images ?? question.images ?? [];

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

async function deleteQuestion(params: { id: string; userId: string; role: string }) {
  const { id, userId, role } = params;

  const question = await prisma.question.findUnique({ where: { id } });

  if (!question) {
    throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
  }

  if (role !== 'teacher' && role !== 'admin' && question.authorId !== userId) {
    throw new AppError(403, 'PERMISSION_DENIED', '无权删除该问题', undefined, 3003);
  }

  if (role !== 'teacher' && role !== 'admin' && question.answers > 0) {
    throw new AppError(403, 'PERMISSION_DENIED', '已有回答的问题不能删除', undefined, 3003);
  }

  await prisma.question.delete({ where: { id } });
}

async function setUnderstanding(params: { questionId: string; userId: string; status: string }) {
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


// ============ ANSWERS ============

async function createAnswer(params: {
  questionId: string;
  authorId: string;
  authorRole: string;
  content?: string;
  images?: string[];
  audioUrl?: string;
  audioUrls?: string[];
}) {
  const { questionId, authorId, authorRole, content, images, audioUrl, audioUrls } = params;

  const question = await prisma.question.findUnique({ where: { id: questionId } });

  if (!question) {
    throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
  }

  if (question.status !== 'approved') {
    throw new AppError(403, 'ANSWER_DENIED', '无法在未审核通过的问题下发表回答');
  }

  if (authorRole !== 'teacher' && authorRole !== 'admin') {
    const questionAuthor = await prisma.user.findUnique({ where: { id: question.authorId } });
    if (questionAuthor?.role !== 'teacher' && questionAuthor?.role !== 'admin') {
      throw new AppError(403, 'PERMISSION_DENIED', '学生只能回答教师提出的问题', undefined, 3002);
    }
  }

  const hasText = !!content && content.trim().length > 0;
  const hasImages = !!images && images.length > 0;

  let normalizedAudioUrl: string | null = null;
  if (audioUrls && audioUrls.length > 0) {
    normalizedAudioUrl = JSON.stringify(audioUrls);
  } else if (audioUrl && audioUrl.trim().length > 0) {
    normalizedAudioUrl = audioUrl.trim();
  }

  const hasAudio = !!normalizedAudioUrl;

  if (!hasText && !hasImages && !hasAudio) {
    throw new AppError(400, 'EMPTY_CONTENT', '回答内容不能为空');
  }

  const author = await prisma.user.findUnique({ where: { id: authorId } });

  if (!author) {
    throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
  }

  let auditResult: { safe: boolean; reason?: string; category?: string; quality?: { clear: boolean; suggestion?: string } } = {
    safe: true,
    quality: { clear: true }
  };
  let initialStatus = (author.role === 'teacher' || author.role === 'admin') ? 'approved' : 'pending';
  let aiResultText = '无违规';

  if (hasText) {
    const result = await aiAuditService.auditContent(content!, 'answer');
    auditResult = {
      safe: result.safe,
      reason: result.reason,
      category: result.category,
      quality: result.quality
    };

    if (!result.safe) {
      initialStatus = 'rejected';
      aiResultText = JSON.stringify({
        safe: false,
        reason: result.reason,
        category: result.category
      });
    } else {
      if (author.role === 'teacher' || author.role === 'admin') {
        initialStatus = 'approved';
      }
      aiResultText = JSON.stringify({ safe: true });
    }
  }

  if (auditResult.safe && hasImages) {
    const imageResults = await aiAuditService.auditImages(images!);
    const unsafeImage = imageResults.find(r => !r.safe);
    if (unsafeImage) {
      auditResult.safe = false;
      auditResult.reason = `图片违规：${unsafeImage.reason || '包含不适合未成年人的内容'}`;
      auditResult.category = unsafeImage.category || 'image_violation';
      initialStatus = 'rejected';
      aiResultText = JSON.stringify({
        safe: false,
        reason: auditResult.reason,
        category: auditResult.category
      });
    }
  }

  const [created] = await prisma.$transaction([
    prisma.answer.create({
      data: {
        questionId,
        content: content ?? '',
        images: images ?? [],
        audioUrl: normalizedAudioUrl,
        authorId,
        authorName: author.name || author.nickname,
        authorAvatar: author.avatar ?? null,
        likes: 0,
        status: initialStatus,
        aiResult: aiResultText
      }
    }),
    prisma.question.update({
      where: { id: questionId },
      data: { answers: { increment: 1 } }
    })
  ]);

  if (initialStatus === 'approved') {
    try {
      const notificationContent = JSON.stringify({
        answerId: created.id,
        questionTitle: question.title
      });

      await prisma.notification.create({
        data: {
          userId: question.authorId,
          type: 'new_answer',
          title: '你的问题有新的回答',
          content: notificationContent,
          targetType: 'question',
          targetId: question.id
        }
      });
    } catch {
      // Silent fail
    }
  }

  let audioUrlsArr: string[] = [];
  if (created.audioUrl) {
    const trimmed = created.audioUrl.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          audioUrlsArr = parsed.filter((url: unknown) => typeof url === 'string');
        }
      } catch {
        audioUrlsArr = [created.audioUrl];
      }
    } else {
      audioUrlsArr = [created.audioUrl];
    }
  }

  return {
    id: created.id,
    questionId: created.questionId,
    content: created.content,
    images: created.images,
    audioUrl: created.audioUrl,
    audioUrls: audioUrlsArr,
    authorId: created.authorId,
    authorName: created.authorName,
    authorAvatar: created.authorAvatar ?? undefined,
    likes: created.likes,
    status: created.status,
    createdAt: created.createdAt,
    aiAudit: {
      safe: auditResult.safe,
      reason: auditResult.reason
    }
  };
}

async function listAnswers(params: { questionId: string; userId?: string }) {
  const { questionId, userId } = params;

  const answers = await prisma.answer.findMany({
    where: {
      questionId,
      status: 'approved',
      deletedAt: null
    },
    orderBy: { createdAt: 'desc' }
  });

  let likedIds = new Set<string>();

  if (userId && answers.length > 0) {
    const likes = await prisma.like.findMany({
      where: {
        userId,
        targetType: 'answer',
        targetId: { in: answers.map((a) => a.id) }
      }
    });
    likedIds = new Set(likes.map((l) => l.targetId));
  }

  return {
    list: answers.map((a) => {
      let audioUrlsArr: string[] = [];
      if (a.audioUrl) {
        const trimmed = a.audioUrl.trim();
        if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              audioUrlsArr = parsed.filter((url: unknown) => typeof url === 'string');
            }
          } catch {
            audioUrlsArr = [a.audioUrl];
          }
        } else {
          audioUrlsArr = [a.audioUrl];
        }
      }

      return {
        id: a.id,
        questionId: a.questionId,
        content: a.content,
        images: a.images,
        audioUrl: a.audioUrl,
        audioUrls: audioUrlsArr,
        authorId: a.authorId,
        authorName: a.authorName,
        authorAvatar: a.authorAvatar ?? undefined,
        likes: a.likes,
        isLiked: likedIds.has(a.id),
        status: a.status,
        createdAt: a.createdAt
      };
    }),
    total: answers.length
  };
}

async function deleteAnswer(params: { answerId: string; userId: string; role: string }) {
  const { answerId, userId, role } = params;

  const answer = await prisma.answer.findUnique({ where: { id: answerId } });

  if (!answer || answer.deletedAt) {
    throw new AppError(404, 'ANSWER_NOT_FOUND', '回答不存在');
  }

  if (role !== 'teacher' && role !== 'admin' && answer.authorId !== userId) {
    throw new AppError(403, 'PERMISSION_DENIED', '只有作者或教师可以删除回答', undefined, 3002);
  }

  await prisma.$transaction([
    prisma.answer.update({
      where: { id: answerId },
      data: {
        deletedAt: new Date(),
        status: 'banned'
      }
    }),
    prisma.question.update({
      where: { id: answer.questionId },
      data: { answers: { decrement: 1 } }
    })
  ]);
}

// ============ COMMENTS ============

async function createComment(params: {
  questionId: string;
  authorId: string;
  authorRole: string;
  content?: string;
  image?: string;
}) {
  const { questionId, authorId, authorRole, content, image } = params;

  const hasText = !!content && content.trim().length > 0;
  const hasImage = !!image;

  if (!hasText && !hasImage) {
    throw new AppError(400, 'EMPTY_CONTENT', '评论内容不能为空');
  }

  if (authorRole === 'parent') {
    throw new AppError(403, 'PERMISSION_DENIED', '家长账号无评论权限', undefined, 3003);
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });

  if (!question) {
    throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
  }

  if (question.status !== 'approved') {
    throw new AppError(403, 'COMMENT_DENIED', '无法在未审核通过的问题下发表评论');
  }

  if (authorRole === 'student' && question.authorId !== authorId) {
    throw new AppError(403, 'PERMISSION_DENIED', '学生只能评论自己的问题', undefined, 3003);
  }

  const author = await prisma.user.findUnique({ where: { id: authorId } });

  if (!author) {
    throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
  }

  let initialStatus = 'pending';
  let aiResultText = '无违规';

  if (hasText) {
    const result = await aiAuditService.auditContent(content!, 'comment');

    if (!result.safe) {
      initialStatus = 'rejected';
      aiResultText = JSON.stringify({
        safe: false,
        reason: result.reason,
        category: result.category
      });
    } else {
      if (hasImage) {
        const imgResult = await aiAuditService.auditImages([image!]);
        const unsafeImage = imgResult.find(r => !r.safe);
        if (unsafeImage) {
          initialStatus = 'rejected';
          aiResultText = JSON.stringify({
            safe: false,
            reason: unsafeImage.reason,
            category: 'image_violation'
          });
        } else {
          initialStatus = 'pending';
          aiResultText = JSON.stringify({ safe: true });
        }
      } else {
        initialStatus = 'pending';
        aiResultText = JSON.stringify({ safe: true });
      }
    }
  } else if (hasImage) {
    const imgResult = await aiAuditService.auditImages([image!]);
    const unsafeImage = imgResult.find(r => !r.safe);
    if (unsafeImage) {
      initialStatus = 'rejected';
      aiResultText = JSON.stringify({
        safe: false,
        reason: unsafeImage.reason,
        category: 'image_violation'
      });
    } else {
      initialStatus = 'pending';
      aiResultText = JSON.stringify({ safe: true });
    }
  }

  const [created] = await prisma.$transaction([
    prisma.comment.create({
      data: {
        questionId,
        content: content ?? '',
        image: image ?? null,
        authorId,
        authorName: author.name || author.nickname,
        authorAvatar: author.avatar ?? null,
        status: initialStatus,
        aiResult: aiResultText
      }
    }),
    prisma.question.update({
      where: { id: questionId },
      data: { comments: { increment: 1 } }
    })
  ]);

  return {
    id: created.id,
    questionId: created.questionId,
    content: created.content,
    image: created.image ?? undefined,
    authorId: created.authorId,
    authorName: created.authorName,
    authorAvatar: created.authorAvatar ?? undefined,
    status: created.status,
    aiResult: created.aiResult ?? undefined,
    createdAt: created.createdAt
  };
}

async function listComments(params: { questionId: string }) {
  const { questionId } = params;

  const comments = await prisma.comment.findMany({
    where: {
      questionId,
      status: 'approved',
      deletedAt: null
    },
    orderBy: { createdAt: 'desc' }
  });

  return {
    list: comments.map((c) => ({
      id: c.id,
      questionId: c.questionId,
      content: c.content,
      image: c.image ?? undefined,
      authorId: c.authorId,
      authorName: c.authorName,
      authorAvatar: c.authorAvatar ?? undefined,
      status: c.status,
      aiResult: c.aiResult ?? undefined,
      createdAt: c.createdAt
    })),
    total: comments.length
  };
}

async function deleteComment(params: { commentId: string; userId: string; role: string }) {
  const { commentId, userId, role } = params;

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });

  if (!comment || comment.deletedAt) {
    throw new AppError(404, 'COMMENT_NOT_FOUND', '评论不存在');
  }

  if (role !== 'teacher' && role !== 'admin' && comment.authorId !== userId) {
    throw new AppError(403, 'PERMISSION_DENIED', '只有作者或教师可以删除评论', undefined, 3003);
  }

  await prisma.$transaction([
    prisma.comment.update({
      where: { id: commentId },
      data: {
        deletedAt: new Date(),
        status: 'banned'
      }
    }),
    prisma.question.update({
      where: { id: comment.questionId },
      data: { comments: { decrement: 1 } }
    })
  ]);
}
