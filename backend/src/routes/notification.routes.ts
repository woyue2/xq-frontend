/**
 * [POS] backend/src/routes/notification.routes.ts
 *   所属：路由层 | 角色：通知路由（获取未读数、列表、标记已读）
 *
 * [INPUT]
 *   - express                          → Router / Response / NextFunction
 *   - ../middlewares/auth.middleware    → authMiddleware / AuthenticatedRequest
 *   - ../services/notification.service → notificationService
 *   - ../errors/AppError               → AppError
 *
 * [OUTPUT]
 *   - notificationRouter（Express Router）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/routes/CLAUDE.md 的文件清单
 */
import { Router, type Response, type NextFunction } from 'express';
import {
  authMiddleware,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { notificationService } from '../services/notification.service';
import { AppError } from '../errors/AppError';

export const notificationRouter = Router();

// 获取通知列表
notificationRouter.get(
  '/notifications',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const rawPage = Number(req.query.page ?? 1);
      const rawLimit = Number(req.query.limit ?? 20);
      const unreadOnly = String(req.query.unread ?? '').toLowerCase() === 'true';

      const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
      const limit =
        Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 100
          ? rawLimit
          : 20;

      const { notifications, total, unreadCount } =
        await notificationService.listForUser({
          userId: req.user.id,
          page,
          limit,
          unreadOnly
        });

      return res.json({
        code: 200,
        message: 'success',
        data: {
          notifications: notifications.map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            content: n.content,
            targetType: n.targetType,
            targetId: n.targetId,
            isRead: n.isRead,
            createdAt: n.createdAt
          })),
          unreadCount,
          total
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 获取未读通知数量
notificationRouter.get(
  '/notifications/unread-count',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const unreadCount = await notificationService.getUnreadCount(
        req.user.id
      );

      return res.json({
        code: 200,
        message: 'success',
        data: {
          unreadCount
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 标记通知已读
notificationRouter.post(
  '/notifications/read',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const body = req.body as any;
      const idsRaw = body?.ids;

      if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
        throw new AppError(400, 'VALIDATION_ERROR', '参数验证失败', {
          errors: [
            {
              field: 'ids',
              message: 'ids 必须为非空字符串数组'
            }
          ]
        });
      }

      const ids = idsRaw.map((id) => String(id));

      const { updatedCount } = await notificationService.markAsRead({
        userId: req.user.id,
        ids
      });

      return res.json({
        code: 200,
        message: 'success',
        data: {
          success: true,
          updatedCount
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
