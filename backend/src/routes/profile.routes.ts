import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

export const profileRouter = Router();

profileRouter.use(authMiddleware);

// 获取我的回答列表（教师为主，其他角色返回自己的回答）
profileRouter.get(
  '/my-answers',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const { page, pageSize } = req.query as any;
      const rawPage = Number(page ?? 1);
      const rawSize = Number(pageSize ?? 20);

      const currentPage =
        Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
      const size =
        Number.isFinite(rawSize) && rawSize > 0 && rawSize <= 100
          ? rawSize
          : 20;

      const [answers, total] = await Promise.all([
        prisma.answer.findMany({
          where: {
            authorId: req.user.id,
            deletedAt: null
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip: (currentPage - 1) * size,
          take: size
        }),
        prisma.answer.count({
          where: {
            authorId: req.user.id,
            deletedAt: null
          }
        })
      ]);

      // 手动查询问题标题，避免在缺少 Prisma 关系定义时直接使用 include 导致类型错误
      const questionIds = Array.from(
        new Set(answers.map((a) => a.questionId).filter(Boolean))
      ) as string[];

      const questions =
        questionIds.length > 0
          ? await prisma.question.findMany({
              where: {
                id: {
                  in: questionIds
                }
              },
              select: {
                id: true,
                title: true
              }
            })
          : [];

      const questionTitleMap = new Map(
        questions.map((q) => [q.id, q.title ?? ''])
      );

      return res.json({
        code: 200,
        message: 'success',
        data: {
          items: answers.map((a) => ({
            id: a.id,
            questionId: a.questionId,
            questionTitle: questionTitleMap.get(a.questionId) ?? '',
            content: a.content,
            likes: a.likes,
            status: a.status,
            createdAt: a.createdAt
          })),
          total,
          page: currentPage,
          totalPages: Math.ceil(total / size)
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
