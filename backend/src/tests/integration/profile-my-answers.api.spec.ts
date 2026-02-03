import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { signAccessToken } from '../../utils/jwt';

describe('Profile My Answers API', () => {
  const app = createApp();

  const teacherId = 'profile_teacher_001';
  const teacherToken = signAccessToken({
    sub: teacherId,
    role: 'teacher'
  });

  beforeEach(async () => {
    await prisma.answer.deleteMany({
      where: { authorId: teacherId }
    });
    await prisma.user.deleteMany({
      where: { id: teacherId }
    });

    await prisma.user.create({
      data: {
        id: teacherId,
        phone: '13900006666',
        nickname: '我的回答老师',
        role: 'teacher',
        isActive: true,
        isBanned: false
      }
    });

    const q = await prisma.question.create({
      data: {
        title: '我的回答测试题目',
        content: '内容',
        subject: 'math',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 1,
        authorId: teacherId,
        authorName: '我的回答老师'
      }
    });

    await prisma.answer.create({
      data: {
        questionId: q.id,
        content: '老师的回答内容',
        images: [],
        audioUrl: null,
        authorId: teacherId,
        authorName: '我的回答老师',
        authorAvatar: null,
        likes: 0,
        status: 'approved'
      }
    });
  });

  afterAll(async () => {
    await prisma.answer.deleteMany({
      where: { authorId: teacherId }
    });
    await prisma.question.deleteMany({
      where: { authorId: teacherId }
    });
    await prisma.user.deleteMany({
      where: { id: teacherId }
    });
  });

  it('should return my answers with safe pagination defaults when page params invalid', async () => {
    const res = await request(app)
      .get('/api/profile/my-answers?page=-1&pageSize=1000')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalPages).toBeGreaterThanOrEqual(1);
  });
});

