import request from 'supertest';
import { createApp } from '../../app';
import { env } from '../../config/env';
import jwt from 'jsonwebtoken';

describe('Permission & Auth API (PERM-API-001~003)', () => {
  const app = createApp();

  it('PERM-API-001: should return UNAUTHORIZED when Authorization header is missing', async () => {
    const res = await request(app).get('/api/users/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
    expect(res.body.code).toBe(401);
    expect(res.body.message).toBe('未登录');
  });

  it('PERM-API-002: should return UNAUTHORIZED when token format is invalid', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid_token_format');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
    expect(res.body.code).toBe(401);
    expect(res.body.message).toBe('认证失败');
  });

  it('PERM-API-003: should return TOKEN_EXPIRED when token is expired', async () => {
    // 构造一个已过期的访问令牌（exp 在当前时间之前）
    const expiredToken = jwt.sign(
      {
        sub: 'perm_expired_user_001',
        role: 'student',
        type: 'access',
        exp: Math.floor(Date.now() / 1000) - 60
      },
      env.JWT_SECRET
    );

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('TOKEN_EXPIRED');
    expect(res.body.code).toBe(401);
    expect(res.body.message).toBe('登录已过期，请重新登录');
  });
});

