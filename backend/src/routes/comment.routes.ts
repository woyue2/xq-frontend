import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { requireActiveMembership } from '../middlewares/membership.middleware';
import { commentService } from '../services/comment.service';
import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

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

      const question = await prisma.question.findUnique({
        where: { id: questionId }
      });

      if (!question) {
        throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
      }

      const role = req.user!.role;

      if (role === 'parent') {
        throw new AppError(
          403,
          'PERMISSION_DENIED',
          '家长账号无评论权限'
        );
      }

      if (role === 'student' && question.authorId !== req.user!.id) {
        throw new AppError(
          403,
          'PERMISSION_DENIED',
          '学生只能评论自己的问题'
        );
      }

      const created = await commentService.create({
        questionId,
        authorId: req.user!.id,
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

