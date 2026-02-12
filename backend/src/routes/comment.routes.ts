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

/**
 * @swagger
 * /comments:
 *   post:
 *     summary: 创建评论
 *     description: 为问题创建评论，提问者本人或教师可以评论
 *     tags:
 *       - Comment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questionId]
 *             properties:
 *               questionId:
 *                 type: string
 *                 description: 问题ID
 *               content:
 *                 type: string
 *                 description: 评论内容
 *               image:
 *                 type: string
 *                 description: 评论图片URL
 *     responses:
 *       201:
 *         description: 评论提交成功，等待审核
 */
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
          '家长账号无评论权限',
          undefined,
          3003
        );
      }

      if (role === 'student' && question.authorId !== req.user!.id) {
        throw new AppError(
          403,
          'PERMISSION_DENIED',
          '学生只能评论自己的问题',
          undefined,
          3003
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

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: 删除评论
 *     description: 删除指定的评论，仅限评论作者本人或教师
 *     tags:
 *       - Comment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 评论ID
 *     responses:
 *       200:
 *         description: 删除成功
 */
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
