import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

export class AnswerService {
  async create(params: {
    questionId: string;
    authorId: string;
    content?: string;
    images?: string[];
    audioUrl?: string;
  }) {
    const { questionId, authorId, content, images, audioUrl } = params;

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }

    const hasText = !!content && content.trim().length > 0;
    const hasImages = !!images && images.length > 0;
    const hasAudio = !!audioUrl;

    if (!hasText && !hasImages && !hasAudio) {
      throw new AppError(
        400,
        'EMPTY_CONTENT',
        '回答内容不能为空'
      );
    }

    const author = await prisma.user.findUnique({
      where: { id: authorId }
    });

    if (!author) {
      throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
    }

    const [created] = await prisma.$transaction([
      prisma.answer.create({
        data: {
          questionId,
          content: content ?? '',
          images: images ?? [],
          audioUrl: audioUrl ?? null,
          authorId,
          authorName: author.nickname,
          authorAvatar: author.avatar ?? null,
          likes: 0,
          status: 'pending',
          aiResult: '无违规'
        }
      }),
      prisma.question.update({
        where: { id: questionId },
        data: {
          answers: {
            increment: 1
          }
        }
      })
    ]);

    return {
      id: created.id,
      questionId: created.questionId,
      content: created.content,
      images: created.images,
      audioUrl: created.audioUrl,
      authorId: created.authorId,
      authorName: created.authorName,
      authorAvatar: created.authorAvatar ?? undefined,
      likes: created.likes,
      status: created.status,
      createdAt: created.createdAt
    };
  }

  async list(params: { questionId: string; userId?: string }) {
    const { questionId, userId } = params;

    const answers = await prisma.answer.findMany({
      where: {
        questionId,
        status: 'approved',
        deletedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    let likedIds = new Set<string>();

    if (userId && answers.length > 0) {
      const likes = await prisma.like.findMany({
        where: {
          userId,
          targetType: 'answer',
          targetId: {
            in: answers.map((a) => a.id)
          }
        }
      });
      likedIds = new Set(likes.map((l) => l.targetId));
    }

    return {
      list: answers.map((a) => ({
        id: a.id,
        questionId: a.questionId,
        content: a.content,
        images: a.images,
        audioUrl: a.audioUrl,
        authorId: a.authorId,
        authorName: a.authorName,
        authorAvatar: a.authorAvatar ?? undefined,
        likes: a.likes,
        isLiked: likedIds.has(a.id),
        status: a.status,
        createdAt: a.createdAt
      })),
      total: answers.length
    };
  }

  async remove(params: { answerId: string; userId: string; role: string }) {
    const { answerId, userId, role } = params;

    const answer = await prisma.answer.findUnique({
      where: { id: answerId }
    });

    if (!answer || answer.deletedAt) {
      throw new AppError(404, 'ANSWER_NOT_FOUND', '回答不存在');
    }

    if (role !== 'teacher' && answer.authorId !== userId) {
      throw new AppError(
        403,
        'PERMISSION_DENIED',
        '只有作者或教师可以删除回答'
      );
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
        data: {
          answers: {
            decrement: 1
          }
        }
      })
    ]);
  }
}

export const answerService = new AnswerService();

