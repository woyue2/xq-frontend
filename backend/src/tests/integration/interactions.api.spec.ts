import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { signAccessToken } from '../../utils/jwt';

describe('Interactions API (/api/interactions)', () => {
  const app = createApp();

  const studentId = 'interactions_student_001';
  const studentToken = signAccessToken({
    sub: studentId,
    role: 'student'
  });

  beforeEach(async () => {
    await prisma.like.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.question.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.create({
      data: {
        id: studentId,
        phone: '13900000099',
        nickname: '互动学生',
        role: 'student',
        isActive: true,
        isBanned: false
      }
    });
  });

  it('should like and unlike question via /api/interactions/like', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-interaction-like-001',
        title: '互动点赞问题',
        content: '问题内容',
        subject: 'math',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 10,
        favorites: 0,
        comments: 0,
        answers: 0,
        authorId: studentId,
        authorName: '互动学生'
      }
    });

    // like
    const likeRes = await request(app)
      .post('/api/interactions/like')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        targetType: 'question',
        targetId: question.id,
        action: 'like'
      });

    expect(likeRes.status).toBe(200);
    expect(likeRes.body.code).toBe(200);
    expect(likeRes.body.data.liked).toBe(true);
    expect(typeof likeRes.body.data.likesCount).toBe('number');

    // unlike
    const unlikeRes = await request(app)
      .post('/api/interactions/like')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        targetType: 'question',
        targetId: question.id,
        action: 'unlike'
      });

    expect(unlikeRes.status).toBe(200);
    expect(unlikeRes.body.code).toBe(200);
    expect(unlikeRes.body.data.liked).toBe(false);
  });

  it('should favorite and unfavorite question via /api/interactions/favorite', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-interaction-fav-001',
        title: '互动收藏问题',
        content: '问题内容',
        subject: 'math',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 5,
        comments: 0,
        answers: 0,
        authorId: studentId,
        authorName: '互动学生'
      }
    });

    // favorite
    const favRes = await request(app)
      .post('/api/interactions/favorite')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        questionId: question.id,
        action: 'favorite'
      });

    expect(favRes.status).toBe(200);
    expect(favRes.body.code).toBe(200);
    expect(favRes.body.data.favorited).toBe(true);
    expect(typeof favRes.body.data.favoritesCount).toBe('number');

    // unfavorite
    const unfavRes = await request(app)
      .post('/api/interactions/favorite')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        questionId: question.id,
        action: 'unfavorite'
      });

    expect(unfavRes.status).toBe(200);
    expect(unfavRes.body.code).toBe(200);
    expect(unfavRes.body.data.favorited).toBe(false);
  });

  it('should validate required fields for like endpoint', async () => {
    const res = await request(app)
      .post('/api/interactions/like')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('should reject unsupported targetType', async () => {
    const res = await request(app)
      .post('/api/interactions/like')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        targetType: 'answer',
        targetId: 'a-1',
        action: 'like'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('UNSUPPORTED_TARGET_TYPE');
  });
});

