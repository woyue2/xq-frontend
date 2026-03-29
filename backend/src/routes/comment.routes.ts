/**
 * [POS] backend/src/routes/comment.routes.ts
 *   所属：路由层 | 角色：评论路由（发布、删除、查询评论）
 *
 * [INPUT]
 *   - express                           → Router / Response / NextFunction
 *   - ../middlewares/auth.middleware     → authMiddleware / AuthenticatedRequest
 *   - ../middlewares/membership.middleware → requireActiveMembership
 *   - ../services/comment.service       → commentService
 *
 * [OUTPUT]
 *   - commentRouter（Express Router）
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
import { requireActiveMembership } from '../middlewares/membership.middleware';
import { commentService } from '../services/comment.service';

export const commentRouter = Router();

// 创建评论：提问者(自己的问题)或教师
commentRouter.post(
  '/',
  authMiddleware,
  requireActiveMembership,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { questionId, content, image } = req.body as {
        questionId: string;
        content?: string;
        image?: string;
      };

      const role = req.user!.role;

      const created = await commentService.create({
        questionId,
        authorId: req.user!.id,
        authorRole: role,
        content,
        image
      });

      return res.status(201).json({
        code: 201,
        message: '评论提交成功，等待审核',
        data: created,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 删除评论：作者或教师
commentRouter.delete(
  '/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await commentService.remove({
        commentId: req.params.id,
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
