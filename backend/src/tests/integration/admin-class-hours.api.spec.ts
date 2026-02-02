import request from 'supertest';
import { createApp } from '../../app';
import { signAccessToken } from '../../utils/jwt';
import { prisma } from '../../config/database';

describe('Admin Class Hours API', () => {
  const app = createApp();

  const teacherToken = signAccessToken({
    sub: 'teacher_001',
    role: 'teacher'
  });

  beforeEach(async () => {
    await prisma.loginLog.deleteMany();
    await prisma.userWhitelist.deleteMany();
    await prisma.user.deleteMany();
  });

  // CH-API-001 正常查询
  it('should get class hours for active user (CH-API-001)', async () => {
    const phone = `1380013${Date.now()}`.slice(0, 11);

    const user = await prisma.user.create({
      data: {
        phone,
        nickname: '小明',
        avatar: null,
        role: 'student',
        isActive: true,
        isBanned: false
      }
    });

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 150);

    await prisma.userWhitelist.create({
      data: {
        phone: user.phone,
        name: '小明',
        role: 'student',
        validUntil,
        isRegistered: true,
        userId: user.id
      }
    });

    const res = await request(app)
      .get(`/api/admin/class-hours/${user.id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.userId).toBe(user.id);
    expect(res.body.data.phone).toBe(user.phone);
    expect(res.body.data.name).toBe('小明');
    expect(res.body.data.role).toBe('student');
    expect(res.body.data.isExpired).toBe(false);
    expect(res.body.data.status).toBe('active');
  });

  // CH-API-002 查询过期用户
  it('should get class hours for expired user (CH-API-002)', async () => {
    const phone = `1360013${Date.now()}`.slice(0, 11);

    const user = await prisma.user.create({
      data: {
        phone,
        nickname: '小红',
        avatar: null,
        role: 'student',
        isActive: true,
        isBanned: false
      }
    });

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() - 32);

    await prisma.userWhitelist.create({
      data: {
        phone: user.phone,
        name: '小红',
        role: 'student',
        validUntil,
        isRegistered: true,
        userId: user.id
      }
    });

    const res = await request(app)
      .get(`/api/admin/class-hours/${user.id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.isExpired).toBe(true);
    expect(res.body.data.status).toBe('expired');
  });

  // CH-API-003 批量延期
  it('should extend class hours in batch (CH-API-003)', async () => {
    const id1 = `user-001-${Date.now()}`;
    const id2 = `user-002-${Date.now()}`;
    const id3 = `user-003-${Date.now()}`;

    await prisma.user.create({
      data: {
        id: id1,
        phone: '13900139001',
        nickname: 'U1',
        role: 'student'
      }
    });

    await prisma.user.create({
      data: {
        id: id2,
        phone: '13900139002',
        nickname: 'U2',
        role: 'student'
      }
    });

    await prisma.user.create({
      data: {
        id: id3,
        phone: '13900139003',
        nickname: 'U3',
        role: 'student'
      }
    });

    const base = new Date('2026-06-30T23:59:59.999Z');

    await prisma.userWhitelist.createMany({
      data: [
        {
          phone: '13900139001',
          name: 'U1',
          role: 'student',
          validUntil: base,
          isRegistered: true
        },
        {
          phone: '13900139002',
          name: 'U2',
          role: 'student',
          validUntil: base,
          isRegistered: true
        },
        {
          phone: '13900139003',
          name: 'U3',
          role: 'student',
          validUntil: base,
          isRegistered: true
        }
      ]
    });

    const res = await request(app)
      .patch('/api/admin/class-hours/batch-update')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        userIds: [id1, id2, id3],
        action: 'extend',
        months: 3
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.successCount).toBe(3);
    expect(res.body.data.failedCount).toBe(0);
  });

  // CH-API-004 批量缩短
  it('should reduce class hours in batch (CH-API-004)', async () => {
    const userId = `user-004-${Date.now()}`;
    const phone = `1390013${Date.now()}`.slice(0, 11);

    await prisma.user.create({
      data: {
        id: userId,
        phone,
        nickname: 'U4',
        role: 'student'
      }
    });

    const base = new Date('2026-06-30T23:59:59.999Z');

    await prisma.userWhitelist.create({
      data: {
        phone,
        name: 'U4',
        role: 'student',
        validUntil: base,
        isRegistered: true
      }
    });

    const res = await request(app)
      .patch('/api/admin/class-hours/batch-update')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        userIds: [userId],
        action: 'reduce',
        months: 2
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.successCount).toBe(1);
  });
});
