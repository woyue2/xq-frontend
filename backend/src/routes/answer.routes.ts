/**
 * [POS] backend/src/routes/answer.routes.ts
 *   所属：路由层 | 角色：答案路由（提交答案、查看答案列表）
 *
 * [INPUT]
 *   - express                        → Router / Response / NextFunction
 *   - ../middlewares/auth.middleware  → authMiddleware / AuthenticatedRequest
 *   - ../services/answer.service     → answerService
 *
 * [OUTPUT]
 *   - answerRouter（Express Router）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/routes/CLAUDE.md 的文件清单
 */
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

