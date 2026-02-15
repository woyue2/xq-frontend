import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { signAccessToken } from '../../utils/jwt';
import { AppError } from '../../errors/AppError';

describe('UserMe Profile API', () => {
  const app = createApp();

  const userId = 'user_me_profile_001';
  const token = signAccessToken({
    sub: userId,
    role: 'student'
  });

  beforeAll(async () => {
    await prisma.verificationCode.deleteMany({
      where: { phone: { in: ['13900007777', '13900008888'] } }
    });
    await prisma.userWhitelist.deleteMany({
      where: { phone: { in: ['13900007777', '13900008888'] } }
    });
    await prisma.user.deleteMany({
      where: { OR: [{ id: userId }, { phone: '13900008888' }] }
    });

    await prisma.user.create({
      data: {
        id: userId,
        phone: '13900007777',
        nickname: '用户资料',
        role: 'student',
        isActive: true,
        isBanned: false
      }
    });

    await prisma.userWhitelist.create({
      data: {
        phone: '13900007777',
        name: '用户资料',
        role: 'student',
        userId,
        isRegistered: true
      }
    });
  });

  afterAll(async () => {
    await prisma.verificationCode.deleteMany({
      where: { phone: { in: ['13900007777', '13900008888'] } }
    });
    await prisma.userWhitelist.deleteMany({
      where: { phone: { in: ['13900007777', '13900008888'] } }
    });
    await prisma.user.deleteMany({
      where: { OR: [{ id: userId }, { phone: '13900008888' }] }
    });
  });

  it('should reject invalid age type when updating profile', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        age: 'not-a-number'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PARAMS');
  });

  it('should update profile when payload is valid', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nickname: '新昵称',
        age: 16,
        school: '测试中学'
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.nickname).toBe('新昵称');
    expect(res.body.data.age).toBe(16);
    expect(res.body.data.school).toBe('测试中学');
  });

  it('should change phone when code is valid', async () => {
    await prisma.verificationCode.create({
      data: {
        phone: '13900008888',
        code: '654321',
        type: 'change_phone',
        expireAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });

    const res = await request(app)
      .post('/api/users/me/change-phone')
      .set('Authorization', `Bearer ${token}`)
      .send({
        newPhone: '13900008888',
        code: '654321'
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.phone).toBe('13900008888');

    const dbUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    expect(dbUser?.phone).toBe('13900008888');

    const usedCode = await prisma.verificationCode.findFirst({
      where: {
        phone: '13900008888',
        type: 'change_phone'
      },
      orderBy: { createdAt: 'desc' }
    });
    expect(usedCode?.used).toBe(true);
  });

  it('should reject change phone when code is invalid', async () => {
    const res = await request(app)
      .post('/api/users/me/change-phone')
      .set('Authorization', `Bearer ${token}`)
      .send({
        newPhone: '13900007777',
        code: '000000'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_CODE');
  });
});

