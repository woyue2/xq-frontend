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

  const teacherToken = signAccessToken({
    sub: 'teacher_001',
    role: 'teacher'
  });

  const TEST_USER_IDS = [
    'student_001',
    'student_expired_001',
    'parent_001',
    'teacher_001'
  ];

  const TEST_USER_PHONES = [
    '13900000001',
    '13900000002',
    '13900000003',
    '13900000011'
  ];

  beforeEach(async () => {
    // 清理本文件中使用到的测试用户与相关白名单记录，避免污染其他数据
    await prisma.userWhitelist.deleteMany({
      where: {
        phone: {
          in: ['13900000003', '18888888888']
        }
      }
    });

    await prisma.loginLog.deleteMany();
    await prisma.refreshToken.deleteMany();

    await prisma.user.deleteMany({
      where: {
        id: {
          in: TEST_USER_IDS
        }
      }
    });

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
        },
        {
          id: 'parent_001',
          phone: '13900000002',
          nickname: '测试家长',
          role: 'parent',
          isActive: true,
          isBanned: false
        },
        {
          id: 'teacher_001',
          phone: '13900000011',
          nickname: '李老师',
          role: 'teacher',
          isActive: true,
          isBanned: false
        }
      ]
    });

    // 仅清理本测试文件中使用到的固定 ID 问题记录，避免误删其他测试或手工数据
    await prisma.question.deleteMany({
      where: {
        id: {
          in: [
            'q-001',
            'q-002',
            'q-good',
            'q-status-1',
            'q-status-2',
            'q-tags-1',
            'q-tags-2',
            'q-author-1',
            'q-author-2',
            'q-author-other',
            'q-count-1',
            'q-count-2',
            'q-count-3',
            'q-share-1',
            'q-share-2',
            'q-detail-1'
          ]
        }
      }
    });
  });

  afterAll(async () => {
    // 用例执行完成后，再次清理本文件创建的测试用户与白名单记录
    await prisma.userWhitelist.deleteMany({
      where: {
        phone: {
          in: ['13900000003', '18888888888']
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: TEST_USER_IDS
        }
      }
    });
  });

  // Q-API-001 学生正常创建问题（当前实现：通过 AI 审核后仍为 pending，等待人工复核）
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

  // Q-API-001T 教师创建问题应直接通过审核
  it('should auto-approve question created by teacher (Q-API-001T)', async () => {
    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: '老师发布的问题，不需要审核',
        content: '这是老师直接发布的问题，用于免审核验证',
        images: [],
        tags: ['老师提问'],
        difficulty: 'easy'
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    expect(res.body.data.status).toBe('approved');
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

  // Q-API-005P 非法分页参数应返回 400
  it('should return 400 when pagination params are invalid (Q-API-005P)', async () => {
    const res1 = await request(app)
      .get('/api/questions?page=0&pageSize=20')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res1.status).toBe(400);
    expect(res1.body.error).toBe('INVALID_PAGINATION');

    const res2 = await request(app)
      .get('/api/questions?page=1&pageSize=0')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res2.status).toBe(400);
    expect(res2.body.error).toBe('INVALID_PAGINATION');

    const res3 = await request(app)
      .get('/api/questions?page=abc&pageSize=20')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res3.status).toBe(400);
    expect(res3.body.error).toBe('INVALID_PAGINATION');
  });

  // Q-API-005K 关键字搜索（按标题/内容模糊匹配）
  it('should filter questions by keyword in title or content (Q-API-005K)', async () => {
    await prisma.question.createMany({
      data: [
        {
          id: 'q-search-1',
          title: '勾股定理基础练习',
          content: '这是一道关于勾股定理的入门题',
          subject: 'math',
          tags: ['勾股定理'],
          difficulty: 'easy',
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: 'user-001',
          authorName: '搜索同学A'
        },
        {
          id: 'q-search-2',
          title: '相似三角形综合题',
          content: '与勾股定理无关的题目内容',
          subject: 'math',
          tags: ['相似三角形'],
          difficulty: 'medium',
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: 'user-002',
          authorName: '搜索同学B'
        }
      ]
    });

    const res = await request(app)
      .get('/api/questions?page=1&pageSize=20&search=勾股定理')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);

    const titles: string[] = res.body.data.list.map((q: any) => q.title);
    expect(titles.some((t) => t.includes('勾股定理'))).toBe(true);
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

  // Q-API-010 按作者查询时返回该作者的所有状态问题（当前业务仅使用 pending/approved 两种状态）
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
    // 仅断言“至少包含该作者的两条记录”，避免被其他用例创建的同 authorId 数据干扰
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(2);
    expect(
      res.body.data.list.every(
        (q: any) =>
          q.authorId === 'student_001' &&
          (q.status === 'pending' || q.status === 'approved')
      )
    ).toBe(true);
  });

  // Q-API-010A 我的提问状态统计应返回服务端聚合结果（不受分页影响）
  it('should return my question status counts (Q-API-010A)', async () => {
    await prisma.question.createMany({
      data: [
        {
          id: 'q-count-1',
          title: '统计 pending',
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
          id: 'q-count-2',
          title: '统计 approved',
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
          id: 'q-count-3',
          title: '统计 rejected',
          content: '内容',
          subject: 'math',
          tags: [],
          difficulty: 'hard',
          status: 'rejected',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: 'student_001',
          authorName: '测试学生'
        }
      ]
    });

    const res = await request(app)
      .get('/api/questions/my-status-counts')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.pending).toBe(1);
    expect(res.body.data.approved).toBe(1);
    expect(res.body.data.rejected).toBe(1);
    expect(res.body.data.banned).toBe(0);
  });

  // Q-API-010B 登录用户可生成 1 小时分享链接
  it('should create question share link for authorized user (Q-API-010B)', async () => {
    const q = await prisma.question.create({
      data: {
        id: 'q-share-1',
        title: '可分享问题',
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
        authorId: 'student_001',
        authorName: '测试学生'
      }
    });

    const res = await request(app)
      .post(`/api/questions/${q.id}/share-link`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(typeof res.body.data.shareToken).toBe('string');
    expect(typeof res.body.data.expireAt).toBe('number');
  });

  // Q-API-010C 未登录用户可用有效分享 token 访问单题详情
  it('should allow guest viewing question detail with valid share token (Q-API-010C)', async () => {
    const q = await prisma.question.create({
      data: {
        id: 'q-share-1',
        title: '可分享问题',
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
        authorId: 'student_001',
        authorName: '测试学生'
      }
    });

    const shareRes = await request(app)
      .post(`/api/questions/${q.id}/share-link`)
      .set('Authorization', `Bearer ${studentToken}`);

    const shareToken = shareRes.body.data.shareToken as string;
    const res = await request(app).get(
      `/api/questions/${q.id}?shareToken=${encodeURIComponent(shareToken)}`
    );

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.id).toBe(q.id);
    expect(res.body.data.isSharedView).toBe(true);
  });

  // Q-API-010D 分享 token 只能访问绑定的问题
  it('should reject guest when share token is used for another question (Q-API-010D)', async () => {
    const [q1, q2] = await Promise.all([
      prisma.question.create({
        data: {
          id: 'q-share-1',
          title: '分享问题1',
          content: '内容1',
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
          authorId: 'student_001',
          authorName: '测试学生'
        }
      }),
      prisma.question.create({
        data: {
          id: 'q-share-2',
          title: '分享问题2',
          content: '内容2',
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
          authorId: 'student_001',
          authorName: '测试学生'
        }
      })
    ]);

    const shareRes = await request(app)
      .post(`/api/questions/${q1.id}/share-link`)
      .set('Authorization', `Bearer ${studentToken}`);
    const shareToken = shareRes.body.data.shareToken as string;

    const res = await request(app).get(
      `/api/questions/${q2.id}?shareToken=${encodeURIComponent(shareToken)}`
    );

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('SHARE_TOKEN_SCOPE_MISMATCH');
  });

  // Q-API-010E 未登录用户可用有效分享 token 查看该问题的回答与评论列表
  it('should allow guest listing answers/comments with valid share token (Q-API-010E)', async () => {
    const q = await prisma.question.create({
      data: {
        id: 'q-share-1',
        title: '分享问题含回答评论',
        content: '内容',
        subject: 'math',
        tags: [],
        difficulty: 'easy',
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 0,
        comments: 1,
        answers: 1,
        authorId: 'student_001',
        authorName: '测试学生'
      }
    });

    await prisma.answer.create({
      data: {
        questionId: q.id,
        content: '已通过回答',
        images: [],
        audioUrl: null,
        authorId: 'teacher_001',
        authorName: '李老师',
        likes: 0,
        status: 'approved'
      }
    });

    await prisma.comment.create({
      data: {
        questionId: q.id,
        content: '已通过评论',
        image: null,
        authorId: 'teacher_001',
        authorName: '李老师',
        status: 'approved'
      }
    });

    const shareRes = await request(app)
      .post(`/api/questions/${q.id}/share-link`)
      .set('Authorization', `Bearer ${studentToken}`);
    const shareToken = shareRes.body.data.shareToken as string;

    const [answersRes, commentsRes] = await Promise.all([
      request(app).get(
        `/api/questions/${q.id}/answers?shareToken=${encodeURIComponent(
          shareToken
        )}`
      ),
      request(app).get(
        `/api/questions/${q.id}/comments?shareToken=${encodeURIComponent(
          shareToken
        )}`
      )
    ]);

    expect(answersRes.status).toBe(200);
    expect(answersRes.body.code).toBe(200);
    expect(Array.isArray(answersRes.body.data.list)).toBe(true);

    expect(commentsRes.status).toBe(200);
    expect(commentsRes.body.code).toBe(200);
    expect(Array.isArray(commentsRes.body.data.list)).toBe(true);
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

  // Q-API-013 非作者且非教师无法查看未审核问题详情
  it('should forbid non-author non-teacher from viewing non-approved question detail (Q-API-013)', async () => {
    const pendingQuestion = await prisma.question.create({
      data: {
        id: 'q-detail-pending-1',
        title: '待审核问题详情',
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
      }
    });

    const res = await request(app)
      .get(`/api/questions/${pendingQuestion.id}`)
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PERMISSION_DENIED');
  });

  // Q-API-014 作者可以查看自己未审核的问题详情
  it('should allow author to view own non-approved question detail (Q-API-014)', async () => {
    const pendingQuestion = await prisma.question.create({
      data: {
        id: 'q-detail-pending-author-1',
        title: '作者待审核问题',
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
      }
    });

    const res = await request(app)
      .get(`/api/questions/${pendingQuestion.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.id).toBe(pendingQuestion.id);
    expect(res.body.data.status).toBe('pending');
  });

  // Q-API-015 教师可以查看任意未审核问题详情
  it('should allow teacher to view any non-approved question detail (Q-API-015)', async () => {
    const rejectedQuestion = await prisma.question.create({
      data: {
        id: 'q-detail-rejected-1',
        title: '被驳回问题',
        content: '内容',
        subject: 'math',
        tags: [],
        difficulty: 'easy',
        status: 'rejected',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 0,
        authorId: 'student_001',
        authorName: '测试学生'
      }
    });

    const res = await request(app)
      .get(`/api/questions/${rejectedQuestion.id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.id).toBe(rejectedQuestion.id);
    expect(res.body.data.status).toBe('rejected');
  });

  // Q-API-011 学生不能删除已通过问题；仅可删除未通过且无回答的问题
  it('should forbid student deleting approved question, allow pending without answers, and forbid when answers > 0 (Q-API-011)', async () => {
    // 学生自己的已通过且无回答问题（应禁止删除）
    const approvedNoAnswerQuestion = await prisma.question.create({
      data: {
        title: '已通过且无回答问题',
        content: '还没有回答',
        subject: 'math',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 0,
        authorId: 'student_001',
        authorName: '测试学生'
      }
    });

    const approvedForbiddenRes = await request(app)
      .delete(`/api/questions/${approvedNoAnswerQuestion.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(approvedForbiddenRes.status).toBe(403);
    expect(approvedForbiddenRes.body.error).toBe('PERMISSION_DENIED');

    const approvedStillThere = await prisma.question.findUnique({
      where: { id: approvedNoAnswerQuestion.id }
    });
    expect(approvedStillThere).not.toBeNull();

    // 学生自己的待审核且无回答问题（允许删除）
    const pendingNoAnswerQuestion = await prisma.question.create({
      data: {
        title: '待审核可删除问题',
        content: '还没有回答',
        subject: 'math',
        tags: [],
        status: 'pending',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 0,
        authorId: 'student_001',
        authorName: '测试学生'
      }
    });

    const okRes = await request(app)
      .delete(`/api/questions/${pendingNoAnswerQuestion.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(okRes.status).toBe(200);
    expect(okRes.body.code).toBe(200);

    const deleted = await prisma.question.findUnique({
      where: { id: pendingNoAnswerQuestion.id }
    });
    expect(deleted).toBeNull();

    // 学生自己的已有回答问题
    const answeredQuestion = await prisma.question.create({
      data: {
        title: '已有回答的问题',
        content: '已经有人回答了',
        subject: 'math',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 1,
        authorId: 'student_001',
        authorName: '测试学生'
      }
    });

    const forbiddenRes = await request(app)
      .delete(`/api/questions/${answeredQuestion.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error).toBe('PERMISSION_DENIED');

    const stillThere = await prisma.question.findUnique({
      where: { id: answeredQuestion.id }
    });
    expect(stillThere).not.toBeNull();
  });

  // Q-API-012 教师可以删除已有回答的问题
  it('should allow teacher to delete question even when answers > 0 (Q-API-012)', async () => {
    const question = await prisma.question.create({
      data: {
        title: '老师删除的问题',
        content: '已有回答由老师处理删除',
        subject: 'math',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 2,
        authorId: 'student_001',
        authorName: '测试学生'
      }
    });

    const res = await request(app)
      .delete(`/api/questions/${question.id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);

    const deleted = await prisma.question.findUnique({
      where: { id: question.id }
    });
    expect(deleted).toBeNull();
  });
});
