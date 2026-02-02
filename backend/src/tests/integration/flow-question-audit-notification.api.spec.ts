import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { signAccessToken } from '../../utils/jwt';

/**
 * 链路型集成测试：登录（test-token） → 提问 → 审核 → 通知
 *
 * 目标：
 * - 覆盖“学生只能提问 / 老师只能审核”的角色约束；
 * - 验证审核通过后自动为学生创建通知；
 * - 验证学生端通知列表与未读计数的正确性。
 */
describe('Flow: question → audit → notification', () => {
  const app = createApp();

  const studentId = 'flow_student_001';
  const teacherId = 'flow_teacher_001';

  const studentToken = signAccessToken({
    sub: studentId,
    role: 'student'
  });

  const teacherToken = signAccessToken({
    sub: teacherId,
    role: 'teacher'
  });

  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.createMany({
      data: [
        {
          id: studentId,
          phone: '13900001111',
          nickname: '链路学生',
          role: 'student',
          isActive: true,
          isBanned: false
        },
        {
          id: teacherId,
          phone: '13900002222',
          nickname: '链路老师',
          role: 'teacher',
          isActive: true,
          isBanned: false
        }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should complete student question → teacher audit → student notification flow', async () => {
    // 1. 学生提交问题（pending 状态）
    const createRes = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: '链路测试问题：审核后通知学生',
        content: '这是一个用于测试“提问→审核→通知”链路的问题。',
        tags: ['链路测试'],
        difficulty: 'easy'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.code).toBe(201);

    const questionId = createRes.body.data.id as string;
    expect(questionId).toBeDefined();

    // 确认问题在数据库中的初始状态为 pending
    const created = await prisma.question.findUnique({
      where: { id: questionId }
    });
    expect(created?.status).toBe('pending');

    // 2. 教师在审核队列中能看到该问题
    const pendingRes = await request(app)
      .get('/api/admin/audit/pending?type=question&page=1&pageSize=20')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.code).toBe(200);
    expect(
      pendingRes.body.data.list.some((item: any) => item.id === questionId)
    ).toBe(true);

    // 3. 教师审核通过该问题，并打上好问题与评分
    const approveRes = await request(app)
      .post(`/api/admin/audit/${questionId}/approve`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        type: 'question',
        isGoodQuestion: true,
        score: 5,
        tags: ['链路测试'],
        difficulty: 'easy'
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.code).toBe(200);
    expect(approveRes.body.data.status).toBe('approved');
    expect(approveRes.body.data.isGoodQuestion).toBe(true);

    // 确认 Question 状态已更新为 approved
    const approved = await prisma.question.findUnique({
      where: { id: questionId }
    });
    expect(approved?.status).toBe('approved');

    // 确认生成了审核日志
    const auditLogs = await prisma.auditLog.findMany({
      where: { targetId: questionId }
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);

    // 4. 学生端获取通知列表与未读数量
    const unreadBefore = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(unreadBefore.status).toBe(200);
    expect(unreadBefore.body.code).toBe(200);
    expect(unreadBefore.body.data.unreadCount).toBeGreaterThanOrEqual(1);

    const listRes = await request(app)
      .get('/api/notifications?page=1&limit=10')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.code).toBe(200);
    expect(listRes.body.data.notifications.length).toBeGreaterThanOrEqual(1);

    const hasAuditNotification = listRes.body.data.notifications.some(
      (n: any) =>
        n.type === 'audit_result' &&
        n.targetType === 'question' &&
        n.targetId === questionId
    );

    expect(hasAuditNotification).toBe(true);
  });
});

