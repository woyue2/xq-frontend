import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { signAccessToken } from '../../utils/jwt';

describe('Answer API', () => {
  const app = createApp();

  const teacherToken = signAccessToken({
    sub: 'teacher_001',
    role: 'teacher'
  });

  const studentToken = signAccessToken({
    sub: 'student_001',
    role: 'student'
  });

  beforeEach(async () => {
    await prisma.behaviorLog.deleteMany();
    await prisma.like.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.createMany({
      data: [
        {
          id: 'teacher_001',
          phone: '13900000011',
          nickname: '李老师',
          role: 'teacher',
          isActive: true,
          isBanned: false
        },
        {
          id: 'student_001',
          phone: '13900000012',
          nickname: '测试学生',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      ]
    });
  });

  // A-API-001 正常创建回答（老师回答应直接通过审核）
  it('should create answer successfully and auto-approve for teacher (A-API-001)', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-ans-001',
        title: '二次函数问题',
        content: '问题内容',
        subject: 'math',
        tags: ['二次函数'],
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
      }
    });

    const payload = {
      content: '这是详细的回答内容...',
      images: ['https://cdn.example.com/images/answer1.jpg'],
      audioUrl: 'https://cdn.example.com/audio/answer1.mp3'
    };

    const res = await request(app)
      .post(`/api/questions/${question.id}/answers`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    expect(res.body.message).toBe('回答提交成功，等待审核');
    expect(res.body.data.questionId).toBe(question.id);
    expect(res.body.data.content).toBe(payload.content);
    expect(res.body.data.images).toHaveLength(1);
    expect(res.body.data.audioUrl).toBe(payload.audioUrl);
    expect(res.body.data.authorId).toBe('teacher_001');
    expect(res.body.data.likes).toBe(0);
    // 老师回答在当前实现中应直接为 approved
    expect(res.body.data.status).toBe('approved');

    const updatedQuestion = await prisma.question.findUnique({
      where: { id: question.id }
    });
    expect(updatedQuestion?.answers).toBe(1);
  });

  // A-API-002 学生无权回答
  it('should forbid student to create answer (A-API-002)', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-ans-002',
        title: '二次函数问题',
        content: '问题内容',
        subject: 'math',
        tags: ['二次函数'],
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
      .post(`/api/questions/${question.id}/answers`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        content: '学生回答内容'
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PERMISSION_DENIED');
  });

  // A-API-003 回答内容为空
  it('should reject empty answer content (A-API-003)', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-ans-003',
        title: '二次函数问题',
        content: '问题内容',
        subject: 'math',
        tags: ['二次函数'],
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
      .post(`/api/questions/${question.id}/answers`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        content: '',
        images: []
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('EMPTY_CONTENT');
  });

  // A-API-004 查询回答列表
  it('should list approved answers with like state (A-API-004)', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-ans-004',
        title: '二次函数问题',
        content: '问题内容',
        subject: 'math',
        tags: ['二次函数'],
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

    const a1 = await prisma.answer.create({
      data: {
        questionId: question.id,
        content: '回答1',
        images: [],
        audioUrl: 'https://cdn.example.com/audio/a1.mp3',
        authorId: 'teacher_001',
        authorName: '李老师',
        likes: 45,
        status: 'approved'
      }
    });

    await prisma.answer.create({
      data: {
        questionId: question.id,
        content: '回答2',
        images: [],
        audioUrl: null,
        authorId: 'teacher_001',
        authorName: '李老师',
        likes: 1,
        status: 'approved'
      }
    });

    await prisma.answer.create({
      data: {
        questionId: question.id,
        content: '待审核回答',
        images: [],
        audioUrl: null,
        authorId: 'teacher_001',
        authorName: '李老师',
        likes: 0,
        status: 'pending'
      }
    });

    // 当前学生对第一个回答点过赞
    await prisma.like.create({
      data: {
        userId: 'student_001',
        targetType: 'answer',
        targetId: a1.id
      }
    });

    const res = await request(app)
      .get(`/api/questions/${question.id}/answers`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.list.length).toBe(2);
    expect(
      res.body.data.list.every((a: any) => a.status === 'approved')
    ).toBe(true);

    const liked = res.body.data.list.find(
      (a: any) => a.id === a1.id
    );
    expect(liked.isLiked).toBe(true);
  });

  // A-API-005 删除回答
  it('should soft delete answer and decrease count (A-API-005)', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-ans-005',
        title: '二次函数问题',
        content: '问题内容',
        subject: 'math',
        tags: ['二次函数'],
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

    const answer = await prisma.answer.create({
      data: {
        questionId: question.id,
        content: '待删除回答',
        images: [],
        audioUrl: null,
        authorId: 'teacher_001',
        authorName: '李老师',
        likes: 0,
        status: 'approved'
      }
    });

    const res = await request(app)
      .delete(`/api/answers/${answer.id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('删除成功');

    const updatedAnswer = await prisma.answer.findUnique({
      where: { id: answer.id }
    });
    expect(updatedAnswer?.deletedAt).not.toBeNull();

    const updatedQuestion = await prisma.question.findUnique({
      where: { id: question.id }
    });
    expect(updatedQuestion?.answers).toBe(0);
  });
});
