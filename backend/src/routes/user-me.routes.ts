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

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: 获取当前用户信息
 *     description: 获取当前登录用户的详细信息，包括课时状态
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                   id:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   name:
 *                     type: string
 *                   nickname:
 *                     type: string
 *                   avatar:
 *                     type: string
 *                   role:
 *                     type: string
 *                   grade:
 *                     type: string
 *                   age:
 *                     type: number
 *                   school:
 *                     type: string
 *                   classHours:
 *                     $ref: '#/components/schemas/ClassHours'
 */
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

/**
 * @swagger
 * /users/me:
 *   patch:
 *     summary: 更新当前用户信息
 *     description: 更新当前登录用户的个人信息
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 真实姓名
 *               nickname:
 *                 type: string
 *                 description: 昵称（2-20字符）
 *               avatar:
 *                 type: string
 *                 description: 头像URL
 *               grade:
 *                 type: string
 *                 description: 年级
 *               age:
 *                 type: number
 *                 description: 年龄（0-120）
 *               school:
 *                 type: string
 *                 description: 学校
 *     responses:
 *       200:
 *         description: 更新成功
 */
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
              'age 必须在 0~120 之间',
              {
                errors: [
                  { field: 'age', message: 'age 必须在 0~120 之间' }
                ]
              }
            );
          }
          acc.age = num;
          return acc;
        }

        if (key === 'nickname') {
          if (typeof value !== 'string') {
            throw new AppError(
              400,
              'INVALID_PARAMS',
              '参数类型错误',
              {
                errors: [
                  { field: 'nickname', message: 'nickname 必须为字符串' }
                ]
              }
            );
          }
          if (value.length < 2 || value.length > 20) {
            throw new AppError(
              400,
              'INVALID_PARAMS',
              '昵称长度必须在 2~20 个字符之间',
              {
                errors: [
                  { field: 'nickname', message: 'nickname 长度必须在 2~20 之间' }
                ]
              }
            );
          }
          acc.nickname = value;
          return acc;
        }

        if (
          (key === 'name' ||
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

      // 获取更新后的课时状态（与 GET /users/me 保持一致）
      let classHours: Awaited<ReturnType<typeof classHoursService.getUserClassHours>> | null = null;
      try {
        classHours = await classHoursService.getUserClassHours(updatedUser.id);
      } catch {
        classHours = null;
      }

      return res.json({
        code: 200,
        message: 'success',
        data: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          name: updatedUser.name ?? undefined,
          nickname: updatedUser.nickname,
          avatar: updatedUser.avatar ?? undefined,
          role: updatedUser.role,
          grade: updatedUser.grade ?? undefined,
          age: updatedUser.age ?? undefined,
          school: updatedUser.school ?? undefined,
          expiresAt: updatedUser.expiresAt ?? undefined,
          classHours
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /users/me/likes:
 *   get:
 *     summary: 获取我的点赞列表
 *     description: 获取当前用户点赞过的问题列表
 *     tags:
 *       - User
 *       - Interaction
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 获取成功
 */
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

/**
 * @swagger
 * /users/me/favorites:
 *   get:
 *     summary: 获取我的收藏列表
 *     description: 获取当前用户收藏过的问题列表
 *     tags:
 *       - User
 *       - Interaction
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 获取成功
 */
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
