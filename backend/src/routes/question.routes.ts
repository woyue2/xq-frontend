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
        search: typeof search === 'string' ? search : undefined
      });

      // 补充当前登录用户的理解状态（仅针对题目作者本人，有记录才返回）
      let listWithUnderstanding = result.list;
      if (req.user && result.list.length > 0) {
        const questionIds = result.list.map((q: any) => q.id);

        const understandingList = await prisma.questionUnderstanding.findMany({
          where: {
            questionId: { in: questionIds },
            userId: req.user.id
          }
        });

        const understandingMap = new Map(
          understandingList.map((u) => [u.questionId, u.status])
        );

        listWithUnderstanding = result.list.map((q: any) => ({
          ...q,
          understandingStatus: understandingMap.get(q.id) ?? null
        }));
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

      const question = await prisma.question.findUnique({
        where: { id: questionId }
      });

      if (!question) {
        throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
      }

      // 仅允许提问的学生本人标记理解状态
      if (question.authorId !== req.user!.id) {
        throw new AppError(
          403,
          'PERMISSION_DENIED',
          '只有提问的学生可以标记是否弄懂'
        );
      }

      const userId = req.user!.id;

      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.questionUnderstanding.findUnique({
          where: {
            questionId_userId: {
              questionId,
              userId
            }
          }
        });

        let understoodDelta = 0;
        let notUnderstoodDelta = 0;

        if (!existing) {
          await tx.questionUnderstanding.create({
            data: {
              questionId,
              userId,
              status
            }
          });

          if (status === 'understood') {
            understoodDelta += 1;
          } else {
            notUnderstoodDelta += 1;
          }
        } else if (existing.status !== status) {
          await tx.questionUnderstanding.update({
            where: { id: existing.id },
            data: { status }
          });

          if (existing.status === 'understood') {
            understoodDelta -= 1;
          } else if (existing.status === 'not_understood') {
            notUnderstoodDelta -= 1;
          }

          if (status === 'understood') {
            understoodDelta += 1;
          } else if (status === 'not_understood') {
            notUnderstoodDelta += 1;
          }
        }

        const updatedQuestion = await tx.question.update({
          where: { id: questionId },
          data: {
            understoodCount: {
              increment: understoodDelta
            },
            notUnderstoodCount: {
              increment: notUnderstoodDelta
            }
          }
        });

        return {
          questionId,
          status,
          understoodCount: updatedQuestion.understoodCount,
          notUnderstoodCount: updatedQuestion.notUnderstoodCount
        };
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
      let understandingStatus: string | null = null;

      if (req.user) {
        const [like, favorite, understanding] = await Promise.all([
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
          }),
          prisma.questionUnderstanding.findUnique({
            where: {
              questionId_userId: {
                questionId: id,
                userId: req.user.id
              }
            }
          })
        ]);

        isLiked = !!like;
        isFavorited = !!favorite;
        understandingStatus = understanding?.status ?? null;
      }

      return res.json({
        code: 200,
        message: 'success',
        data: {
          ...data,
          isLiked,
          isFavorited,
          understandingStatus,
          understoodCount: (data as any).understoodCount ?? undefined,
          notUnderstoodCount: (data as any).notUnderstoodCount ?? undefined
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
