import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { requireActiveMembership } from '../middlewares/membership.middleware';
import { questionService } from '../services/question.service';
import { AppError } from '../errors/AppError';
import { answerService } from '../services/answer.service';
import { commentService } from '../services/comment.service';
import { interactionService } from '../services/interaction.service';
import { prisma } from '../config/database';

export const questionRouter = Router();

// 创建问题：学生（有效期内）或教师
questionRouter.post(
  '/',
  authMiddleware,
  requireActiveMembership,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role === 'parent') {
        throw new AppError(
          403,
          'PERMISSION_DENIED',
          '家长账号无提问权限'
        );
      }

      const { title, content, images, tags, difficulty } = req.body as {
        title: string;
        content?: string;
        images?: string[];
        tags?: string[];
        difficulty?: string;
      };

      const authorId = req.user!.id;
      const authorName = '当前用户'; // 简化处理，后续可从 User 表查询

      const created = await questionService.create({
        title,
        content,
        images,
        tags,
        difficulty,
        authorId,
        authorName
      });

      return res.status(201).json({
        code: 201,
        message: '问题提交成功，等待审核',
        data: created,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 查询问题列表
questionRouter.get(
  '/',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { page, pageSize, status, isGoodQuestion, tags } = req.query as any;
      const result = await questionService.list({
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        status,
        isGoodQuestion:
          typeof isGoodQuestion === 'string'
            ? isGoodQuestion === 'true'
            : undefined,
        tags: typeof tags === 'string' ? (tags as string).split(',') : undefined
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

// 查询某个问题的回答列表（只返回已通过审核的回答）
questionRouter.get(
  '/:questionId/answers',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.params;
      const result = await answerService.list({
        questionId,
        userId: req.user?.id
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

// 查询某个问题的评论列表（只返回已通过审核的评论）
questionRouter.get(
  '/:questionId/comments',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.params;
      const result = await commentService.list({ questionId });
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

// 创建评论：作者(自己的问题)或教师
questionRouter.post(
  '/:questionId/comments',
  authMiddleware,
  requireActiveMembership,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.params;
      const { content, image } = req.body as {
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

// 点赞 / 取消点赞问题
questionRouter.post(
  '/:questionId/like',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.params;
      const result = await interactionService.toggleQuestionLike({
        questionId,
        userId: req.user!.id
      });

      return res.json({
        code: 200,
        message: result.isLiked ? '点赞成功' : '取消点赞',
        data: result,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 收藏 / 取消收藏问题
questionRouter.post(
  '/:questionId/favorite',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.params;
      const result = await interactionService.toggleQuestionFavorite({
        questionId,
        userId: req.user!.id
      });

      return res.json({
        code: 200,
        message: result.isFavorited ? '收藏成功' : '取消收藏',
        data: result,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 创建回答：仅教师
questionRouter.post(
  '/:questionId/answers',
  authMiddleware,
  requireActiveMembership,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role !== 'teacher') {
        throw new AppError(
          403,
          'PERMISSION_DENIED',
          '只有教师可以回答问题'
        );
      }

      const { questionId } = req.params;
      const { content, images, audioUrl } = req.body as {
        content?: string;
        images?: string[];
        audioUrl?: string;
      };

      const created = await answerService.create({
        questionId,
        authorId: req.user!.id,
        content,
        images,
        audioUrl
      });

      return res.status(201).json({
        code: 201,
        message: '回答提交成功，等待审核',
        data: created,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 查询问题详情
questionRouter.get(
  '/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const data = await questionService.getById(id);

      // 计算当前用户对该问题的点赞 / 收藏状态
      let isLiked = false;
      let isFavorited = false;

      if (req.user) {
        const [like, favorite] = await Promise.all([
          prisma.like.findUnique({
            where: {
              userId_targetType_targetId: {
                userId: req.user.id,
                targetType: 'question',
                targetId: id
              }
            }
          }),
          prisma.favorite.findUnique({
            where: {
              userId_questionId: {
                userId: req.user.id,
                questionId: id
              }
            }
          })
        ]);

        isLiked = !!like;
        isFavorited = !!favorite;
      }

      return res.json({
        code: 200,
        message: 'success',
        data: {
          ...data,
          isLiked,
          isFavorited
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
