import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { answerService } from '../services/answer.service';

export const answerRouter = Router();

// 删除回答：作者或教师
answerRouter.delete(
  '/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await answerService.remove({
        answerId: req.params.id,
        userId: req.user!.id,
        role: req.user!.role
      });

      return res.json({
        code: 200,
        message: '删除成功',
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

