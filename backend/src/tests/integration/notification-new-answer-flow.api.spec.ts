import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { signAccessToken } from '../../utils/jwt';

describe('Notification New Answer Flow API', () => {
  const app = createApp();

  const teacherId = 'notif_teacher_001';
  const studentId = 'notif_student_001';

  const teacherToken = signAccessToken({
    sub: teacherId,
    role: 'teacher'
  });

  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.loginLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [teacherId, studentId]
        }
      }
    });

    await prisma.user.createMany({
      data: [
        {
          id: teacherId,
          phone: '13900007771',
          nickname: '李老师',
          role: 'teacher',
          isActive: true,
          isBanned: false
        },
        {
          id: studentId,
          phone: '13900007772',
          nickname: '通知学生',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      ]
    });
  });

  it('should create new_answer notification with answerId for question author when teacher answers', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-notif-ans-001',
        title: '通知链路问题',
        content: '这是一个用于通知测试的问题',
        subject: 'math',
        tags: ['通知', '回答'],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 0,
        comments: 0,
        answers: 0,
        authorId: studentId,
        authorName: '通知学生'
      }
    });

    const payload = {
      content: '这是带语音能力的老师回答内容',
      images: [],
      audioUrl: 'https://cdn.example.com/audio/answer-notif.mp3'
    };

    const res = await request(app)
      .post(`/api/questions/${question.id}/answers`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    const createdAnswerId: string = res.body.data.id;
    expect(createdAnswerId).toBeTruthy();

    const notifications = await prisma.notification.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: 'desc' }
    });

    expect(notifications.length).toBeGreaterThanOrEqual(1);

    const newAnswerNotification = notifications.find(
      (n) =>
        n.type === 'new_answer' &&
        n.targetType === 'question' &&
        n.targetId === question.id
    );

    expect(newAnswerNotification).toBeDefined();
    expect(newAnswerNotification?.title).toBe('你的问题有新的回答');

    // content 中应包含 answerId 的 JSON 结构
    expect(newAnswerNotification?.content).toBeTruthy();
    const parsed = JSON.parse(newAnswerNotification!.content!);
    expect(parsed.answerId).toBe(createdAnswerId);
    expect(parsed.questionTitle).toBe(question.title);
  });
});
