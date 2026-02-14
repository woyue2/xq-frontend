import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

export class InteractionService {
  async toggleQuestionLike(params: {
    questionId: string;
    userId: string;
    action?: 'like' | 'unlike' | 'toggle';
  }) {
    const { questionId, userId, action = 'toggle' } = params;

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }

    if (question.status !== 'approved') {
      throw new AppError(403, 'INTERACTION_DENIED', '无法对未审核通过的问题进行操作');
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

      // 修改原因：/api/interactions/like 需要按 action 显式执行，避免重试/乱序时“toggle 反向翻转”。
      // ⚠️ 不确定因素：仍保留 action='toggle' 兼容老入口 /questions/:id/like，后续若统一单入口可删除该兼容分支。
      if (action === 'like') {
        if (existing) {
          return {
            questionId,
            isLiked: true,
            likes: question.likes
          };
        }

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

      if (action === 'unlike') {
        if (!existing) {
          return {
            questionId,
            isLiked: false,
            likes: question.likes
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
      }

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

  async toggleQuestionFavorite(params: {
    questionId: string;
    userId: string;
    action?: 'favorite' | 'unfavorite' | 'toggle';
  }) {
    const { questionId, userId, action = 'toggle' } = params;

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }

    if (question.status !== 'approved') {
      throw new AppError(403, 'INTERACTION_DENIED', '无法对未审核通过的问题进行操作');
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

      // 修改原因：/api/interactions/favorite 需要按 action 显式执行，避免重试/乱序时“toggle 反向翻转”。
      // ⚠️ 不确定因素：仍保留 action='toggle' 兼容老入口 /questions/:id/favorite，后续若统一单入口可删除该兼容分支。
      if (action === 'favorite') {
        if (existing) {
          return {
            questionId,
            isFavorited: true,
            favorites: question.favorites
          };
        }

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

      if (action === 'unfavorite') {
        if (!existing) {
          return {
            questionId,
            isFavorited: false,
            favorites: question.favorites
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
      }

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

    const isValidInteger = (value: number) =>
      Number.isFinite(value) && Number.isInteger(value) && value > 0;

    if (!isValidInteger(page) || !isValidInteger(pageSize)) {
      throw new AppError(
        400,
        'INVALID_PAGINATION',
        '分页参数不合法'
      );
    }

    const safePageSize = Math.min(pageSize, 100);

    const likes = await prisma.like.findMany({
      where: {
        userId,
        targetType: 'question'
      },
      orderBy: { createdAt: 'desc' },
      select: {
        targetId: true,
        createdAt: true
      }
    });

    const likedQuestionIds = Array.from(new Set(likes.map((item) => item.targetId)));
    if (likedQuestionIds.length === 0) {
      return {
        list: [],
        pagination: {
          page,
          pageSize: safePageSize,
          total: 0,
          totalPages: 0
        }
      };
    }

    const questions = await prisma.question.findMany({
      where: {
        id: { in: likedQuestionIds },
        status: 'approved'
      }
    });
    const map = new Map(questions.map((q) => [q.id, q]));

    // 修改原因：先按“问题可见口径（approved）”过滤，再分页，避免出现“总数正确但当前页空白”的体验问题。
    // ⚠️ 不确定因素：当前在服务层以内存切片分页，若用户点赞量极大，后续可能需要改为数据库侧分页。
    const visibleLikes = likes.filter((l) => map.has(l.targetId));
    const approvedTotal = visibleLikes.length;
    const pageStart = (page - 1) * safePageSize;
    const pageEnd = pageStart + safePageSize;
    const pagedLikes = visibleLikes.slice(pageStart, pageEnd);

    const filteredList = pagedLikes
      .map((l) => {
        const q = map.get(l.targetId);
        if (!q) return null;
        return {
          id: q.id,
          title: q.title,
          content: q.content,
          authorName: q.authorName,
          authorAvatar: q.authorAvatar ?? undefined,
          likes: q.likes,
          favorites: q.favorites,
          answers: q.answers,
          createdAt: q.createdAt,
          likedAt: l.createdAt
        };
      })
      .filter(Boolean);

    return {
      list: filteredList,
      pagination: {
        page,
        pageSize: safePageSize,
        // 修改原因：我的点赞列表总数应与“可见列表口径（仅 approved 问题）”一致，避免总数与可见条目语义冲突。
        // ⚠️ 不确定因素：当前按“本页点赞记录映射后去重”统计可见总数，若未来支持多态对象收藏需扩展计数逻辑。
        total: approvedTotal,
        totalPages: Math.ceil(approvedTotal / safePageSize)
      }
    };
  }

  async listUserFavorites(params: {
    userId: string;
    page?: number;
    pageSize?: number;
  }) {
    const { userId, page = 1, pageSize = 20 } = params;

    const isValidInteger = (value: number) =>
      Number.isFinite(value) && Number.isInteger(value) && value > 0;

    if (!isValidInteger(page) || !isValidInteger(pageSize)) {
      throw new AppError(
        400,
        'INVALID_PAGINATION',
        '分页参数不合法'
      );
    }

    const safePageSize = Math.min(pageSize, 100);

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        questionId: true,
        createdAt: true
      }
    });

    const favoritedQuestionIds = Array.from(new Set(favorites.map((item) => item.questionId)));
    if (favoritedQuestionIds.length === 0) {
      return {
        list: [],
        pagination: {
          page,
          pageSize: safePageSize,
          total: 0,
          totalPages: 0
        }
      };
    }

    const questions = await prisma.question.findMany({
      where: {
        id: { in: favoritedQuestionIds },
        status: 'approved'
      }
    });
    const map = new Map(questions.map((q) => [q.id, q]));

    // 修改原因：先按“问题可见口径（approved）”过滤，再分页，避免出现“总数正确但当前页空白”的体验问题。
    // ⚠️ 不确定因素：当前在服务层以内存切片分页，若用户收藏量极大，后续可能需要改为数据库侧分页。
    const visibleFavorites = favorites.filter((f) => map.has(f.questionId));
    const approvedTotal = visibleFavorites.length;
    const pageStart = (page - 1) * safePageSize;
    const pageEnd = pageStart + safePageSize;
    const pagedFavorites = visibleFavorites.slice(pageStart, pageEnd);

    const filteredList = pagedFavorites
      .map((f) => {
        const q = map.get(f.questionId);
        if (!q) return null;
        return {
          id: q.id,
          title: q.title,
          content: q.content,
          authorName: q.authorName,
          authorAvatar: q.authorAvatar ?? undefined,
          likes: q.likes,
          favorites: q.favorites,
          answers: q.answers,
          createdAt: q.createdAt,
          favoritedAt: f.createdAt
        };
      })
      .filter(Boolean);

    return {
      list: filteredList,
      pagination: {
        page,
        pageSize: safePageSize,
        // 修改原因：我的收藏列表总数应与“可见列表口径（仅 approved 问题）”一致，避免总数与可见条目语义冲突。
        // ⚠️ 不确定因素：当前按“本页收藏记录映射后去重”统计可见总数，若后续引入跨实体收藏需扩展口径定义。
        total: approvedTotal,
        totalPages: Math.ceil(approvedTotal / safePageSize)
      }
    };
  }
}

export const interactionService = new InteractionService();
