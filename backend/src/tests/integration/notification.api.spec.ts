import request from 'supertest';
import { createApp } from '../../app';
import { signAccessToken } from '../../utils/jwt';
import { prisma } from '../../config/database';

describe('Notification API', () => {
  const app = createApp();

  const studentId = 'notification_student_001';
  const studentToken = signAccessToken({
    sub: studentId,
    role: 'student'
  });

  beforeEach(async () => {
    await prisma.user.upsert({
      where: { id: studentId },
      update: {},
      create: {
        id: studentId,
        phone: '13900008888',
        nickname: '通知学生',
        role: 'student',
        isActive: true,
        isBanned: false
      }
    });

    await prisma.notification.deleteMany({
      where: { userId: studentId }
    });
  });

  // NOTIFICATION-API-001 获取通知列表
  it('should list notifications for current user (NOTIFICATION-API-001)', async () => {
    await prisma.notification.createMany({
      data: [
        {
          userId: studentId,
          type: 'system',
          title: '系统通知 1',
          content: '您的账号已激活',
          targetType: null,
          targetId: null
        },
        {
          userId: studentId,
          type: 'answer',
          title: '回答通知',
          content: '老师已经回答了你的问题',
          targetType: 'question',
          targetId: 'q-001'
        }
      ]
    });

    // 为其他用户插入一条噪声数据，确保不会被返回
    await prisma.notification.create({
      data: {
        userId: 'other_user',
        type: 'system',
        title: '其他用户通知',
        content: '不应该出现在结果中',
        targetType: null,
        targetId: null
      }
    });

    const res = await request(app)
      .get('/api/notifications?page=1&limit=10')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.notifications.length).toBe(2);
    expect(
      res.body.data.notifications.every(
        (n: any) =>
          ['系统通知 1', '回答通知'].includes(n.title) &&
          n.userId === undefined
      )
    ).toBe(true);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(2);
  });

  // NOTIFICATION-API-002 获取未读通知数量
  it('should get unread notification count (NOTIFICATION-API-002)', async () => {
    await prisma.notification.createMany({
      data: [
        {
          userId: studentId,
          type: 'system',
          title: '未读 1',
          content: '未读通知 1',
          targetType: null,
          targetId: null
        },
        {
          userId: studentId,
          type: 'system',
          title: '未读 2',
          content: '未读通知 2',
          targetType: null,
          targetId: null
        },
        {
          userId: studentId,
          type: 'system',
          title: '已读',
          content: '已读通知',
          targetType: null,
          targetId: null,
          isRead: true
        }
      ]
    });

    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.unreadCount).toBe(2);
  });

  // NOTIFICATION-API-003 标记通知已读后未读数减少
  it('should mark notifications as read and reduce unread count (NOTIFICATION-API-003)', async () => {
    const n1 = await prisma.notification.create({
      data: {
        userId: studentId,
        type: 'system',
        title: '未读 A',
        content: '未读 A',
        targetType: null,
        targetId: null
      }
    });
    const n2 = await prisma.notification.create({
      data: {
        userId: studentId,
        type: 'system',
        title: '未读 B',
        content: '未读 B',
        targetType: null,
        targetId: null
      }
    });
    await prisma.notification.create({
      data: {
        userId: studentId,
        type: 'system',
        title: '未读 C',
        content: '未读 C',
        targetType: null,
        targetId: null
      }
    });

    const beforeRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(beforeRes.status).toBe(200);
    expect(beforeRes.body.data.unreadCount).toBe(3);

    const markRes = await request(app)
      .post('/api/notifications/read')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        ids: [n1.id, n2.id]
      });

    expect(markRes.status).toBe(200);
    expect(markRes.body.code).toBe(200);
    expect(markRes.body.data.success).toBe(true);
    expect(markRes.body.data.updatedCount).toBeGreaterThanOrEqual(2);

    const afterRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(afterRes.status).toBe(200);

    const unreadAfter = afterRes.body.data.unreadCount as number;
    expect(unreadAfter).toBeLessThan(beforeRes.body.data.unreadCount);
    expect(unreadAfter).toBe(1);
  });

  // NOTIFICATION-API-004 ids 为空数组时应将当前用户所有未读通知标记为已读
  it('should mark all unread notifications as read when ids is empty array (NOTIFICATION-API-004)', async () => {
    await prisma.notification.createMany({
      data: [
        {
          userId: studentId,
          type: 'system',
          title: '全部未读 1',
          content: '全部未读 1',
          targetType: null,
          targetId: null
        },
        {
          userId: studentId,
          type: 'system',
          title: '全部未读 2',
          content: '全部未读 2',
          targetType: null,
          targetId: null
        }
      ]
    });

    const beforeRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(beforeRes.status).toBe(200);
    const beforeCount = beforeRes.body.data.unreadCount as number;
    expect(beforeCount).toBeGreaterThanOrEqual(2);

    const markRes = await request(app)
      .post('/api/notifications/read')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ ids: [] });

    expect(markRes.status).toBe(200);
    expect(markRes.body.code).toBe(200);
    expect(markRes.body.data.success).toBe(true);
    expect(markRes.body.data.updatedCount).toBeGreaterThanOrEqual(beforeCount);

    const afterRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(afterRes.status).toBe(200);
    expect(afterRes.body.data.unreadCount).toBe(0);
  });

  // NOTIFICATION-API-005 不能标记其他用户的通知为已读
  it('should not mark notifications of other users as read (NOTIFICATION-API-005)', async () => {
    const otherUserId = 'notification_other_user';

    const [selfNotif, otherNotif] = await Promise.all([
      prisma.notification.create({
        data: {
          userId: studentId,
          type: 'system',
          title: '自己的通知',
          content: '自己的通知',
          targetType: null,
          targetId: null
        }
      }),
      prisma.notification.create({
        data: {
          userId: otherUserId,
          type: 'system',
          title: '其他用户通知',
          content: '其他用户通知',
          targetType: null,
          targetId: null
        }
      })
    ]);

    const res = await request(app)
      .post('/api/notifications/read')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ ids: [selfNotif.id, otherNotif.id] });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.success).toBe(true);

    const selfAfter = await prisma.notification.findUnique({
      where: { id: selfNotif.id }
    });
    const otherAfter = await prisma.notification.findUnique({
      where: { id: otherNotif.id }
    });

    expect(selfAfter?.isRead).toBe(true);
    expect(otherAfter?.isRead).toBe(false);
  });
});
