import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { signAccessToken } from '../../utils/jwt';

describe('Admin Audit API', () => {
  const app = createApp();

  const teacherToken = signAccessToken({
    sub: 'teacher_audit_001',
    role: 'teacher'
  });

  // AU-API-000 非教师角色无审核权限
  it('should forbid non-teacher to access audit APIs (AU-API-000)', async () => {
    const studentToken = signAccessToken({
      sub: 'student_audit_001',
      role: 'student'
    });

    const res = await request(app)
      .get('/api/admin/audit/pending?type=question')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PERMISSION_DENIED');
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
  });

  // AU-API-001 查询待审核问题
  it('should list pending questions (AU-API-001)', async () => {
    await prisma.question.createMany({
      data: [
        {
          id: 'q-audit-pending-1',
          title: '待审核问题',
          content: '问题内容...',
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
          authorName: '小明同学'
        },
        {
          id: 'q-audit-approved-1',
          title: '已通过问题',
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
          authorName: '小红'
        }
      ]
    });

    const res = await request(app)
      .get('/api/admin/audit/pending?type=question&page=1&pageSize=20')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.type).toBe('question');
    expect(
      res.body.data.list.every(
        (item: any) => item.type === 'question' && item.status === 'pending'
      )
    ).toBe(true);
    expect(res.body.data.statistics.pending).toBeGreaterThanOrEqual(1);
  });

  // AU-API-002 查询待审核评论
  it('should list pending comments (AU-API-002)', async () => {
    await prisma.question.create({
      data: {
        id: 'q-audit-comment-1',
        title: '所属问题标题',
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
        authorName: '小明同学'
      }
    });

    await prisma.comment.create({
      data: {
        id: 'c-audit-pending-1',
        questionId: 'q-audit-comment-1',
        content: '评论内容...',
        image: 'https://cdn.example.com/images/xxx.jpg',
        authorId: 'user-002',
        authorName: '小红',
        status: 'pending',
        aiResult: '疑似违规（侮辱性词汇）'
      }
    });

    const res = await request(app)
      .get('/api/admin/audit/pending?type=comment')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.type).toBe('comment');
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);

    const item = res.body.data.list[0];
    expect(item.questionId).toBe('q-audit-comment-1');
    expect(item.questionTitle).toBe('所属问题标题');
    expect(item.aiResult).toContain('疑似违规');
  });

  // AU-API-001P 非法分页参数应返回 400
  it('should return 400 when pending list pagination params are invalid (AU-API-001P)', async () => {
    const res = await request(app)
      .get('/api/admin/audit/pending?type=question&page=0&pageSize=20')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PAGINATION');
  });

  // AU-API-003 审核通过问题
  it('should approve question (AU-API-003)', async () => {
    await prisma.question.create({
      data: {
        id: 'q-audit-approve-1',
        title: '待审核问题',
        content: '问题内容',
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
        authorName: '小明同学'
      }
    });

    const res = await request(app)
      .post('/api/admin/audit/q-audit-approve-1/approve')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        type: 'question',
        isGoodQuestion: true,
        score: 5,
        tags: ['二次函数', '配方法'],
        difficulty: 'medium'
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('审核完成：已通过');
    expect(res.body.data.status).toBe('approved');
    expect(res.body.data.isGoodQuestion).toBe(true);
    expect(res.body.data.score).toBe(5);

    // 断言数据库中的问题状态与统计字段被正确更新
    const updatedQuestion = await prisma.question.findUnique({
      where: { id: 'q-audit-approve-1' }
    });
    expect(updatedQuestion?.status).toBe('approved');
    expect(updatedQuestion?.isGoodQuestion).toBe(true);
    expect(updatedQuestion?.score).toBe(5);
    expect(updatedQuestion?.tags).toEqual(['二次函数', '配方法']);
    expect(updatedQuestion?.difficulty).toBe('medium');

    // 断言写入审核日志与通知
    const logs = await prisma.auditLog.findMany({
      where: { targetId: 'q-audit-approve-1', action: 'approve' }
    });
    expect(logs.length).toBe(1);
    expect(logs[0].auditorId).toBe('teacher_audit_001');

    const notifications = await prisma.notification.findMany({
      where: { targetId: 'q-audit-approve-1', type: 'audit_result' }
    });
    expect(notifications.length).toBeGreaterThanOrEqual(1);
    expect(
      notifications.some((n) => n.userId === 'student_001')
    ).toBe(true);
  });

  // AU-API-005/006 驳回问题与理由校验
  it('should validate reject reason and reject question (AU-API-005/006)', async () => {
    await prisma.question.create({
      data: {
        id: 'q-audit-reject-1',
        title: '待审核问题',
        content: '问题内容',
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
        authorName: '小明同学'
      }
    });

    const bad = await request(app)
      .post('/api/admin/audit/q-audit-reject-1/reject')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        type: 'question',
        reason: ''
      });

    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('REASON_REQUIRED');

    const res = await request(app)
      .post('/api/admin/audit/q-audit-reject-1/reject')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        type: 'question',
        reason: '问题描述不清晰，请补充详细信息'
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('审核完成：已驳回');
    expect(res.body.data.status).toBe('rejected');

    // 断言问题已被标记为 rejected 且 aiResult 保存了驳回原因
    const rejected = await prisma.question.findUnique({
      where: { id: 'q-audit-reject-1' }
    });
    expect(rejected?.status).toBe('rejected');
    expect(rejected?.aiResult).toContain('问题描述不清晰');

    // 断言审核日志中记录了驳回动作与原因
    const logs = await prisma.auditLog.findMany({
      where: { targetId: 'q-audit-reject-1', action: 'reject' }
    });
    expect(logs.length).toBe(1);
    expect(logs[0].reason).toContain('问题描述不清晰');
  });

  // AU-API-007 封禁评论
  it('should ban comment (AU-API-007)', async () => {
    await prisma.question.create({
      data: {
        id: 'q-audit-comment-1',
        title: '所属问题标题',
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

    await prisma.comment.create({
      data: {
        id: 'c-audit-ban-1',
        questionId: 'q-audit-comment-1',
        content: '不当评论',
        authorId: 'user-002',
        authorName: '评论者',
        status: 'pending'
      }
    });

    const res = await request(app)
      .post('/api/admin/audit/c-audit-ban-1/ban')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        type: 'comment',
        reason: '包含侮辱性词汇，严重违规'
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.status).toBe('banned');

    // 断言评论被软删除并记录封禁日志
    const updated = await prisma.comment.findUnique({
      where: { id: 'c-audit-ban-1' }
    });
    expect(updated?.status).toBe('banned');
    expect(updated?.deletedAt).not.toBeNull();

    const logs = await prisma.auditLog.findMany({
      where: { targetId: 'c-audit-ban-1', action: 'ban' }
    });
    expect(logs.length).toBe(1);
  });

  // AU-API-008/009 置顶与取消置顶
  it('should toggle question pin (AU-API-008/009)', async () => {
    await prisma.question.create({
      data: {
        id: 'q-audit-pin-1',
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
        authorId: 'user-001',
        authorName: '作者'
      }
    });

    const pinRes = await request(app)
      .post('/api/admin/audit/questions/q-audit-pin-1/pin')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(pinRes.status).toBe(200);
    expect(pinRes.body.data.isPinned).toBe(true);

    const unpinRes = await request(app)
      .post('/api/admin/audit/questions/q-audit-pin-1/pin')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(unpinRes.status).toBe(200);
    expect(unpinRes.body.data.isPinned).toBe(false);
  });
});
