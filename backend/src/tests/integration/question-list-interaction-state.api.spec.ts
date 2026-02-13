import request from 'supertest';
import { createApp } from '../../app';
import { signAccessToken } from '../../utils/jwt';
import { prisma } from '../../config/database';

describe('Question List Interaction State API', () => {
  const app = createApp();

  const studentToken = signAccessToken({
    sub: 'student_q_list_state_001',
    role: 'student'
  });

  const teacherToken = signAccessToken({
    sub: 'teacher_q_list_state_001',
    role: 'teacher'
  });

  const TEST_USER_IDS = ['student_q_list_state_001', 'teacher_q_list_state_001'];
  const TEST_QUESTION_ID = 'q-list-state-001';

  beforeEach(async () => {
    await prisma.favorite.deleteMany({
      where: {
        OR: [
          { userId: 'student_q_list_state_001' },
          { questionId: TEST_QUESTION_ID }
        ]
      }
    });

    await prisma.like.deleteMany({
      where: {
        OR: [
          { userId: 'student_q_list_state_001' },
          { targetId: TEST_QUESTION_ID }
        ]
      }
    });

    await prisma.question.deleteMany({
      where: { id: TEST_QUESTION_ID }
    });

    await prisma.user.deleteMany({
      where: {
        id: { in: TEST_USER_IDS }
      }
    });

    await prisma.user.createMany({
      data: [
        {
          id: 'student_q_list_state_001',
          phone: '13900009901',
          nickname: '列表状态学生',
          role: 'student',
          isActive: true,
          isBanned: false
        },
        {
          id: 'teacher_q_list_state_001',
          phone: '13900009902',
          nickname: '列表状态老师',
          role: 'teacher',
          isActive: true,
          isBanned: false
        }
      ]
    });

    await prisma.question.create({
      data: {
        id: TEST_QUESTION_ID,
        title: '列表交互状态验证题目',
        content: '用于验证 isLiked / isFavorited',
        subject: 'math',
        tags: ['测试'],
        difficulty: 'easy',
        authorId: 'teacher_q_list_state_001',
        authorName: '列表状态老师',
        status: 'approved',
        likes: 1,
        favorites: 1,
        comments: 0,
        answers: 0
      }
    });

    await prisma.like.create({
      data: {
        userId: 'student_q_list_state_001',
        targetType: 'question',
        targetId: TEST_QUESTION_ID
      }
    });

    await prisma.favorite.create({
      data: {
        userId: 'student_q_list_state_001',
        questionId: TEST_QUESTION_ID
      }
    });
  });

  afterAll(async () => {
    await prisma.favorite.deleteMany({
      where: {
        OR: [
          { userId: 'student_q_list_state_001' },
          { questionId: TEST_QUESTION_ID }
        ]
      }
    });

    await prisma.like.deleteMany({
      where: {
        OR: [
          { userId: 'student_q_list_state_001' },
          { targetId: TEST_QUESTION_ID }
        ]
      }
    });

    await prisma.question.deleteMany({
      where: { id: TEST_QUESTION_ID }
    });

    await prisma.user.deleteMany({
      where: {
        id: { in: TEST_USER_IDS }
      }
    });
  });

  it('should return isLiked and isFavorited for current user in question list', async () => {
    const res = await request(app)
      .get('/api/questions?page=1&pageSize=10')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(Array.isArray(res.body.data.list)).toBe(true);

    const target = res.body.data.list.find((q: any) => q.id === TEST_QUESTION_ID);
    expect(target).toBeDefined();
    expect(target.isLiked).toBe(true);
    expect(target.isFavorited).toBe(true);
  });
});

