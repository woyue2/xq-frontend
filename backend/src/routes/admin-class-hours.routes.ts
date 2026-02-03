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
