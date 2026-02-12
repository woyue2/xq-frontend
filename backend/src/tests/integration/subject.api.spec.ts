import request from 'supertest';
import { createApp } from '../../app';
import { signAccessToken } from '../../utils/jwt';
import { prisma } from '../../config/database';

describe('Subjects API', () => {
  const app = createApp();

  // 生成测试 token
  const teacherToken = signAccessToken({ sub: 'teacher_sub_001', role: 'teacher' });
  const studentToken = signAccessToken({ sub: 'student_sub_001', role: 'student' });

  beforeEach(async () => {
    // 清理测试数据
    await prisma.questionDimensionOption.deleteMany({
      where: { dimensionKey: { startsWith: 'subject_' } }
    });
    await prisma.questionDimension.deleteMany({
      where: { key: { startsWith: 'subject_' } }
    });
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.questionDimensionOption.deleteMany({
      where: { dimensionKey: { startsWith: 'subject_' } }
    });
    await prisma.questionDimension.deleteMany({
      where: { key: { startsWith: 'subject_' } }
    });
  });

  describe('GET /api/config/subjects', () => {
    it('should return public subjects with enabled topics', async () => {
      // 初始化测试数据
      await prisma.questionDimension.create({
        data: {
          key: 'subject_test',
          name: '测试科目',
          enabled: true,
          multiSelect: false,
          order: 0,
          options: {
            create: [
              { value: 'test_topic_1', label: '考点1', order: 10, enabled: true },
              { value: 'test_topic_2', label: '考点2', order: 20, enabled: true },
              { value: 'test_topic_3', label: '考点3', order: 30, enabled: false } // 禁用的考点不应返回
            ]
          }
        }
      });

      const res = await request(app)
        .get('/api/config/subjects')
        .send();

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(Array.isArray(res.body.data.subjects)).toBe(true);

      const testSubject = res.body.data.subjects.find((s: any) => s.key === 'subject_test');
      expect(testSubject).toBeDefined();
      expect(testSubject.name).toBe('测试科目');
      expect(testSubject.order).toBe(0);
      expect(testSubject.topics).toHaveLength(2); // 只返回启用的考点
      expect(testSubject.topics[0].label).toBe('考点1');
      expect(testSubject.topics[1].label).toBe('考点2');
    });

    it('should return empty array when no subjects exist', async () => {
      const res = await request(app)
        .get('/api/config/subjects')
        .send();

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data.subjects).toEqual([]);
    });

    it('should not return disabled subjects', async () => {
      // 创建禁用的科目
      await prisma.questionDimension.create({
        data: {
          key: 'subject_disabled',
          name: '禁用科目',
          enabled: false,
          multiSelect: false,
          order: 10
        }
      });

      const res = await request(app)
        .get('/api/config/subjects')
        .send();

      expect(res.status).toBe(200);
      const disabledSubject = res.body.data.subjects.find((s: any) => s.key === 'subject_disabled');
      expect(disabledSubject).toBeUndefined();
    });
  });

  describe('Admin API Integration', () => {
    beforeEach(async () => {
      // 为管理 API 测试创建数据
      await prisma.questionDimension.create({
        data: {
          key: 'subject_test',
          name: '测试科目',
          enabled: true,
          multiSelect: false,
          order: 0,
          options: {
            create: [
              { value: 'test_topic_1', label: '考点1', order: 10, enabled: true }
            ]
          }
        }
      });
    });

    it('should allow teacher to create topic via option API', async () => {
      const res = await request(app)
        .post('/api/admin/question-dimensions/subject_test/options')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          value: 'test_topic_2',
          label: '考点2',
          order: 20,
          enabled: true
        });

      expect(res.status).toBe(201);
      expect(res.body.data.label).toBe('考点2');

      // 验证考点被创建
      const options = await prisma.questionDimensionOption.findMany({
        where: { dimensionKey: 'subject_test' }
      });
      expect(options).toHaveLength(2);
    });

    it('should allow teacher to update subject', async () => {
      const res = await request(app)
        .put('/api/admin/question-dimensions/subject_test')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          name: '更新后的测试科目',
          enabled: true
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('更新后的测试科目');

      // 验证更新生效
      const subject = await prisma.questionDimension.findUnique({
        where: { key: 'subject_test' }
      });
      expect(subject?.name).toBe('更新后的测试科目');
    });

    it('should allow teacher to disable subject', async () => {
      const res = await request(app)
        .put('/api/admin/question-dimensions/subject_test')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          enabled: false
        });

      expect(res.status).toBe(200);

      // 验证禁用生效 - 公开接口不应返回
      const publicRes = await request(app)
        .get('/api/config/subjects')
        .send();

      const disabledSubject = publicRes.body.data.subjects.find(
        (s: any) => s.key === 'subject_test'
      );
      expect(disabledSubject).toBeUndefined();
    });

    it('should reject non-teacher accessing admin APIs', async () => {
      const res = await request(app)
        .post('/api/admin/question-dimensions/subject_test/options')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          value: 'test_topic_hack',
          label: '恶意考点'
        });

      expect(res.status).toBe(403);
    });
  });

});
