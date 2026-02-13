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
  const studentToken = signAccessToken({
    sub: 'profile_student_001',
    role: 'student'
  });

  beforeEach(async () => {
    await prisma.like.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [teacherId, 'profile_student_001']
        }
      }
    });

    await prisma.user.createMany({
      data: [
        {
          id: teacherId,
          phone: '13900006666',
          nickname: '我的回答老师',
          role: 'teacher',
          isActive: true,
          isBanned: false
        },
        {
          id: 'profile_student_001',
          phone: '13900007777',
          nickname: '我的回答学生',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      ]
    });

    const answeredQuestion = await prisma.question.create({
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
        authorId: 'profile_student_001',
        authorName: '我的回答学生'
      }
    });

    await prisma.question.create({
      data: {
        title: '待老师作答题目',
        content: '待回答内容',
        subject: 'physics',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 3,
        favorites: 0,
        comments: 0,
        answers: 0,
        authorId: 'profile_student_001',
        authorName: '我的回答学生'
      }
    });

    await prisma.question.create({
      data: {
        title: '老师自己提问',
        content: '不应出现在待作答',
        subject: 'chemistry',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 0,
        authorId: teacherId,
        authorName: '我的回答老师'
      }
    });

    await prisma.answer.create({
      data: {
        questionId: answeredQuestion.id,
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
    await prisma.like.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [teacherId, 'profile_student_001']
        }
      }
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

  it('should return pending todo questions for teacher', async () => {
    const res = await request(app)
      .get('/api/profile/my-answer-todos')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].title).toBe('待老师作答题目');
  });

  it('should forbid non-teacher user from pending todo endpoint', async () => {
    const res = await request(app)
      .get('/api/profile/my-answer-todos')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PERMISSION_DENIED');
  });
});

