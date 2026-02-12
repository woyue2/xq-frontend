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
    await prisma.loginLog.deleteMany();
    await prisma.refreshToken.deleteMany();
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
    // 1. 学生提交问题（初始为 pending，等待老师审核）
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

    // 2. 教师可以正常访问审核队列（自动审核通过的问题不会再出现在 pending 列表中）
    const pendingRes = await request(app)
      .get('/api/admin/audit/pending?type=question&page=1&pageSize=20')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.code).toBe(200);
    expect(Array.isArray(pendingRes.body.data.list)).toBe(true);

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

  it('should persist teacher audit + answer chain with real database notifications (TEA)', async () => {
    // 1. 学生提交问题（初始为 pending，等待老师审核）
    const createRes = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'TEA 链路测试问题：审核 + 回答',
        content: '用于验证“提问 → 教师审核 → 教师回答 → 通知”的完整链路。',
        tags: ['TEA', '链路测试'],
        difficulty: 'easy'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.code).toBe(201);

    const questionId = createRes.body.data.id as string;
    expect(questionId).toBeDefined();

    const created = await prisma.question.findUnique({
      where: { id: questionId }
    });
    expect(created?.status).toBe('pending');
    expect(created?.authorId).toBe(studentId);

    // 2. 教师审核通过该问题，并打上好问题与评分
    const approveRes = await request(app)
      .post(`/api/admin/audit/${questionId}/approve`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        type: 'question',
        isGoodQuestion: true,
        score: 4,
        tags: ['TEA', '链路测试'],
        difficulty: 'easy'
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.code).toBe(200);
    expect(approveRes.body.data.status).toBe('approved');
    expect(approveRes.body.data.isGoodQuestion).toBe(true);

    const approved = await prisma.question.findUnique({
      where: { id: questionId }
    });
    expect(approved?.status).toBe('approved');
    expect(approved?.isGoodQuestion).toBe(true);
    expect(approved?.score).toBe(4);

    const auditLogs = await prisma.auditLog.findMany({
      where: { targetId: questionId, action: 'approve' }
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);

    // 3. 教师为该问题创建回答（teacher → answer）
    const answerPayload = {
      content: '这是 TEA 链路中教师提交的测试回答内容。',
      images: [] as string[],
      audioUrl: 'https://cdn.example.com/audio/tea-answer.mp3'
    };

    const answerRes = await request(app)
      .post(`/api/questions/${questionId}/answers`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(answerPayload);

    expect(answerRes.status).toBe(201);
    expect(answerRes.body.code).toBe(201);

    const answerId = answerRes.body.data.id as string;
    expect(answerId).toBeDefined();

    const answer = await prisma.answer.findUnique({
      where: { id: answerId }
    });
    expect(answer).not.toBeNull();
    expect(answer?.questionId).toBe(questionId);
    expect(answer?.authorId).toBe(teacherId);
    // 老师回答应直接为 approved，便于前端立即展示
    expect(answer?.status).toBe('approved');

    const questionWithAnswer = await prisma.question.findUnique({
      where: { id: questionId }
    });
    expect(questionWithAnswer?.answers).toBe(1);

    // 4. 学生侧应同时收到 “审核结果” 与 “新回答” 两类通知
    const notifications = await prisma.notification.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: 'asc' }
    });

    expect(notifications.length).toBeGreaterThanOrEqual(2);

    const hasAuditNotification = notifications.some(
      (n) =>
        n.type === 'audit_result' &&
        n.targetType === 'question' &&
        n.targetId === questionId
    );
    expect(hasAuditNotification).toBe(true);

    const newAnswerNotification = notifications.find(
      (n) =>
        n.type === 'new_answer' &&
        n.targetType === 'question' &&
        n.targetId === questionId
    );
    expect(newAnswerNotification).toBeDefined();
    expect(newAnswerNotification?.title).toBe('你的问题有新的回答');

    if (newAnswerNotification?.content) {
      const parsed = JSON.parse(newAnswerNotification.content) as {
        answerId?: string;
        questionTitle?: string;
      };
      expect(parsed.answerId).toBe(answerId);
      expect(parsed.questionTitle).toBe(approved?.title);
    }
  });
});
