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

    const created = await prisma.question.create({
      data: {
        title,
        content: content ?? '',
        subject: null,
        tags: tags ?? [],
        difficulty: difficulty ?? null,
        status: 'pending',
        isGoodQuestion: false,
        isPinned: false,
        score: null,
        aiResult: '无违规',
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 0,
        authorId,
        authorName,
        authorAvatar: authorAvatar ?? null
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
  }) {
    const {
      page = 1,
      pageSize = 20,
      status = 'approved',
      isGoodQuestion,
      tags
    } = params;

    const where: any = {};
    if (status) where.status = status;
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
