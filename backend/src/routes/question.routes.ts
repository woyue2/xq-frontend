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
import { prisma } from '../config/database';

export const questionRouter = Router();

/**
 * @swagger
 * /questions:
 *   post:
 *     summary: 创建问题
 *     description: 学生或教师创建新问题，问题提交后需要审核
 *     tags:
 *       - Question
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: 问题标题
 *                 example: "如何解一元二次方程？"
 *               content:
 *                 type: string
 *                 description: 问题详细内容
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 图片URL列表
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 问题标签
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *                 description: 难度等级
 *               subject:
 *                 type: string
 *                 description: 学科
 *                 example: "math"
 *     responses:
 *       201:
 *         description: 问题创建成功，等待审核
 */

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

/**
 * @swagger
 * /questions:
 *   get:
 *     summary: 获取问题列表
 *     description: 分页获取问题列表，支持按学科、状态、标签等条件筛选
 *     tags:
 *       - Question
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码，从1开始
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: 每页数量
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: 学科筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 审核状态筛选
 *       - in: query
 *         name: isGoodQuestion
 *         schema:
 *           type: boolean
 *         description: 是否精华
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: 标签筛选，逗号分隔
 *       - in: query
 *         name: authorId
 *         schema:
 *           type: string
 *         description: 作者ID筛选
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 关键词搜索
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                 type: object
 *                 properties:
 *                   list:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/Question'
 *                   pagination:
 *                     $ref: '#/components/schemas/PaginatedResponse'
 */
