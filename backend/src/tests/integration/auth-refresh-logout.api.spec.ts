import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';

describe('Auth API - refresh & logout', () => {
  const app = createApp();

  // 用例：AUTH-API-012 正常刷新Token
  it('should refresh token with valid refresh token (AUTH-API-012)', async () => {
    // 修改原因：手机号必须满足 11 位格式，且避免固定号码冲突。
    const phone = `139${Date.now().toString().slice(-8)}`;

    // 准备登录所需用户
    const user = await prisma.user.create({
      data: {
        phone,
        nickname: '刷新Token用户',
        avatar: null,
        role: 'student',
        grade: '初三',
        age: 15,
        school: '刷新中学',
        isActive: true,
        isBanned: false
      }
    });
    // 修改原因：当前登录链路包含白名单校验，测试数据需补齐白名单才能通过正常登录流程。
    await prisma.userWhitelist.upsert({
      where: { phone },
      update: { role: 'student', deletedAt: null },
      create: {
        phone,
        name: '刷新Token用户',
        role: 'student',
        isRegistered: true
      }
    });

    // 修改原因：测试环境已改为随机验证码，登录前需通过真实 send-code 获取动态验证码。
    const sendCodeRes = await request(app)
      .post('/api/auth/send-code')
      .send({ phone, type: 'login' });

    expect(sendCodeRes.status).toBe(200);
    const loginCode = sendCodeRes.body?.data?.code as string;
    expect(loginCode).toMatch(/^\d{6}$/);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ phone, code: loginCode });

    expect(loginRes.status).toBe(200);

    const refreshToken = loginRes.body.data.refreshToken as string;

    const res = await request(app)
      .post('/api/auth/refresh-token')
      .set('Authorization', `Bearer ${refreshToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('Token刷新成功');
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.expiresIn).toBe(7 * 24 * 60 * 60);
  });

  // 用例：AUTH-API-013 RefreshToken过期/失效
  it('should return 401 when refresh token is invalid (AUTH-API-013)', async () => {
    const res = await request(app)
      .post('/api/auth/refresh-token')
      .set('Authorization', 'Bearer invalid.token.value');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('TOKEN_EXPIRED');
  });

  // 用例：AUTH-API-014 正常退出
  it('should logout successfully (AUTH-API-014)', async () => {
    // 修改原因：手机号必须满足 11 位格式，且避免固定号码冲突。
    const phone = `138${Date.now().toString().slice(-8)}`;

    await prisma.user.create({
      data: {
        phone,
        nickname: '退出用户',
        avatar: null,
        role: 'student',
        grade: '初二',
        age: 14,
        school: '退出中学',
        isActive: true,
        isBanned: false
      }
    });
    // 修改原因：当前登录链路包含白名单校验，测试数据需补齐白名单才能通过正常登录流程。
    await prisma.userWhitelist.upsert({
      where: { phone },
      update: { role: 'student', deletedAt: null },
      create: {
        phone,
        name: '退出用户',
        role: 'student',
        isRegistered: true
      }
    });

    // 修改原因：测试环境已改为随机验证码，登录前需通过真实 send-code 获取动态验证码。
    const sendCodeRes = await request(app)
      .post('/api/auth/send-code')
      .send({ phone, type: 'login' });

    expect(sendCodeRes.status).toBe(200);
    const loginCode = sendCodeRes.body?.data?.code as string;
    expect(loginCode).toMatch(/^\d{6}$/);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ phone, code: loginCode });

    expect(loginRes.status).toBe(200);

    const token = loginRes.body.data.token as string;

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('退出成功');
  });
});
