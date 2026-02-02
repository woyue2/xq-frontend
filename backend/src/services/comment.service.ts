import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

export class CommentService {
  async create(params: {
    questionId: string;
    authorId: string;
    content?: string;
    image?: string;
  }) {
    const { questionId, authorId, content, image } = params;

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }

    const hasText = !!content && content.trim().length > 0;
    const hasImage = !!image;

    if (!hasText && !hasImage) {
      throw new AppError(
        400,
        'EMPTY_CONTENT',
        '评论内容不能为空'
      );
    }

    const author = await prisma.user.findUnique({
      where: { id: authorId }
    });

    if (!author) {
      throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
    }

    const [created] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          questionId,
          content: content ?? '',
          image: image ?? null,
          authorId,
          authorName: author.nickname,
          authorAvatar: author.avatar ?? null,
          status: 'pending',
          aiResult: '无违规'
        }
      }),
      prisma.question.update({
        where: { id: questionId },
        data: {
          comments: {
            increment: 1
          }
        }
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

  async list(params: { questionId: string }) {
    const { questionId } = params;

    const comments = await prisma.comment.findMany({
      where: {
        questionId,
        status: 'approved',
        deletedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
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
        createdAt: c.createdAt
      })),
      total: comments.length
    };
  }

  async remove(params: { commentId: string; userId: string; role: string }) {
    const { commentId, userId, role } = params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment || comment.deletedAt) {
      throw new AppError(404, 'COMMENT_NOT_FOUND', '评论不存在');
    }

    if (role !== 'teacher' && comment.authorId !== userId) {
      throw new AppError(
        403,
        'PERMISSION_DENIED',
        '只有作者或教师可以删除评论'
      );
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
        data: {
          comments: {
            decrement: 1
          }
        }
      })
    ]);
  }
}

export const commentService = new CommentService();

