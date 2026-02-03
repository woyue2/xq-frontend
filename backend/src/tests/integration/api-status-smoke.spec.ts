import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { signAccessToken } from '../../utils/jwt';

describe('API status code smoke test', () => {
  const app = createApp();

  const studentId = 'status_student_001';
  const studentToken = signAccessToken({
    sub: studentId,
    role: 'student'
  });

  const teacherId = 'status_teacher_001';
  const teacherToken = signAccessToken({
    sub: teacherId,
    role: 'teacher'
  });

  beforeAll(async () => {
    // 清理并准备最小测试数据，避免影响其他集成测试
    await prisma.behaviorLog.deleteMany();
    await prisma.loginLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.like.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.create({
      data: {
        id: studentId,
        phone: '13900000999',
        nickname: '状态码学生',
        role: 'student',
        isActive: true,
        isBanned: false
      }
    });

    await prisma.user.create({
      data: {
        id: teacherId,
        phone: '13900001000',
        nickname: '状态码教师',
        role: 'teacher',
        isActive: true,
        isBanned: false
      }
    });
  });

  it('GET /health should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('POST /api/auth/send-code should return 200 and code=200 for existing user', async () => {
    const res = await request(app)
      .post('/api/auth/send-code')
      .send({ phone: '13900000999', type: 'login' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  it('POST /api/questions should return 201 and code=201', async () => {
    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: '状态码冒烟测试问题',
        content: '内容'
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
  });

  it('GET /api/questions should return 200 and code=200', async () => {
    const res = await request(app)
      .get('/api/questions')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  it('GET /api/users/me should return 200 and code=200', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  it('POST /api/behavior/log should return 200 and code=200', async () => {
    const res = await request(app)
      .post('/api/behavior/log')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        type: 'page_view',
        timestamp: Date.now(),
        metadata: { path: '/home' }
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  it('POST /api/interactions/like should return 200 and code=200', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-status-like-001',
        title: '状态码测试问题',
        content: '内容',
        subject: 'math',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 0,
        authorId: studentId,
        authorName: '状态码学生'
      }
    });

    const res = await request(app)
      .post('/api/interactions/like')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        targetType: 'question',
        targetId: question.id,
        action: 'like'
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  it('GET /api/admin/whitelist should return 200 and code=200', async () => {
    const res = await request(app)
      .get('/api/admin/whitelist')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  it('GET /api/admin/class-hours/:userId should return 200 and code=200', async () => {
    const res = await request(app)
      .get(`/api/admin/class-hours/${studentId}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  it('GET /api/notifications should return 200 and code=200', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  it('GET /api/notifications/unread-count should return 200 and code=200', async () => {
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  it('GET /api/upload/signature (image) should return 200 and code=200', async () => {
    const res = await request(app)
      .get('/api/upload/signature?type=image')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  it('GET /api/upload/signature (audio by teacher) should return 200 and code=200', async () => {
    const res = await request(app)
      .get('/api/upload/signature?type=audio')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });

  it('GET /api/admin/audit/pending should return 200 and code=200', async () => {
    const res = await request(app)
      .get('/api/admin/audit/pending?type=question')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });
});
