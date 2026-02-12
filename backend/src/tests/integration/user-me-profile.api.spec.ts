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
    await prisma.user.deleteMany({
      where: { id: userId }
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
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: userId }
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
});

