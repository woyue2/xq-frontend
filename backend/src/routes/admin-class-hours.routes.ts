import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  requireTeacher,
  type AuthenticatedRequest,
  createRequireTeacher
} from '../middlewares/auth.middleware';
import { classHoursService } from '../services/class-hours.service';
import { AppError } from '../errors/AppError';

export const adminClassHoursRouter = Router();

adminClassHoursRouter.use(
  authMiddleware,
  createRequireTeacher({
    bizCode: 3005,
    message: '无白名单管理权限'
  })
);

/**
 * @swagger
 * /admin/class-hours/{userId}:
 *   get:
 *     summary: 获取用户课时信息
 *     description: 获取指定用户的课时使用情况
 *     tags:
 *       - Admin - ClassHours
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 获取成功
 */

adminClassHoursRouter.get(
  '/:userId',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const data = await classHoursService.getUserClassHours(userId);
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
 * /admin/class-hours/batch-update:
 *   patch:
 *     summary: 批量更新用户课时
 *     description: 为多个用户批量增加或减少课时
 *     tags:
 *       - Admin - ClassHours
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userIds, action, months]
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 用户ID列表
 *               action:
 *                 type: string
 *                 enum: [extend, reduce]
 *                 description: 操作类型（增加/减少）
 *               months:
 *                 type: integer
 *                 description: 月数
 *     responses:
 *       200:
 *         description: 批量更新成功
 */

adminClassHoursRouter.patch(
  '/batch-update',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userIds, action, months } = req.body as {
        userIds: unknown;
        action: 'extend' | 'reduce';
        months: unknown;
      };

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError(400, 'VALIDATION_ERROR', '参数验证失败', {
          errors: [
            { field: 'userIds', message: 'userIds 必须为非空字符串数组' }
          ]
        });
      }

      if (!['extend', 'reduce'].includes(action)) {
        throw new AppError(400, 'VALIDATION_ERROR', '参数验证失败', {
          errors: [{ field: 'action', message: 'action 必须为 extend 或 reduce' }]
        });
      }

      const monthsNum = typeof months === 'number' ? months : Number(months);
      if (!Number.isInteger(monthsNum) || monthsNum <= 0) {
        throw new AppError(400, 'VALIDATION_ERROR', '参数验证失败', {
          errors: [{ field: 'months', message: 'months 必须为大于 0 的整数' }]
        });
      }

      const data = await classHoursService.batchUpdate({
        userIds: userIds.map((id: unknown) => String(id)),
        action,
        months: monthsNum
      });

      return res.json({
        code: 200,
        message: '批量更新成功',
        data,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
