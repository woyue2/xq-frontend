import { Router, type Response, type NextFunction } from 'express';
import {
  authMiddleware,
  type AuthenticatedRequest,
  requireTeacher,
  createRequireTeacher
} from '../middlewares/auth.middleware';
import { auditService } from '../services/audit.service';
import { AppError } from '../errors/AppError';

export const adminAuditRouter = Router();

adminAuditRouter.use(
  authMiddleware,
  createRequireTeacher({
    bizCode: 3004,
    message: '无审核权限'
  })
);

/**
 * @swagger
 * /admin/audit/pending:
 *   get:
 *     summary: 查询待审核内容
 *     description: 获取待审核的问题、回答或评论列表
 *     tags:
 *       - Admin - Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [question, answer, comment]
 *         description: 审核类型
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 获取成功
 */
adminAuditRouter.get(
  '/pending',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const typeRaw = String(req.query.type ?? 'question');
      if (!['question', 'answer', 'comment'].includes(typeRaw)) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'type 参数无效'
        );
      }

      const page = req.query.page ? Number(req.query.page) : undefined;
      const pageSize = req.query.pageSize
        ? Number(req.query.pageSize)
        : undefined;

      const data = await auditService.listPending({
        type: typeRaw as any,
        page,
        pageSize
      });

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

/**
 * @swagger
 * /admin/audit/{contentId}/approve:
 *   post:
 *     summary: 审核通过
 *     description: 将指定内容审核通过，支持问题评分、标签设置等
 *     tags:
 *       - Admin - Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: 内容ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [question, comment]
 *                 description: 内容类型
 *               isGoodQuestion:
 *                 type: boolean
 *                 description: 是否为优质问题
 *               score:
 *                 type: number
 *                 description: 问题评分
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 问题标签
 *               difficulty:
 *                 type: string
 *                 description: 难度等级
 *     responses:
 *       200:
 *         description: 审核通过成功
 */
adminAuditRouter.post(
  '/:contentId/approve',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;
      const { type, isGoodQuestion, score, tags, difficulty } =
        req.body as any;

      if (!type) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          '缺少 type 参数'
        );
      }

      if (type === 'question') {
        const updated = await auditService.approveQuestion({
          id: contentId,
          auditorId: req.user!.id,
          isGoodQuestion,
          score,
          tags,
          difficulty
        });

        return res.json({
          code: 200,
          message: '审核完成：已通过',
          data: {
            id: updated.id,
            status: updated.status,
            isGoodQuestion: updated.isGoodQuestion,
            score: updated.score,
            tags: updated.tags,
            difficulty: updated.difficulty,
            approvedBy: req.user!.id,
            approvedAt: updated.updatedAt
          },
          timestamp: Date.now()
        });
      }

      if (type === 'comment') {
        const updated = await auditService.approveComment({
          id: contentId,
          auditorId: req.user!.id
        });

        return res.json({
          code: 200,
          message: '审核完成：已通过',
          data: {
            id: updated.id,
            status: updated.status,
            approvedBy: req.user!.id,
            approvedAt: updated.updatedAt
          },
          timestamp: Date.now()
        });
      }

      if (type === 'answer') {
        // 修改原因：补齐回答人工审核通过入口，解决 pending answer 无法在后台处理的问题。
        const updated = await auditService.approveAnswer({
          id: contentId,
          auditorId: req.user!.id
        });

        return res.json({
          code: 200,
          message: '审核完成：已通过',
          data: {
            id: updated.id,
            status: updated.status,
            approvedBy: req.user!.id,
            approvedAt: updated.updatedAt
          },
          timestamp: Date.now()
        });
      }

      throw new AppError(
        400,
        'VALIDATION_ERROR',
        '暂不支持该类型的审核通过'
      );
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /admin/audit/{contentId}/reject:
 *   post:
 *     summary: 审核驳回
 *     description: 将指定问题审核驳回
 *     tags:
 *       - Admin - Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: 内容ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, reason]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [question, answer]
 *                 description: 内容类型
 *               reason:
 *                 type: string
 *                 description: 驳回原因
 *     responses:
 *       200:
 *         description: 审核驳回成功
 */
adminAuditRouter.post(
  '/:contentId/reject',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;
      const { type, reason } = req.body as any;

      let updated: { id: string; status: string; aiResult: string | null; updatedAt: Date };
      if (type === 'question') {
        updated = await auditService.rejectQuestion({
          id: contentId,
          auditorId: req.user!.id,
          reason
        });
      } else if (type === 'answer') {
        // 修改原因：补齐回答人工驳回入口，避免待审回答只能“看见但无法处理”。
        updated = await auditService.rejectAnswer({
          id: contentId,
          auditorId: req.user!.id,
          reason
        });
      } else {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          '仅支持驳回问题或回答'
        );
      }

      return res.json({
        code: 200,
        message: '审核完成：已驳回',
        data: {
          id: updated.id,
          status: updated.status,
          reason: updated.aiResult,
          rejectedBy: req.user!.id,
          rejectedAt: updated.updatedAt
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
 * /admin/audit/{contentId}/ban:
 *   post:
 *     summary: 封禁内容
 *     description: 将指定评论封禁
 *     tags:
 *       - Admin - Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: 内容ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, reason]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [comment]
 *                 description: 内容类型
 *               reason:
 *                 type: string
 *                 description: 封禁原因
 *     responses:
 *       200:
 *         description: 封禁成功
 */
adminAuditRouter.post(
  '/:contentId/ban',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;
      const { type, reason } = req.body as any;

      if (type !== 'comment') {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          '仅支持封禁评论'
        );
      }

      const updated = await auditService.banComment({
        id: contentId,
        auditorId: req.user!.id,
        reason
      });

      return res.json({
        code: 200,
        message: '审核完成：已封禁',
        data: {
          id: updated.id,
          status: updated.status,
          banReason: updated.aiResult,
          bannedBy: req.user!.id,
          bannedAt: updated.updatedAt
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
 * /admin/audit/questions/{questionId}/pin:
 *   post:
 *     summary: 置顶/取消置顶问题
 *     description: 将指定问题置顶或取消置顶
 *     tags:
 *       - Admin - Audit
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
adminAuditRouter.post(
  '/questions/:questionId/pin',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { questionId } = req.params;
      const updated = await auditService.togglePinQuestion({
        id: questionId,
        auditorId: req.user!.id
      });

      return res.json({
        code: 200,
        message: updated.isPinned ? '已置顶' : '已取消置顶',
        data: {
          id: updated.id,
          isPinned: updated.isPinned
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
