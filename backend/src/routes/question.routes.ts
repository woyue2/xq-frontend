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
          '家长账号无提问权限',
          undefined,
          3001
        );
      }

      const { title, content, images, tags, difficulty, subject } = req.body as {
        title: string;
        content?: string;
        images?: string[];
        tags?: string[];
        difficulty?: string;
        subject?: string;
      };

      const authorId = req.user!.id;
      const authorName = '当前用户'; // 简化处理，后续可从 User 表查询
      const authorRole = req.user!.role;

      const created = await questionService.create({
        title,
        content,
        images,
        tags,
        difficulty,
        subject,
        authorId,
        authorName,
        authorRole
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
      const { page, pageSize, status, isGoodQuestion, tags, authorId, search } =
        req.query as any;

      const result = await questionService.list({
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        status,
        isGoodQuestion:
          typeof isGoodQuestion === 'string'
            ? isGoodQuestion === 'true'
            : undefined,
        tags: typeof tags === 'string' ? (tags as string).split(',') : undefined,
        authorId: typeof authorId === 'string' ? authorId : undefined,
        search: typeof search === 'string' ? search : undefined
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

// 创建回答：教师可以回答任意问题；学生可以回答教师提出的问题
questionRouter.post(
  '/:questionId/answers',
  authMiddleware,
  requireActiveMembership,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.params;

      const question = await prisma.question.findUnique({
        where: { id: questionId }
      });

      if (!question) {
        throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
      }

      // 权限检查
      // 1. 如果是教师，允许回答所有问题
      // 2. 如果是学生，只允许回答“教师发布的”问题
      const isTeacher = req.user!.role === 'teacher';

      if (!isTeacher) {
        // 查询题目作者
        const author = await prisma.user.findUnique({ where: { id: question.authorId } });
        const isTeacherQuestion = author?.role === 'teacher';

        if (!isTeacherQuestion) {
          throw new AppError(
            403,
            'PERMISSION_DENIED',
            '学生只能回答教师提出的问题',
            undefined,
            3002
          );
        }
      }

      const { content, images, audioUrl, audioUrls } = req.body as {
        content?: string;
        images?: string[];
        audioUrl?: string;
        audioUrls?: string[];
      };

      const created = await answerService.create({
        questionId,
        authorId: req.user!.id,
        content,
        images,
        audioUrl,
        audioUrls
      });

      let message = '回答提交成功';
      if (created.status === 'pending') {
        message = '回答提交成功，等待审核';
      } else if (created.status === 'approved') {
        message = '回答提交成功，已通过审核';
      } else if (created.status === 'rejected') {
        message = '回答提交成功，但未通过审核';
      }

      return res.status(201).json({
        code: 201,
        message,
        data: created,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 删除问题
questionRouter.delete(
  '/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await questionService.delete({
        id,
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

// 查询问题详情
questionRouter.get(
  '/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const data = await questionService.getById(id, {
        userId: req.user!.id,
        role: req.user!.role
      });

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
