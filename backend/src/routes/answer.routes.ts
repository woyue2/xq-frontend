import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { answerService } from '../services/answer.service';

export const answerRouter = Router();

/**
 * @swagger
 * /answers/{id}:
 *   delete:
 *     summary: 删除回答
 *     description: 删除指定的回答，仅限回答作者本人或教师
 *     tags:
 *       - Answer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 回答ID
 *     responses:
 *       200:
 *         description: 删除成功
 */
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

