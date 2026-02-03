import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { signAccessToken } from '../../utils/jwt';

describe('Notification Read API', () => {
  const app = createApp();

  const userId = 'notif_read_user_001';
  const token = signAccessToken({
    sub: userId,
    role: 'student'
  });

  beforeEach(async () => {
    await prisma.notification.deleteMany({
      where: { userId }
    });
    await prisma.user.deleteMany({
      where: { id: userId }
    });

    await prisma.user.create({
      data: {
        id: userId,
        phone: '13900005555',
        nickname: '通知用户',
        role: 'student',
        isActive: true,
        isBanned: false
      }
    });

    await prisma.notification.createMany({
      data: [
        {
          userId,
          type: 'system',
          title: '系统通知1'
        },
        {
          userId,
          type: 'system',
          title: '系统通知2'
        }
      ]
    });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { userId }
    });
    await prisma.user.deleteMany({
      where: { id: userId }
    });
  });

  it('should reject empty ids array when marking notifications as read', async () => {
    const res = await request(app)
      .post('/api/notifications/read')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('should mark notifications as read when ids are valid', async () => {
    const existing = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });

    const ids = existing.map((n) => n.id);

    const res = await request(app)
      .post('/api/notifications/read')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.updatedCount).toBeGreaterThanOrEqual(1);

    const unread = await prisma.notification.count({
      where: { userId, isRead: false }
    });
    expect(unread).toBe(0);
  });
});

