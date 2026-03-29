/**
 * [POS] backend/src/routes/profile.routes.ts
 *   所属：路由层 | 角色：用户主页信息路由（我的回答列表）
 *   兄弟：user-me.routes.ts
 *
 * [INPUT]
 *   - express                          → Router / Response / NextFunction
 *   - ../middlewares/auth.middleware    → authMiddleware / AuthenticatedRequest
 *   - ../services/answer.service       → answerService
 *   - ../errors/AppError               → AppError
 *
 * [OUTPUT]
 *   - profileRouter（Express Router）
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
import { AppError } from '../errors/AppError';

export const profileRouter = Router();

profileRouter.use(authMiddleware);

// 获取我的回答列表（教师为主，其他角色返回自己的回答）
profileRouter.get(
  '/my-answers',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const { page, pageSize } = req.query as any;
      const rawPage = Number(page ?? 1);
      const rawSize = Number(pageSize ?? 20);
      const currentPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
      const size = Number.isFinite(rawSize) && rawSize > 0 && rawSize <= 100 ? rawSize : 20;

      const result = await answerService.listByAuthor({
        authorId: req.user.id,
        page: currentPage,
        pageSize: size
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
