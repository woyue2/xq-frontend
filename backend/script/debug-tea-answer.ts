import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { signAccessToken } from '../src/utils/jwt';

async function main() {
  const app = createApp();

  const studentId = 'debug_student_tea';
  const teacherId = 'debug_teacher_tea';

  const studentToken = signAccessToken({
    sub: studentId,
    role: 'student'
  });

  const teacherToken = signAccessToken({
    sub: teacherId,
    role: 'teacher'
  });

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
        nickname: '调试学生',
        role: 'student',
        isActive: true,
        isBanned: false
      },
      {
        id: teacherId,
        phone: '13900002222',
        nickname: '调试老师',
        role: 'teacher',
        isActive: true,
        isBanned: false
      }
    ]
  });

  const createRes = await request(app)
    .post('/api/questions')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({
      title: 'TEA 调试问题：审核 + 回答',
      content: '用于调试“提问 → 教师审核 → 教师回答 → 通知”的链路。',
      tags: ['TEA_DEBUG', '链路测试'],
      difficulty: 'easy'
    });

  console.log('createRes.status', createRes.status);
  console.log('createRes.body', JSON.stringify(createRes.body, null, 2));

  const questionId = createRes.body.data?.id as string | undefined;
  if (!questionId) {
    console.error('questionId missing, abort.');
    return;
  }

  const approveRes = await request(app)
    .post(`/api/admin/audit/${questionId}/approve`)
    .set('Authorization', `Bearer ${teacherToken}`)
    .send({
      type: 'question',
      isGoodQuestion: true,
      score: 4,
      tags: ['TEA_DEBUG', '链路测试'],
      difficulty: 'easy'
    });

  console.log('approveRes.status', approveRes.status);
  console.log('approveRes.body', JSON.stringify(approveRes.body, null, 2));

  const answerRes = await request(app)
    .post(`/api/questions/${questionId}/answers`)
    .set('Authorization', `Bearer ${teacherToken}`)
    .send({
      content: '这是调试用教师回答内容。',
      images: [] as string[],
      audioUrl: 'https://cdn.example.com/audio/tea-answer-debug.mp3'
    });

  console.log('answerRes.status', answerRes.status);
  console.log('answerRes.body', JSON.stringify(answerRes.body, null, 2));

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('debug-tea-answer error', err);
  await prisma.$disconnect();
});

