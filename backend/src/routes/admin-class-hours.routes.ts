import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  requireTeacher,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { classHoursService } from '../services/class-hours.service';

export const adminClassHoursRouter = Router();

adminClassHoursRouter.use(authMiddleware, requireTeacher);

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
        userIds: string[];
        action: 'extend' | 'reduce';
        months: number;
      };

      const data = await classHoursService.batchUpdate({
        userIds,
        action,
        months
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

