import { prisma } from '../config/database';

export class NotificationService {
  async listForUser(params: {
    userId: string;
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit =
      params.limit && params.limit > 0 && params.limit <= 100
        ? params.limit
        : 20;

    const where: any = {
      userId: params.userId
    };

    if (params.unreadOnly === true) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId: params.userId,
          isRead: false
        }
      })
    ]);

    return {
      notifications,
      total,
      unreadCount
    };
  }

  async getUnreadCount(userId: string) {
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });

    return unreadCount;
  }

  async markAsRead(params: { userId: string; ids: string[] }) {
    const { userId, ids } = params;

    const where: any = {
      userId,
      isRead: false
    };

    if (ids.length > 0) {
      where.id = {
        in: ids
      };
    }

    const result = await prisma.notification.updateMany({
      where,
      data: {
        isRead: true
      }
    });

    return {
      updatedCount: result.count
    };
  }
}

export const notificationService = new NotificationService();