questionRouter.get(
  '/',
  authMiddleware,
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
        // 修改原因：将当前用户透传给列表服务，以返回 isLiked/isFavorited，解决刷新后实心态丢失。
        userId: req.user?.id
      });

      // 修改原因：将“理解状态”查询下沉到 Service，避免 Route 直接访问数据层（P0-3）。
      let listWithUnderstanding = result.list;
      if (req.user && result.list.length > 0) {
        listWithUnderstanding = await questionService.appendUnderstandingStatusToList({
          list: result.list,
          userId: req.user.id
        });
      }

      return res.json({
        code: 200,
        message: 'success',
        data: {
          ...result,
          list: listWithUnderstanding
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /questions/my-status-counts:
 *   get:
 *     summary: 获取当前用户提问状态统计
 *     description: 返回当前登录用户在各审核状态下的问题数量统计
 *     tags:
 *       - Question
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
questionRouter.get(
  '/my-status-counts',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      // 修改原因：统计口径以“当前登录用户本人”为准，避免 authorId 透传带来的越权读取风险。
      const stats = await questionService.getMyStatusCounts({
        authorId: req.user.id
      });

      return res.json({
        code: 200,
        message: 'success',
        data: stats,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /questions/{questionId}/answers:
 *   get:
 *     summary: 获取问题的回答列表
 *     description: 获取指定问题的已审核回答列表
 *     tags:
 *       - Answer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 问题ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
questionRouter.get(
  '/:questionId/answers',
  optionalAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.params;
      const shareToken =
        typeof req.query.shareToken === 'string'
          ? req.query.shareToken
          : undefined;

      if (!req.user) {
        if (!shareToken) {
          throw new AppError(401, 'UNAUTHORIZED', '未登录');
        }
        // 修改原因：允许访客通过有效分享链接只读访问该问题回答列表。
        await questionService.assertShareTokenAccess({
          questionId,
          shareToken
        });
      }

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

/**
 * @swagger
 * /questions/{questionId}/comments:
 *   get:
 *     summary: 获取问题的评论列表
 *     description: 获取指定问题的已审核评论列表
 *     tags:
 *       - Comment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 问题ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
questionRouter.get(
  '/:questionId/comments',
  optionalAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.params;
      const shareToken =
        typeof req.query.shareToken === 'string'
          ? req.query.shareToken
          : undefined;

      if (!req.user) {
        if (!shareToken) {
          throw new AppError(401, 'UNAUTHORIZED', '未登录');
        }
        // 修改原因：允许访客通过有效分享链接只读访问该问题评论列表。
        await questionService.assertShareTokenAccess({
          questionId,
          shareToken
        });
      }
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

/**
 * @swagger
 * /questions/{questionId}/comments:
 *   post:
 *     summary: 创建评论
 *     description: 为问题创建评论，仅限问题作者本人或教师
 *     tags:
 *       - Comment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 问题ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: 评论内容
 *               image:
 *                 type: string
 *                 description: 评论图片URL
 *     responses:
 *       201:
 *         description: 评论创建成功
 */
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

/**
 * @swagger
 * /questions/{questionId}/like:
 *   post:
 *     summary: 点赞/取消点赞问题
 *     description: 对问题进行点赞或取消点赞
 *     tags:
 *       - Interaction
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 问题ID
 *     responses:
 *       200:
 *         description: 操作成功
 */
questionRouter.post(
  '/:questionId/like',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.params;
      const { action } = (req.body ?? {}) as {
        action?: 'like' | 'unlike';
      };
      if (action && action !== 'like' && action !== 'unlike') {
        throw new AppError(
          400,
          'INVALID_ACTION',
          'action 只能为 like 或 unlike'
        );
      }
      // 修改原因：旧入口兼容支持显式 action，与 /api/interactions/like 语义对齐，降低重试/乱序下的反向翻转风险。
      // ⚠️ 不确定因素：未传 action 时仍保留 toggle 以兼容历史客户端，历史调用链在重试场景下仍可能出现反向翻转。
      const result = await interactionService.toggleQuestionLike({
        questionId,
        userId: req.user!.id,
        action
      });

      return res.json({
        code: 200,
        message: result.isLiked ? '点赞成功' : '取消点赞',
        data: {
          ...result,
          // 修改原因：旧入口补齐 liked/likesCount 字段，统一与 /api/interactions/like 的响应契约。
          liked: result.isLiked,
          likesCount: result.likes
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /questions/{questionId}/favorite:
 *   post:
 *     summary: 收藏/取消收藏问题
 *     description: 对问题进行收藏或取消收藏
 *     tags:
 *       - Interaction
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 问题ID
 *     responses:
 *       200:
 *         description: 操作成功
 */
questionRouter.post(
  '/:questionId/favorite',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.params;
      const { action } = (req.body ?? {}) as {
        action?: 'favorite' | 'unfavorite';
      };
      if (action && action !== 'favorite' && action !== 'unfavorite') {
        throw new AppError(
          400,
          'INVALID_ACTION',
          'action 只能为 favorite 或 unfavorite'
        );
      }
      // 修改原因：旧入口兼容支持显式 action，与 /api/interactions/favorite 语义对齐，降低重试/乱序下的反向翻转风险。
      // ⚠️ 不确定因素：未传 action 时仍保留 toggle 以兼容历史客户端，历史调用链在重试场景下仍可能出现反向翻转。
      const result = await interactionService.toggleQuestionFavorite({
        questionId,
        userId: req.user!.id,
        action
      });

      return res.json({
        code: 200,
        message: result.isFavorited ? '收藏成功' : '取消收藏',
        data: {
          ...result,
          // 修改原因：旧入口补齐 favorited/favoritesCount 字段，统一与 /api/interactions/favorite 的响应契约。
          favorited: result.isFavorited,
          favoritesCount: result.favorites
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /questions/{questionId}/understanding:
 *   post:
 *     summary: 标记理解状态
 *     description: 学生标记自己对问题的理解状态（弄懂了/没弄懂），仅限提问者本人
 *     tags:
 *       - Question
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 问题ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [understood, not_understood]
 *                 description: 理解状态
 *     responses:
 *       200:
 *         description: 标记成功
 */
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

      // 修改原因：将理解状态事务写入下沉到 Service，Route 仅保留参数校验与响应组装（P0-3）。
      const result = await questionService.markUnderstandingStatus({
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

/**
 * @swagger
 * /questions/{questionId}/answers:
 *   post:
 *     summary: 创建回答
 *     description: 为问题创建回答，教师可以回答任意问题，学生只能回答教师发布的问题
 *     tags:
 *       - Answer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 问题ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: 回答内容
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 图片列表
 *               audioUrl:
 *                 type: string
 *                 description: 音频URL
 *               audioUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 音频列表
 *     responses:
 *       201:
 *         description: 回答创建成功
 */
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

/**
 * @swagger
 * /questions/{id}:
 *   delete:
 *     summary: 删除问题
 *     description: 删除指定问题，仅限作者本人或管理员
 *     tags:
 *       - Question
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 问题ID
 *     responses:
 *       200:
 *         description: 删除成功
 */
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

/**
 * @swagger
 * /questions/{id}:
 *   get:
 *     summary: 获取问题详情
 *     description: 获取指定问题的详细信息，包括点赞、收藏、理解状态等
 *     tags:
 *       - Question
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 问题ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
questionRouter.get(
  '/:id',
  optionalAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const shareToken =
        typeof req.query.shareToken === 'string'
          ? req.query.shareToken
          : undefined;

      let data: any;
      if (req.user) {
        data = await questionService.getById(id, {
          userId: req.user.id,
          role: req.user.role
        });
      } else {
        if (!shareToken) {
          throw new AppError(401, 'UNAUTHORIZED', '未登录');
        }
        // 修改原因：允许未登录访客携带分享 token 访问单题详情。
        await questionService.assertShareTokenAccess({
          questionId: id,
          shareToken
        });
        data = await questionService.getById(id);
      }

      // 修改原因：将详情页互动状态查询下沉到 Service，减少 Route 对数据访问细节的耦合（P0-3）。
      const interactionState = await questionService.getInteractionState({
        questionId: id,
        userId: req.user?.id
      });

      return res.json({
        code: 200,
        message: 'success',
        data: {
          ...data,
          isLiked: interactionState.isLiked,
          isFavorited: interactionState.isFavorited,
          understandingStatus: interactionState.understandingStatus,
          understoodCount: (data as any).understoodCount ?? undefined,
          notUnderstoodCount: (data as any).notUnderstoodCount ?? undefined,
          // 修改原因：前端据此识别“分享访客只读态”，避免误显示可互动入口。
          isSharedView: !req.user
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

questionRouter.post(
  '/:id/share-link',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await questionService.createShareLink({
        questionId: id,
        userId: req.user!.id,
        role: req.user!.role
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
