import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { signAccessToken } from '../../utils/jwt';

describe('Like & Favorite API', () => {
  const app = createApp();

  const studentToken = signAccessToken({
    sub: 'student_001',
    role: 'student'
  });

  const expiredStudentToken = signAccessToken({
    sub: 'student_expired_like_001',
    role: 'student'
  });

  const parentToken = signAccessToken({
    sub: 'parent_like_001',
    role: 'parent'
  });

  beforeEach(async () => {
    await prisma.behaviorLog.deleteMany();
    await prisma.like.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
    await prisma.user.deleteMany();
    await prisma.userWhitelist.deleteMany();

    await prisma.user.createMany({
      data: [
        {
          id: 'student_001',
          phone: '13900000031',
          nickname: '测试学生',
          role: 'student',
          isActive: true,
          isBanned: false
        },
        {
          id: 'student_expired_like_001',
          phone: '13900000032',
          nickname: '过期学生',
          role: 'student',
          isActive: true,
          isBanned: false
        },
        {
          id: 'parent_like_001',
          phone: '13900000033',
          nickname: '测试家长',
          role: 'parent',
          isActive: true,
          isBanned: false
        }
      ]
    });
  });

  // L-API-001 点赞问题
  it('should like question (L-API-001)', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-like-001',
        title: '点赞的问题',
        content: '问题内容',
        subject: 'math',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 45,
        favorites: 12,
        comments: 0,
        answers: 0,
        authorId: 'student_001',
        authorName: '测试学生'
      }
    });

    const res = await request(app)
      .post(`/api/questions/${question.id}/like`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('点赞成功');
    expect(res.body.data.questionId).toBe(question.id);
    expect(res.body.data.isLiked).toBe(true);

    const updatedQuestion = await prisma.question.findUnique({
      where: { id: question.id }
    });
    expect(updatedQuestion?.likes).toBe(46);

    const likeRecord = await prisma.like.findUnique({
      where: {
        userId_targetType_targetId: {
          userId: 'student_001',
          targetType: 'question',
          targetId: question.id
        }
      }
    });
    expect(likeRecord).not.toBeNull();
  });

  // L-API-002 取消点赞
  it('should unlike question (L-API-002)', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-like-002',
        title: '点赞的问题',
        content: '问题内容',
        subject: 'math',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 46,
        favorites: 12,
        comments: 0,
        answers: 0,
        authorId: 'student_001',
        authorName: '测试学生'
      }
    });

    await prisma.like.create({
      data: {
        userId: 'student_001',
        targetType: 'question',
        targetId: question.id
      }
    });

    const res = await request(app)
      .post(`/api/questions/${question.id}/like`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('取消点赞');
    expect(res.body.data.isLiked).toBe(false);

    const updatedQuestion = await prisma.question.findUnique({
      where: { id: question.id }
    });
    expect(updatedQuestion?.likes).toBe(45);
  });

  // F-API-001 收藏问题
  it('should favorite question (F-API-001)', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-fav-001',
        title: '收藏的问题',
        content: '问题内容',
        subject: 'math',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 45,
        favorites: 12,
        comments: 0,
        answers: 0,
        authorId: 'student_001',
        authorName: '测试学生'
      }
    });

    const res = await request(app)
      .post(`/api/questions/${question.id}/favorite`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('收藏成功');
    expect(res.body.data.isFavorited).toBe(true);

    const updatedQuestion = await prisma.question.findUnique({
      where: { id: question.id }
    });
    expect(updatedQuestion?.favorites).toBe(13);
  });

  // F-API-002 取消收藏
  it('should unfavorite question (F-API-002)', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-fav-002',
        title: '收藏的问题',
        content: '问题内容',
        subject: 'math',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 45,
        favorites: 13,
        comments: 0,
        answers: 0,
        authorId: 'student_001',
        authorName: '测试学生'
      }
    });

    await prisma.favorite.create({
      data: {
        userId: 'student_001',
        questionId: question.id
      }
    });

    const res = await request(app)
      .post(`/api/questions/${question.id}/favorite`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('取消收藏');
    expect(res.body.data.isFavorited).toBe(false);

    const updatedQuestion = await prisma.question.findUnique({
      where: { id: question.id }
    });
    expect(updatedQuestion?.favorites).toBe(12);
  });

  // PERM-API-007 课时过期学生仍可点赞（权限降级为家长模式，只读 + 点赞/收藏）
  it('should allow expired student to like question (PERM-API-007)', async () => {
    // 为过期学生配置过期课时（与 Question API 中的 Q-API-004 逻辑保持一致）
    await prisma.userWhitelist.create({
      data: {
        phone: '13900000032',
        name: '过期学生',
        role: 'student',
        validUntil: new Date('2025-12-31T23:59:59.999Z'),
        isRegistered: true
      }
    });

    const question = await prisma.question.create({
      data: {
        id: 'q-perm-like-001',
        title: '过期学生点赞的问题',
        content: '问题内容',
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

    const res = await request(app)
      .post(`/api/questions/${question.id}/like`)
      .set('Authorization', `Bearer ${expiredStudentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('点赞成功');
    // 兼容 data 结构（旧版为 { isLiked }, 新版为 { liked }）
    const likedFlag = res.body.data?.isLiked ?? res.body.data?.liked;
    expect(likedFlag).toBe(true);
  });

  // UL-API-001 查询我的点赞列表
  it('should list my liked questions (UL-API-001)', async () => {
    const q1 = await prisma.question.create({
      data: {
        id: 'q-like-list-1',
        title: '问题标题',
        content: '问题内容...',
        subject: 'math',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 45,
        favorites: 12,
        comments: 0,
        answers: 3,
        authorId: 'student_001',
        authorName: '测试学生'
      }
    });

    await prisma.like.create({
      data: {
        userId: 'student_001',
        targetType: 'question',
        targetId: q1.id
      }
    });

    const res = await request(app)
      .get('/api/users/me/likes?page=1&pageSize=20')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.list[0].id).toBe(q1.id);
  });

  // UF-API-001 查询我的收藏列表
  it('should list my favorite questions (UF-API-001)', async () => {
    const q = await prisma.question.create({
      data: {
        id: 'q-fav-list-1',
        title: '收藏的问题',
        content: '问题内容...',
        subject: 'math',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 67,
        favorites: 23,
        comments: 0,
        answers: 4,
        authorId: 'student_001',
        authorName: '测试学生'
      }
    });

    await prisma.favorite.create({
      data: {
        userId: 'student_001',
        questionId: q.id
      }
    });

    const res = await request(app)
      .get('/api/users/me/favorites?page=1&pageSize=20')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.list[0].id).toBe(q.id);
  });

  it('should list parent liked questions similar to student (UL-API-001-PARENT)', async () => {
    const q = await prisma.question.create({
      data: {
        id: 'q-like-parent-1',
        title: '家长点赞的问题',
        content: '问题内容...',
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

    await prisma.like.create({
      data: {
        userId: 'parent_like_001',
        targetType: 'question',
        targetId: q.id
      }
    });

    const res = await request(app)
      .get('/api/users/me/likes?page=1&pageSize=20')
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.list[0].id).toBe(q.id);
  });

  it('should list parent favorite questions similar to student (UF-API-001-PARENT)', async () => {
    const q = await prisma.question.create({
      data: {
        id: 'q-fav-parent-1',
        title: '家长收藏的问题',
        content: '问题内容...',
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

    await prisma.favorite.create({
      data: {
        userId: 'parent_like_001',
        questionId: q.id
      }
    });

    const res = await request(app)
      .get('/api/users/me/favorites?page=1&pageSize=20')
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.list[0].id).toBe(q.id);
  });
});
