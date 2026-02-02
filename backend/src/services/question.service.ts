import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

export class QuestionService {
  async create(params: {
    title: string;
    content?: string;
    images?: string[];
    tags?: string[];
    difficulty?: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
  }) {
    const { title, content, images, tags, difficulty, authorId, authorName, authorAvatar } =
      params;

    if (!title || title.length > 100) {
      throw new AppError(
        400,
        'TITLE_TOO_LONG',
        '标题长度不能超过100字符'
      );
    }

    // 查询作者信息，用于确定角色和展示名称
    const author = await prisma.user.findUnique({
      where: { id: authorId }
    });

    if (!author) {
      throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
    }

    // 老师发布的问题无需审核，学生 / 其他角色仍走审核流程。
    const initialStatus = author.role === 'teacher' ? 'approved' : 'pending';

    const created = await prisma.question.create({
      data: {
        title,
        content: content ?? '',
        subject: null,
        tags: tags ?? [],
        difficulty: difficulty ?? null,
        status: initialStatus,
        isGoodQuestion: false,
        isPinned: false,
        score: null,
        aiResult: '无违规',
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 0,
        authorId,
        authorName: author.nickname || authorName,
        authorAvatar: authorAvatar ?? author.avatar ?? null
      }
    });

    return {
      id: created.id,
      title: created.title,
      content: created.content,
      images: (images ?? []).slice(0, 1),
      tags: created.tags,
      difficulty: created.difficulty,
      authorId: created.authorId,
      authorName: created.authorName,
      status: created.status,
      aiResult: created.aiResult,
      createdAt: created.createdAt
    };
  }

  async list(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    isGoodQuestion?: boolean;
    tags?: string[];
    authorId?: string;
  }) {
    const {
      page = 1,
      pageSize = 20,
      status,
      isGoodQuestion,
      tags,
      authorId
    } = params;

    const where: any = {};

    // 默认仅首页等公共列表展示已通过的问题；
    // 若明确指定 authorId（例如“我的提问”），则不过滤状态，由调用方自行按 status 分组。
    const effectiveStatus =
      typeof status === 'string'
        ? status
        : authorId
        ? undefined
        : 'approved';

    if (effectiveStatus) {
      where.status = effectiveStatus;
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

    const [list, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.question.count({ where })
    ]);

    return {
      list: list.map((q) => ({
        id: q.id,
        title: q.title,
        content: q.content,
        images: [],
        tags: q.tags,
        difficulty: q.difficulty,
        authorId: q.authorId,
        authorName: q.authorName,
        isGoodQuestion: q.isGoodQuestion,
        isPinned: q.isPinned,
        likes: q.likes,
        favorites: q.favorites,
        comments: q.comments,
        answers: q.answers,
        status: q.status,
        createdAt: q.createdAt
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  async getById(id: string) {
    const q = await prisma.question.findUnique({
      where: { id }
    });

    if (!q) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }

    return {
      id: q.id,
      title: q.title,
      content: q.content,
      images: [],
      audioUrl: null,
      tags: q.tags,
      difficulty: q.difficulty,
      authorId: q.authorId,
      authorName: q.authorName,
      authorAvatar: q.authorAvatar ?? undefined,
      isGoodQuestion: q.isGoodQuestion,
      isPinned: q.isPinned,
      score: q.score ?? undefined,
      likes: q.likes,
      favorites: q.favorites,
      comments: q.comments,
      answers: q.answers,
      status: q.status,
      createdAt: q.createdAt,
      isLiked: false,
      isFavorited: false
    };
  }
}

export const questionService = new QuestionService();
