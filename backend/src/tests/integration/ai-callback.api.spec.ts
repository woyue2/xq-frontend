import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { env } from '../../config/env';

const TEST_INTERNAL_TOKEN = 'test-internal-token-fixed';

describe('AI Callback API', () => {
  const app = createApp();
  let originalToken: string | undefined;

  beforeEach(async () => {
    // 强制注入测试 token，确保鉴权逻辑可测
    originalToken = env.AI_INTERNAL_TOKEN;
    (env as any).AI_INTERNAL_TOKEN = TEST_INTERNAL_TOKEN;

    await prisma.parentChild.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(() => {
    (env as any).AI_INTERNAL_TOKEN = originalToken;
  });

  const withToken = (agent: request.Test) =>
    agent.set('X-Internal-Token', TEST_INTERNAL_TOKEN);

  it('should reject unauthorized access when internal token is configured', async () => {
    const res = await request(app)
      .post('/api/internal/ai-check')
      .send({
        targetType: 'question',
        targetId: 'any-id',
        result: { safe: true }
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('INTERNAL_ACCESS_DENIED');
  });

  it('should approve question when AI marks it safe', async () => {
    await prisma.user.create({
      data: {
        id: 'user-001',
        phone: '13900009999',
        nickname: 'AI审核老师',
        role: 'teacher',
        isActive: true,
        isBanned: false
      }
    });

    const q = await prisma.question.create({
      data: {
        id: 'q-ai-001',
        title: '待审核问题',
        content: '内容',
        subject: 'math',
        tags: [],
        status: 'pending',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 0,
        authorId: 'user-001',
        authorName: '作者'
      }
    });

    const res = await withToken(request(app).post('/api/internal/ai-check'))
      .send({
        targetType: 'question',
        targetId: q.id,
        result: { safe: true }
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.targetId).toBe(q.id);
  });

  it('should reject answer when AI marks it unsafe', async () => {
    await prisma.user.create({
      data: {
        id: 'user-002',
        phone: '13900008888',
        nickname: '测试老师',
        role: 'teacher',
        isActive: true,
        isBanned: false
      }
    });

    const q = await prisma.question.create({
      data: {
        id: 'q-for-ans-001',
        title: '问题',
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
        authorId: 'user-002',
        authorName: '作者'
      }
    });

    const answer = await prisma.answer.create({
      data: {
        id: 'ans-ai-001',
        content: '回答内容',
        status: 'pending',
        authorId: 'user-002',
        authorName: '测试老师',
        questionId: q.id
      }
    });

    const res = await withToken(request(app).post('/api/internal/ai-check'))
      .send({
        targetType: 'answer',
        targetId: answer.id,
        result: { safe: false, reason: '含违规内容' }
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.targetId).toBe(answer.id);
  });

  it('should reject comment when AI marks it unsafe', async () => {
    await prisma.user.create({
      data: {
        id: 'user-003',
        phone: '13900007777',
        nickname: '测试学生',
        role: 'student',
        isActive: true,
        isBanned: false
      }
    });

    const q = await prisma.question.create({
      data: {
        id: 'q-for-cmt-001',
        title: '问题',
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
        authorId: 'user-003',
        authorName: '测试学生'
      }
    });

    const comment = await prisma.comment.create({
      data: {
        id: 'cmt-ai-001',
        content: '评论内容',
        status: 'pending',
        authorId: 'user-003',
        authorName: '测试学生',
        questionId: q.id
      }
    });

    const res = await withToken(request(app).post('/api/internal/ai-check'))
      .send({
        targetType: 'comment',
        targetId: comment.id,
        result: { safe: false, reason: '含违规内容' }
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.targetId).toBe(comment.id);
  });

  it('should return 400 for invalid payload', async () => {
    const res = await withToken(request(app).post('/api/internal/ai-check'))
      .send({
        targetType: 'wrong-type',
        result: {}
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when result is missing or not an object', async () => {
    const res = await withToken(request(app).post('/api/internal/ai-check'))
      .send({
        targetType: 'question',
        targetId: 'q-missing-result',
        result: null
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for unsupported targetType', async () => {
    const res = await withToken(request(app).post('/api/internal/ai-check'))
      .send({
        targetType: 'unknown',
        targetId: 'any-id',
        result: { safe: true }
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.error).toBe('INVALID_CONTENT_TYPE');
  });
});
