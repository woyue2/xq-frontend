import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { signAccessToken } from '../../utils/jwt';

describe('UserMe Likes & Favorites API', () => {
  const app = createApp();

  const userId = 'user_me_lf_001';
  const token = signAccessToken({
    sub: userId,
    role: 'student'
  });

  beforeEach(async () => {
    await prisma.like.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.question.deleteMany({
      where: { authorId: userId }
    });
    await prisma.user.deleteMany({
      where: { id: userId }
    });

    await prisma.user.create({
      data: {
        id: userId,
        phone: '13900006666',
        nickname: 'LF用户',
        role: 'student',
        isActive: true,
        isBanned: false
      }
    });
  });

  it('should return 400 when likes pagination params are invalid', async () => {
    const res = await request(app)
      .get('/api/users/me/likes?page=0&pageSize=20')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PAGINATION');
  });

  it('should return 400 when favorites pagination params are invalid', async () => {
    const res = await request(app)
      .get('/api/users/me/favorites?page=1&pageSize=0')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PAGINATION');
  });

  it('should list liked and favorited questions with valid pagination', async () => {
    const q1 = await prisma.question.create({
      data: {
        title: 'LF问题1',
        content: '内容1',
        subject: 'math',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 0,
        authorId: userId,
        authorName: 'LF用户'
      }
    });

    await prisma.like.create({
      data: {
        userId,
        targetType: 'question',
        targetId: q1.id
      }
    });

    await prisma.favorite.create({
      data: {
        userId,
        questionId: q1.id
      }
    });

    const likesRes = await request(app)
      .get('/api/users/me/likes?page=1&pageSize=10')
      .set('Authorization', `Bearer ${token}`);

    expect(likesRes.status).toBe(200);
    expect(likesRes.body.code).toBe(200);
    expect(Array.isArray(likesRes.body.data.list)).toBe(true);

    const favsRes = await request(app)
      .get('/api/users/me/favorites?page=1&pageSize=10')
      .set('Authorization', `Bearer ${token}`);

    expect(favsRes.status).toBe(200);
    expect(favsRes.body.code).toBe(200);
    expect(Array.isArray(favsRes.body.data.list)).toBe(true);
  });
});

