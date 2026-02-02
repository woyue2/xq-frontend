import request from 'supertest';
import { createApp } from '../../app';
import { signAccessToken } from '../../utils/jwt';
import { prisma } from '../../config/database';

describe('Question API', () => {
  const app = createApp();

  const studentToken = signAccessToken({
    sub: 'student_001',
    role: 'student'
  });

  const expiredStudentToken = signAccessToken({
    sub: 'student_expired_001',
    role: 'student'
  });

  const parentToken = signAccessToken({
    sub: 'parent_001',
    role: 'parent'
  });

  beforeEach(async () => {
    // 确保测试用到的用户在数据库中存在，避免会员校验时报 USER_NOT_FOUND
    await prisma.user.deleteMany();
    await prisma.userWhitelist.deleteMany();

    await prisma.user.createMany({
      data: [
        {
          id: 'student_001',
          phone: '13900000001',
          nickname: '测试学生',
          role: 'student',
          isActive: true,
          isBanned: false
        },
        {
          id: 'student_expired_001',
          phone: '13900000003',
          nickname: '过期学生',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      ]
    });

    await prisma.user.create({
      data: {
        id: 'parent_001',
        phone: '13900000002',
        nickname: '测试家长',
        role: 'parent',
        isActive: true,
        isBanned: false
      }
    });

    await prisma.question.deleteMany();
  });

  // Q-API-001 正常创建问题（简化版本，不依赖真实 AI 审核）
  it('should create question successfully (Q-API-001)', async () => {
    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: '如何理解二次函数的顶点公式？',
        content:
          '老师讲了配方法，但我还是不太理解，能详细解释一下吗？',
        images: [
          'https://cdn.example.com/images/xxx.jpg',
          'https://cdn.example.com/images/yyy.jpg'
        ],
        tags: ['二次函数', '配方法'],
        difficulty: 'medium'
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    expect(res.body.message).toBe('问题提交成功，等待审核');
    expect(res.body.data.title).toBe(
      '如何理解二次函数的顶点公式？'
    );
    expect(res.body.data.status).toBe('pending');
  });

  // Q-API-002 标题超长
  it('should reject too long title (Q-API-002)', async () => {
    const longTitle = '超'.repeat(120);

    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: longTitle,
        content: '问题内容'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('TITLE_TOO_LONG');
  });

  // Q-API-003 家长无权限提问
  it('should forbid parent to create question (Q-API-003)', async () => {
    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        title: '家长想提问',
        content: '家长无提问权限用例'
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PERMISSION_DENIED');
  });

  // Q-API-004 课时过期学生无法提问
  it('should forbid expired student from creating question (Q-API-004)', async () => {
    // 为过期学生配置过期课时
    await prisma.userWhitelist.create({
      data: {
        phone: '13900000003',
        name: '过期学生',
        role: 'student',
        validUntil: new Date('2025-12-31T23:59:59.999Z'),
        isRegistered: true
      }
    });

    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${expiredStudentToken}`)
      .send({
        title: '过期学生提问',
        content: '不应允许提问'
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('MEMBER_EXPIRED');
  });

  // Q-API-005 正常查询列表（approved 列表）
  it('should list approved questions with pagination (Q-API-005)', async () => {
    await prisma.question.createMany({
      data: [
        {
          id: 'q-001',
          title: '二次函数问题',
          content: '问题内容...',
          subject: 'math',
          tags: ['二次函数'],
          difficulty: 'medium',
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 45,
          favorites: 12,
          comments: 8,
          answers: 3,
          authorId: 'user-001',
          authorName: '小明同学'
        },
        {
          id: 'q-002',
          title: '待审核问题',
          content: 'pending...',
          subject: 'math',
          tags: [],
          difficulty: 'easy',
          status: 'pending',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: 'user-002',
          authorName: '其他同学'
        }
      ]
    });

    const res = await request(app)
      .get('/api/questions?page=1&pageSize=20&status=approved&sort=newest')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);
    expect(
      res.body.data.list.every((q: any) => q.status === 'approved')
    ).toBe(true);
    expect(res.body.data.pagination.page).toBe(1);
  });

  // Q-API-006 筛选好问题
  it('should filter good questions (Q-API-006)', async () => {
    await prisma.question.createMany({
      data: [
        {
          id: 'q-good',
          title: '好问题示例',
          content: '内容',
          subject: 'math',
          tags: ['二次函数'],
          difficulty: 'medium',
          status: 'approved',
          isGoodQuestion: true,
          isPinned: false,
          likes: 89,
          favorites: 34,
          comments: 0,
          answers: 0,
          authorId: 'user-001',
          authorName: '小明同学'
        },
        {
          id: 'q-normal',
          title: '普通问题',
          content: '内容',
          subject: 'math',
          tags: ['二次函数'],
          difficulty: 'medium',
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 1,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: 'user-002',
          authorName: '其他同学'
        }
      ]
    });

    const res = await request(app)
      .get('/api/questions?isGoodQuestion=true')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(
      res.body.data.list.every((q: any) => q.isGoodQuestion === true)
    ).toBe(true);
  });

  // Q-API-007 按标签筛选
  it('should filter questions by tags (Q-API-007)', async () => {
    await prisma.question.createMany({
      data: [
        {
          id: 'q-tags-1',
          title: '二次函数配方法',
          content: '内容',
          subject: 'math',
          tags: ['二次函数', '配方法'],
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: 'user-001',
          authorName: '小明同学'
        },
        {
          id: 'q-tags-2',
          title: '其他问题',
          content: '内容',
          subject: 'math',
          tags: ['一次函数'],
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: 'user-002',
          authorName: '其他同学'
        }
      ]
    });

    const res = await request(app)
      .get(encodeURI('/api/questions?tags=二次函数,配方法'))
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(
      res.body.data.list.every((q: any) =>
        (q.tags || []).some((t: string) => ['二次函数', '配方法'].includes(t))
      )
    ).toBe(true);
  });

  // Q-API-010 按作者查询时返回该作者的所有状态问题
  it('should list all questions for given authorId regardless of status (Q-API-010)', async () => {
    await prisma.question.createMany({
      data: [
        {
          id: 'q-author-1',
          title: '作者问题 pending',
          content: '内容',
          subject: 'math',
          tags: [],
          difficulty: 'easy',
          status: 'pending',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: 'student_001',
          authorName: '测试学生'
        },
        {
          id: 'q-author-2',
          title: '作者问题 approved',
          content: '内容',
          subject: 'math',
          tags: [],
          difficulty: 'medium',
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: 'student_001',
          authorName: '测试学生'
        },
        {
          id: 'q-author-other',
          title: '其他作者问题',
          content: '内容',
          subject: 'math',
          tags: [],
          difficulty: 'easy',
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: 'someone_else',
          authorName: '其他同学'
        }
      ]
    });

    const res = await request(app)
      .get('/api/questions?authorId=student_001')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.list.length).toBe(2);
    expect(
      res.body.data.list.every(
        (q: any) =>
          q.authorId === 'student_001' &&
          (q.status === 'pending' || q.status === 'approved')
      )
    ).toBe(true);
  });

  // Q-API-008 查询问题详情
  it('should get question detail (Q-API-008)', async () => {
    const created = await prisma.question.create({
      data: {
        id: 'q-detail-1',
        title: '二次函数问题',
        content: '详细内容...',
        subject: 'math',
        tags: ['二次函数'],
        difficulty: 'medium',
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 45,
        favorites: 12,
        comments: 8,
        answers: 3,
        authorId: 'user-001',
        authorName: '小明同学',
        authorAvatar: 'https://cdn.example.com/avatars/xxx.jpg'
      }
    });

    // 当前学生对该问题点赞并收藏（如已存在则跳过）
    await prisma.like.upsert({
      where: {
        userId_targetType_targetId: {
          userId: 'student_001',
          targetType: 'question',
          targetId: created.id
        }
      },
      create: {
        userId: 'student_001',
        targetType: 'question',
        targetId: created.id
      },
      update: {}
    });

    await prisma.favorite.upsert({
      where: {
        userId_questionId: {
          userId: 'student_001',
          questionId: created.id
        }
      },
      create: {
        userId: 'student_001',
        questionId: created.id
      },
      update: {}
    });

    const res = await request(app)
      .get(`/api/questions/${created.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.id).toBe(created.id);
    expect(res.body.data.title).toBe('二次函数问题');
    expect(res.body.data.authorName).toBe('小明同学');
    expect(res.body.data.isLiked).toBe(true);
    expect(res.body.data.isFavorited).toBe(true);
  });

  // Q-API-009 问题不存在
  it('should return 404 when question not found (Q-API-009)', async () => {
    const res = await request(app)
      .get('/api/questions/non-exist-id')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('QUESTION_NOT_FOUND');
  });
});
