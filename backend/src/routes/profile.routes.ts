import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { AppError } from '../errors/AppError';
import { profileService } from '../services/profile.service';

export const profileRouter = Router();

profileRouter.use(authMiddleware);

/**
 * @swagger
 * /profile/my-answers:
 *   get:
 *     summary: 获取我的回答列表
 *     description: 获取当前用户回答列表（教师为主，其他角色返回自己的回答）
 *     tags:
 *       - Profile
 *       - Answer
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
profileRouter.get(
  '/my-answers',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const { page, pageSize } = req.query as any;
      // 修改原因：将“我的回答”查询与拼装下沉到 Service，避免 Route 直连数据访问（P0-3）。
      const result = await profileService.getMyAnswers({
        userId: req.user.id,
        page: Number(page ?? 1),
        pageSize: Number(pageSize ?? 20)
      });

      return res.json({
        code: 200,
        message: 'success',
        data: result,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
