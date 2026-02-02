import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { signAccessToken } from '../../utils/jwt';

describe('Comment API', () => {
  const app = createApp();

  const teacherToken = signAccessToken({
    sub: 'teacher_001',
    role: 'teacher'
  });

  const studentToken = signAccessToken({
    sub: 'student_001',
    role: 'student'
  });

  const otherStudentToken = signAccessToken({
    sub: 'student_002',
    role: 'student'
  });

  const parentToken = signAccessToken({
    sub: 'parent_001',
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

    await prisma.user.createMany({
      data: [
        {
          id: 'teacher_001',
          phone: '13900000021',
          nickname: '李老师',
          role: 'teacher',
          isActive: true,
          isBanned: false
        },
        {
          id: 'student_001',
          phone: '13900000022',
          nickname: '小明同学',
          role: 'student',
          isActive: true,
          isBanned: false
        },
        {
          id: 'student_002',
          phone: '13900000023',
          nickname: '其他学生',
          role: 'student',
          isActive: true,
          isBanned: false
        },
        {
          id: 'parent_001',
          phone: '13900000024',
          nickname: '家长A',
          role: 'parent',
          isActive: true,
          isBanned: false
        }
      ]
    });
  });

  // C-API-001 作者评论自己的问题
  it('should allow author to comment own question (C-API-001)', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-cmt-001',
        title: '作者的问题',
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
        authorName: '小明同学'
      }
    });

    const res = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        questionId: question.id,
        content: '谢谢大家的回答！',
        image: 'https://cdn.example.com/images/comment1.jpg'
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    expect(res.body.message).toBe('评论提交成功，等待审核');
    expect(res.body.data.questionId).toBe(question.id);
    expect(res.body.data.content).toBe('谢谢大家的回答！');
    expect(res.body.data.image).toBe(
      'https://cdn.example.com/images/comment1.jpg'
    );
    expect(res.body.data.authorId).toBe('student_001');
    expect(res.body.data.status).toBe('pending');

    const updatedQuestion = await prisma.question.findUnique({
      where: { id: question.id }
    });
    expect(updatedQuestion?.comments).toBe(1);
  });

  // C-API-002 教师评论任意问题（应直接通过审核）
  it('should allow teacher to comment any question and auto-approve (C-API-002)', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-cmt-002',
        title: '学生的问题',
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
        authorName: '小明同学'
      }
    });

    const res = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        questionId: question.id,
        content: '这是老师的建议...'
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    expect(res.body.data.authorId).toBe('teacher_001');
    expect(res.body.data.status).toBe('approved');
  });

  // C-API-003 学生无权评论他人问题
  it('should forbid student to comment others question (C-API-003)', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-cmt-003',
        title: '其他学生的问题',
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
        authorName: '小明同学'
      }
    });

    const res = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({
        questionId: question.id,
        content: '其他学生的评论'
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PERMISSION_DENIED');
  });

  // C-API-004 家长无权评论
  it('should forbid parent to comment (C-API-004)', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-cmt-004',
        title: '学生的问题',
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
        authorName: '小明同学'
      }
    });

    const res = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        questionId: question.id,
        content: '家长评论'
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PERMISSION_DENIED');
  });

  // C-API-005 查询评论列表
  it('should list approved comments (C-API-005)', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-cmt-005',
        title: '评论列表问题',
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
        authorName: '小明同学'
      }
    });

    await prisma.comment.createMany({
      data: [
        {
          questionId: question.id,
          content: '评论1',
          image: 'https://cdn.example.com/images/comment.jpg',
          authorId: 'student_001',
          authorName: '小明同学',
          status: 'approved'
        },
        {
          questionId: question.id,
          content: '评论2',
          image: null,
          authorId: 'teacher_001',
          authorName: '李老师',
          status: 'approved'
        },
        {
          questionId: question.id,
          content: '待审核评论',
          image: null,
          authorId: 'teacher_001',
          authorName: '李老师',
          status: 'pending'
        }
      ]
    });

    const res = await request(app)
      .get(`/api/questions/${question.id}/comments`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.list.length).toBe(2);
    expect(
      res.body.data.list.every((c: any) => c.status === 'approved')
    ).toBe(true);
  });

  // C-API-006 删除评论
  it('should soft delete comment and decrease count (C-API-006)', async () => {
    const question = await prisma.question.create({
      data: {
        id: 'q-cmt-006',
        title: '删除评论问题',
        content: '问题内容',
        subject: 'math',
        tags: [],
        status: 'approved',
        isGoodQuestion: false,
        isPinned: false,
        likes: 0,
        favorites: 0,
        comments: 1,
        answers: 0,
        authorId: 'student_001',
        authorName: '小明同学'
      }
    });

    const comment = await prisma.comment.create({
      data: {
        questionId: question.id,
        content: '待删除评论',
        image: null,
        authorId: 'student_001',
        authorName: '小明同学',
        status: 'approved'
      }
    });

    const res = await request(app)
      .delete(`/api/comments/${comment.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('删除成功');

    const updatedComment = await prisma.comment.findUnique({
      where: { id: comment.id }
    });
    expect(updatedComment?.deletedAt).not.toBeNull();

    const updatedQuestion = await prisma.question.findUnique({
      where: { id: question.id }
    });
    expect(updatedQuestion?.comments).toBe(0);
  });
});
