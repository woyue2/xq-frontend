import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { signAccessToken } from '../../utils/jwt';

describe('Parent API', () => {
  const app = createApp();

  const PARENT_ID = 'parent_api_001';
  const CHILD_ID = 'child_api_001';
  const STUDENT_ID = 'student_api_001';

  beforeEach(async () => {
    await prisma.parentChild.deleteMany({
      where: {
        parentId: PARENT_ID
      }
    });

    await prisma.question.deleteMany({
      where: {
        authorId: CHILD_ID
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [PARENT_ID, CHILD_ID, STUDENT_ID]
        }
      }
    });

    await prisma.user.createMany({
      data: [
        {
          id: PARENT_ID,
          phone: '13900009001',
          nickname: '家长用户',
          role: 'parent',
          isActive: true,
          isBanned: false
        },
        {
          id: CHILD_ID,
          phone: '13900009002',
          nickname: '孩子用户',
          role: 'student',
          isActive: true,
          isBanned: false
        },
        {
          id: STUDENT_ID,
          phone: '13900009003',
          nickname: '学生用户',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      ]
    });

    await prisma.parentChild.create({
      data: {
        parentId: PARENT_ID,
        childId: CHILD_ID
      }
    });
  });

  afterAll(async () => {
    await prisma.parentChild.deleteMany({
      where: {
        parentId: PARENT_ID
      }
    });

    await prisma.question.deleteMany({
      where: {
        authorId: CHILD_ID
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [PARENT_ID, CHILD_ID, STUDENT_ID]
        }
      }
    });
  });

  it('should allow parent to unbind own child', async () => {
    const token = signAccessToken({
      sub: PARENT_ID,
      role: 'parent'
    });

    const res = await request(app)
      .post('/api/parent/unbind')
      .set('Authorization', `Bearer ${token}`)
      .send({ childId: CHILD_ID });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);

    const remaining = await prisma.parentChild.findMany({
      where: {
        parentId: PARENT_ID,
        childId: CHILD_ID
      }
    });
    expect(remaining.length).toBe(0);
  });

  it('should forbid non-parent roles to unbind child', async () => {
    const tokenStudent = signAccessToken({
      sub: STUDENT_ID,
      role: 'student'
    });

    const res = await request(app)
      .post('/api/parent/unbind')
      .set('Authorization', `Bearer ${tokenStudent}`)
      .send({ childId: CHILD_ID });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('should forbid non-parent roles to view child questions', async () => {
    const tokenStudent = signAccessToken({
      sub: STUDENT_ID,
      role: 'student'
    });

    const res = await request(app)
      .get(`/api/parent/questions/${CHILD_ID}`)
      .set('Authorization', `Bearer ${tokenStudent}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('should list only approved questions for child when parent views questions', async () => {
    const token = signAccessToken({
      sub: PARENT_ID,
      role: 'parent'
    });

    await prisma.question.createMany({
      data: [
        {
          id: 'q-child-approved-1',
          title: '已通过审核的问题',
          content: '这是一个已通过审核的问题',
          subject: 'math',
          tags: ['tag1'],
          images: [],
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: CHILD_ID,
          authorName: '孩子用户'
        },
        {
          id: 'q-child-pending-1',
          title: '待审核的问题',
          content: '这是一个待审核的问题',
          subject: 'math',
          tags: ['tag2'],
          images: [],
          status: 'pending',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: CHILD_ID,
          authorName: '孩子用户'
        },
        {
          id: 'q-child-rejected-1',
          title: '被驳回的问题',
          content: '这是一个被驳回的问题',
          subject: 'math',
          tags: ['tag3'],
          images: [],
          status: 'rejected',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: CHILD_ID,
          authorName: '孩子用户'
        }
      ]
    });

    const res = await request(app)
      .get(`/api/parent/questions/${CHILD_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.list)).toBe(true);

    const items = res.body.data.list;
    const ids = items.map((q: any) => q.id);

    expect(ids).toContain('q-child-approved-1');
    expect(ids).not.toContain('q-child-pending-1');
    expect(ids).not.toContain('q-child-rejected-1');
    expect(items.every((q: any) => q.status === 'approved')).toBe(true);
  });

  it('should return 400 when child questions pagination params are invalid', async () => {
    const token = signAccessToken({
      sub: PARENT_ID,
      role: 'parent'
    });

    const res = await request(app)
      .get(`/api/parent/questions/${CHILD_ID}?page=0&pageSize=10`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PAGINATION');
  });
});
