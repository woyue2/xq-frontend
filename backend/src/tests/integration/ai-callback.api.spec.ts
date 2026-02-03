import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { env } from '../../config/env';

describe('AI Callback API', () => {
  const app = createApp();

  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
  });

  it('should reject unauthorized access when internal token is configured', async () => {
    // 如果未配置 AI_INTERNAL_TOKEN，则跳过本用例
    if (!env.AI_INTERNAL_TOKEN) {
      return;
    }

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

    const reqAgent = request(app).post('/api/internal/ai-check');
    const reqWithAuth = env.AI_INTERNAL_TOKEN
      ? reqAgent.set('X-Internal-Token', env.AI_INTERNAL_TOKEN)
      : reqAgent;

    const res = await reqWithAuth
      .send({
        targetType: 'question',
        targetId: q.id,
        result: {
          safe: true,
          score: 0.98,
          labels: ['math']
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.targetId).toBe(q.id);

    const updated = await prisma.question.findUnique({
      where: { id: q.id }
    });
    expect(updated?.status).toBe('approved');
  });

  it('should reject answer when AI marks it unsafe', async () => {
    const q = await prisma.question.create({
      data: {
        id: 'q-ai-002',
        title: '待审核问题-回答',
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
        authorId: 'user-001',
        authorName: '作者'
      }
    });

    const answer = await prisma.answer.create({
      data: {
        id: 'ans-ai-001',
        questionId: q.id,
        content: '待审核回答',
        images: [],
        authorId: 'teacher-001',
        authorName: '老师',
        status: 'pending',
        likes: 0
      }
    });

    const reqAgent = request(app).post('/api/internal/ai-check');
    const reqWithAuth = env.AI_INTERNAL_TOKEN
      ? reqAgent.set('X-Internal-Token', env.AI_INTERNAL_TOKEN)
      : reqAgent;

    const res = await reqWithAuth
      .send({
        targetType: 'answer',
        targetId: answer.id,
        result: {
          safe: false,
          score: 0.1,
          labels: ['unsafe']
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.targetId).toBe(answer.id);

    const updated = await prisma.answer.findUnique({
      where: { id: answer.id }
    });
    expect(updated?.status).toBe('rejected');
  });

  it('should reject comment when AI marks it unsafe', async () => {
    const q = await prisma.question.create({
      data: {
        id: 'q-ai-003',
        title: '待审核问题-评论',
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
        authorId: 'user-001',
        authorName: '作者'
      }
    });

    const comment = await prisma.comment.create({
      data: {
        id: 'cmt-ai-001',
        questionId: q.id,
        content: '待审核评论',
        authorId: 'user-002',
        authorName: '评论者',
        status: 'pending'
      }
    });

    const reqAgent = request(app).post('/api/internal/ai-check');
    const reqWithAuth = env.AI_INTERNAL_TOKEN
      ? reqAgent.set('X-Internal-Token', env.AI_INTERNAL_TOKEN)
      : reqAgent;

    const res = await reqWithAuth
      .send({
        targetType: 'comment',
        targetId: comment.id,
        result: {
          safe: false,
          score: 0.2,
          labels: ['unsafe']
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.targetId).toBe(comment.id);

    const updated = await prisma.comment.findUnique({
      where: { id: comment.id }
    });
    expect(updated?.status).toBe('rejected');
  });

  it('should return 400 for invalid payload', async () => {
    const reqAgent = request(app).post('/api/internal/ai-check');
    const reqWithAuth = env.AI_INTERNAL_TOKEN
      ? reqAgent.set('X-Internal-Token', env.AI_INTERNAL_TOKEN)
      : reqAgent;

    const res = await reqWithAuth
      .send({
        targetId: 'missing-type',
        result: {}
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when result is missing or not an object', async () => {
    const reqAgent = request(app).post('/api/internal/ai-check');
    const reqWithAuth = env.AI_INTERNAL_TOKEN
      ? reqAgent.set('X-Internal-Token', env.AI_INTERNAL_TOKEN)
      : reqAgent;

    const res = await reqWithAuth.send({
      targetType: 'question',
      targetId: 'q-missing-result',
      result: null
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for unsupported targetType', async () => {
    const reqAgent = request(app).post('/api/internal/ai-check');
    const reqWithAuth = env.AI_INTERNAL_TOKEN
      ? reqAgent.set('X-Internal-Token', env.AI_INTERNAL_TOKEN)
      : reqAgent;

    const res = await reqWithAuth
      .send({
        targetType: 'unknown',
        targetId: 'any-id',
        result: {
          safe: true
        }
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.error).toBe('INVALID_CONTENT_TYPE');
  });
});
