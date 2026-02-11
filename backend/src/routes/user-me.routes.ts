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
import { userService } from '../services/user.service';

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
           name: user.name ?? undefined,
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

// 更新当前用户信息
userMeRouter.patch(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const allowedFields = ['name', 'nickname', 'avatar', 'grade', 'age', 'school'];
      const raw = req.body as Record<string, unknown>;
      const data = Object.keys(raw).reduce((acc, key) => {
        if (!allowedFields.includes(key)) {
          return acc;
        }

        const value = raw[key];

        if (key === 'age') {
          if (value === null || value === undefined || value === '') {
            return acc;
          }
          const num = typeof value === 'number' ? value : Number(value);
          if (!Number.isInteger(num) || num < 0 || num > 120) {
            throw new AppError(
              400,
              'INVALID_PARAMS',
              '年龄格式不正确',
              {
                errors: [
                  { field: 'age', message: 'age 必须为 0~120 的整数' }
                ]
              }
            );
          }
          acc.age = num;
          return acc;
        }

        if (
          (key === 'name' ||
            key === 'nickname' ||
            key === 'avatar' ||
            key === 'grade' ||
            key === 'school') &&
          value !== null &&
          value !== undefined
        ) {
          if (typeof value !== 'string') {
            throw new AppError(
              400,
              'INVALID_PARAMS',
              '参数类型错误',
              {
                errors: [
                  { field: key, message: `${key} 必须为字符串` }
                ]
              }
            );
          }
          acc[key] = value;
        }

        return acc;
      }, {} as any);

      if (Object.keys(data).length === 0) {
        throw new AppError(400, 'INVALID_PARAMS', '没有可更新的字段');
      }

      const updatedUser = await userService.updateProfile(req.user.id, data);

      return res.json({
        code: 200,
        message: 'success',
        data: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          name: updatedUser.name ?? undefined,
          nickname: updatedUser.nickname,
          avatar: updatedUser.avatar,
          role: updatedUser.role,
          grade: updatedUser.grade,
          age: updatedUser.age,
          school: updatedUser.school
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
