import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

export class InteractionService {
  async toggleQuestionLike(params: { questionId: string; userId: string }) {
    const { questionId, userId } = params;

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.like.findUnique({
        where: {
          userId_targetType_targetId: {
            userId,
            targetType: 'question',
            targetId: questionId
          }
        }
      });

      if (!existing) {
        await tx.like.create({
          data: {
            userId,
            targetType: 'question',
            targetId: questionId
          }
        });

        const updated = await tx.question.update({
          where: { id: questionId },
          data: {
            likes: {
              increment: 1
            }
          }
        });

        return {
          questionId,
          isLiked: true,
          likes: updated.likes
        };
      }

      await tx.like.delete({
        where: { id: existing.id }
      });

      const updated = await tx.question.update({
        where: { id: questionId },
        data: {
          likes: {
            decrement: 1
          }
        }
      });

      return {
        questionId,
        isLiked: false,
        likes: updated.likes
      };
    });

    return result;
  }

  async toggleQuestionFavorite(params: { questionId: string; userId: string }) {
    const { questionId, userId } = params;

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.favorite.findUnique({
        where: {
          userId_questionId: {
            userId,
            questionId
          }
        }
      });

      if (!existing) {
        await tx.favorite.create({
          data: { userId, questionId }
        });

        const updated = await tx.question.update({
          where: { id: questionId },
          data: {
            favorites: {
              increment: 1
            }
          }
        });

        return {
          questionId,
          isFavorited: true,
          favorites: updated.favorites
        };
      }

      await tx.favorite.delete({
        where: { id: existing.id }
      });

      const updated = await tx.question.update({
        where: { id: questionId },
        data: {
          favorites: {
            decrement: 1
          }
        }
      });

      return {
        questionId,
        isFavorited: false,
        favorites: updated.favorites
      };
    });

    return result;
  }

  async listUserLikes(params: {
    userId: string;
    page?: number;
    pageSize?: number;
  }) {
    const { userId, page = 1, pageSize = 20 } = params;

    const [likes, total] = await Promise.all([
      prisma.like.findMany({
        where: {
          userId,
          targetType: 'question'
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.like.count({
        where: {
          userId,
          targetType: 'question'
        }
      })
    ]);

    const questionIds = likes.map((l) => l.targetId);
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } }
    });
    const map = new Map(questions.map((q) => [q.id, q]));

    return {
      list: likes
        .map((l) => {
          const q = map.get(l.targetId);
          if (!q) return null;
          return {
            id: q.id,
            title: q.title,
            content: q.content,
            authorName: q.authorName,
            likes: q.likes,
            favorites: q.favorites,
            answers: q.answers,
            createdAt: q.createdAt,
            likedAt: l.createdAt
          };
        })
        .filter(Boolean),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  async listUserFavorites(params: {
    userId: string;
    page?: number;
    pageSize?: number;
  }) {
    const { userId, page = 1, pageSize = 20 } = params;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.favorite.count({ where: { userId } })
    ]);

    const questionIds = favorites.map((f) => f.questionId);
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } }
    });
    const map = new Map(questions.map((q) => [q.id, q]));

    return {
      list: favorites
        .map((f) => {
          const q = map.get(f.questionId);
          if (!q) return null;
          return {
            id: q.id,
            title: q.title,
            content: q.content,
            authorName: q.authorName,
            likes: q.likes,
            favorites: q.favorites,
            answers: q.answers,
            createdAt: q.createdAt,
            favoritedAt: f.createdAt
          };
        })
        .filter(Boolean),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }
}

export const interactionService = new InteractionService();
