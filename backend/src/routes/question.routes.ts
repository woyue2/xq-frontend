/**
 * [POS] backend/src/routes/question.routes.ts
 *   所属：路由层 | 角色：题目路由（发布、查询、搜索题目）
 *
 * [INPUT]
 *   - express                              → Router / Response / NextFunction
 *   - ../middlewares/auth.middleware        → authMiddleware / optionalAuthMiddleware / AuthenticatedRequest
 *   - ../middlewares/membership.middleware  → requireActiveMembership
 *   - ../services/question.service         → questionService
 *   - ../services/answer.service           → answerService
 *   - ../services/comment.service          → commentService
 *   - ../services/interaction.service      → interactionService
 *   - ../errors/AppError                   → AppError
 *
 * [OUTPUT]
 *   - questionRouter（Express Router）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/routes/CLAUDE.md 的文件清单
 */
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  optionalAuthMiddleware,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { requireActiveMembership } from '../middlewares/membership.middleware';
import { questionService } from '../services/question.service';
import { AppError } from '../errors/AppError';
import { answerService } from '../services/answer.service';
import { commentService } from '../services/comment.service';
import { interactionService } from '../services/interaction.service';

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
      const authorRole = req.user!.role;

      const created = await questionService.create({
        title,
        content,
        images,
        tags,
        difficulty,
        subject,
        authorId,
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

// 查询问题列表 — [IMPL] 原因：改为可选鉴权，游客可浏览已审核题目
questionRouter.get(
  '/',
  optionalAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { page, pageSize, subject, status, isGoodQuestion, tags, authorId, search } =
        req.query as any;

      const result = await questionService.list({
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        subject: typeof subject === 'string' ? subject : undefined,
        status,
        isGoodQuestion:
          typeof isGoodQuestion === 'string'
            ? isGoodQuestion === 'true'
            : undefined,
        tags: typeof tags === 'string' ? (tags as string).split(',') : undefined,
        authorId: typeof authorId === 'string' ? authorId : undefined,
        search: typeof search === 'string' ? search : undefined,
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

// 查询某个问题的回答列表（只返回已通过审核的回答）
questionRouter.get(
  '/:questionId/answers',
  optionalAuthMiddleware,
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
  optionalAuthMiddleware,
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

      const created = await commentService.create({
        questionId,
        authorId: req.user!.id,
        authorRole: req.user!.role,
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

// 学生个人理解状态标记（弄懂了 / 没弄懂）
questionRouter.post(
  '/:questionId/understanding',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.params;
      const { status } = req.body as { status?: string };

      if (status !== 'understood' && status !== 'not_understood') {
        throw new AppError(
          400,
          'INVALID_UNDERSTANDING_STATUS',
          '理解状态非法，仅支持 understood / not_understood'
        );
      }

      const result = await questionService.setUnderstanding({
        questionId,
        userId: req.user!.id,
        status
      });

      return res.json({
        code: 200,
        message: '理解状态更新成功',
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

      const { content, images, audioUrl, audioUrls } = req.body as {
        content?: string;
        images?: string[];
        audioUrl?: string;
        audioUrls?: string[];
      };

      const created = await answerService.create({
        questionId,
        authorId: req.user!.id,
        authorRole: req.user!.role,
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

// 编辑问题（仅 pending 状态，仅作者本人）
questionRouter.patch(
  '/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { title, content, images, tags, difficulty, subject } = req.body as {
        title?: string;
        content?: string;
        images?: string[];
        tags?: string[];
        difficulty?: string;
        subject?: string;
      };

      const updated = await questionService.update({
        id,
        userId: req.user!.id,
        title,
        content,
        images,
        tags,
        difficulty,
        subject
      });

      return res.json({
        code: 200,
        message: '更新成功',
        data: updated,
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
  optionalAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const data = await questionService.getById(id, req.user ? {
        userId: req.user.id,
        role: req.user.role
      } : undefined);

      return res.json({
        code: 200,
        message: 'success',
        data,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
