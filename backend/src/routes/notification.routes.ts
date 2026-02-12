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
          list: notifications.map((n) => ({
            id: n.id,
            userId: n.userId,  // 添加 userId 字段
            type: n.type,
            title: n.title,
            content: n.content,
            targetType: n.targetType,
            targetId: n.targetId,
            isRead: n.isRead,
            readAt: n.readAt, // 新增：返回已读时间
            createdAt: n.createdAt
          })),
          pagination: {
            page,
            pageSize: limit,
            total,
            totalPages: Math.ceil(total / limit)
          },
          unreadCount
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 获取未读通知数量（必须在 /notifications/:id 之前，避免路由冲突）
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

// 获取通知详情（问题76）
notificationRouter.get(
  '/notifications/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const { id } = req.params;
      const notification = await notificationService.findById(id);

      if (!notification || notification.userId !== req.user.id) {
        throw new AppError(404, 'NOT_FOUND', '通知不存在');
      }

      return res.json({
        code: 200,
        message: 'success',
        data: {
          id: notification.id,
          userId: notification.userId,  // 添加 userId 字段
          type: notification.type,
          title: notification.title,
          content: notification.content,
          targetType: notification.targetType,
          targetId: notification.targetId,
          isRead: notification.isRead,
          readAt: notification.readAt, // 新增：返回已读时间
          createdAt: notification.createdAt
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

      if (!Array.isArray(idsRaw)) {
        throw new AppError(400, 'VALIDATION_ERROR', '参数验证失败', {
          errors: [
            {
              field: 'ids',
              message: 'ids 必须为字符串数组'
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

// 标记所有通知为已读（问题77）
notificationRouter.post(
  '/notifications/read-all',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const { updatedCount } = await notificationService.markAllAsRead(
        req.user.id
      );

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

// 删除通知（问题78）
notificationRouter.delete(
  '/notifications/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const { id } = req.params;
      const notification = await notificationService.findById(id);

      if (!notification || notification.userId !== req.user.id) {
        throw new AppError(404, 'NOT_FOUND', '通知不存在');
      }

      await notificationService.deleteById(id);

      return res.json({
        code: 200,
        message: 'success',
        data: {
          success: true
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
