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

// 查询待审核内容
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

// 审核通过
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

// 审核驳回
adminAuditRouter.post(
  '/:contentId/reject',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;
      const { type, reason } = req.body as any;

      if (type !== 'question') {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          '仅支持驳回问题'
        );
      }

      const updated = await auditService.rejectQuestion({
        id: contentId,
        auditorId: req.user!.id,
        reason
      });

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

// 封禁内容
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

// 置顶 / 取消置顶问题
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
