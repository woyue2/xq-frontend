import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { interactionService } from '../services/interaction.service';
import { prisma } from '../config/database';
import { classHoursService } from '../services/class-hours.service';
import { AppError } from '../errors/AppError';

export const userMeRouter = Router();

userMeRouter.use(authMiddleware);

// 获取当前用户基础信息（含课时状态）
userMeRouter.get(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
      }

      let classHours: Awaited<
        ReturnType<typeof classHoursService.getUserClassHours>
      > | null = null;

      try {
        classHours = await classHoursService.getUserClassHours(user.id);
      } catch {
        classHours = null;
      }

      return res.json({
        code: 200,
        message: 'success',
        data: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          avatar: user.avatar ?? undefined,
          role: user.role,
          grade: user.grade ?? undefined,
          age: user.age ?? undefined,
          school: user.school ?? undefined,
          expiresAt: user.expiresAt ?? undefined,
          classHours
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 查询我的点赞列表
userMeRouter.get(
  '/likes',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { page, pageSize } = req.query as any;
      const data = await interactionService.listUserLikes({
        userId: req.user!.id,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined
      });

      return res.json({
        code: 200,
        message: 'success',
        data,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 查询我的收藏列表
userMeRouter.get(
  '/favorites',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { page, pageSize } = req.query as any;
      const data = await interactionService.listUserFavorites({
        userId: req.user!.id,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined
      });

      return res.json({
        code: 200,
        message: 'success',
        data,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
