/**
 * [POS] api/profile.ts
 *   所属：API 路由层 | 角色：用户个人资料（我的点赞、收藏、回答）
 *   兄弟：core.ts / auth.ts / content.ts / social.ts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma, getUserFromToken, AppError } from './_helpers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = getUserFromToken(req);
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', '未登录', undefined, 1001);
    }

    const { action } = req.query;

    // GET /api/profile?action=my-likes
    if (action === 'my-likes' && req.method === 'GET') {
      const { page = '1', pageSize = '50' } = req.query;
      const pageNum = parseInt(page as string);
      const pageSizeNum = parseInt(pageSize as string);
      const skip = (pageNum - 1) * pageSizeNum;

      const [likes, total] = await Promise.all([
        prisma.like.findMany({
          where: {
            userId: user.id,
            targetType: 'question'
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSizeNum
        }),
        prisma.like.count({
          where: {
            userId: user.id,
            targetType: 'question'
          }
        })
      ]);

      // Manually fetch questions
      const questionIds = likes.map(like => like.targetId);
      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } }
      });

      const questionMap = new Map(questions.map(q => [q.id, q]));

      const list = likes.map(like => {
        const question = questionMap.get(like.targetId);
        if (!question) return null;
        return {
          id: question.id,
          content: question.content,
          images: question.images,
          subject: question.subject,
          likes: question.likes,
          favorites: question.favorites,
          answers: question.answers,
          comments: question.comments,
          likedAt: like.createdAt,
          author: {
            id: question.authorId,
            nickname: question.authorName,
            avatar: question.authorAvatar
          }
        };
      }).filter(Boolean);

      return res.json({
        code: 200,
        data: {
          list,
          pagination: {
            page: pageNum,
            limit: pageSizeNum,
            total,
            totalPages: Math.ceil(total / pageSizeNum)
          }
        }
      });
    }

    // GET /api/profile?action=my-favorites
    if (action === 'my-favorites' && req.method === 'GET') {
      const { page = '1', pageSize = '50' } = req.query;
      const pageNum = parseInt(page as string);
      const pageSizeNum = parseInt(pageSize as string);
      const skip = (pageNum - 1) * pageSizeNum;

      const [favorites, total] = await Promise.all([
        prisma.favorite.findMany({
          where: {
            userId: user.id
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSizeNum
        }),
        prisma.favorite.count({
          where: {
            userId: user.id
          }
        })
      ]);

      // Manually fetch questions
      const questionIds = favorites.map(fav => fav.questionId);
      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } }
      });

      const questionMap = new Map(questions.map(q => [q.id, q]));

      const list = favorites.map(fav => {
        const question = questionMap.get(fav.questionId);
        if (!question) return null;
        return {
          id: question.id,
          content: question.content,
          images: question.images,
          subject: question.subject,
          likes: question.likes,
          favorites: question.favorites,
          answers: question.answers,
          comments: question.comments,
          favoritedAt: fav.createdAt,
          author: {
            id: question.authorId,
            nickname: question.authorName,
            avatar: question.authorAvatar
          }
        };
      }).filter(Boolean);

      return res.json({
        code: 200,
        data: {
          list,
          pagination: {
            page: pageNum,
            limit: pageSizeNum,
            total,
            totalPages: Math.ceil(total / pageSizeNum)
          }
        }
      });
    }

    return res.status(404).json({ code: 404, message: 'Action not found' });

  } catch (error) {
    console.error('[Profile API Error]', error);
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
