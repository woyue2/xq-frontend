import request from 'supertest';
import { createApp } from '../../app';
import { signAccessToken } from '../../utils/jwt';
import { prisma } from '../../config/database';

describe('Question Dimensions API', () => {
  const app = createApp();

  const teacherToken = signAccessToken({
    sub: 'teacher_dim_001',
    role: 'teacher'
  });

  const studentToken = signAccessToken({
    sub: 'student_dim_001',
    role: 'student'
  });

  beforeEach(async () => {
    // 清理本测试使用的数据，避免影响其它用例
    await prisma.questionDimensionOption.deleteMany({
      where: {
        dimensionKey: 'method'
      }
    });

    await prisma.questionDimension.deleteMany({
      where: {
        key: 'method'
      }
    });

    // 初始化 method 维度及默认选项
    await prisma.questionDimension.create({
      data: {
        key: 'method',
        name: '解题方法',
        enabled: true,
        multiSelect: false,
        order: 0,
        options: {
          create: [
            {
              value: '配方法',
              label: '配方法',
              order: 10,
              enabled: true
            },
            {
              value: '公式法',
              label: '公式法',
              order: 20,
              enabled: true
            },
            {
              value: 'unknown',
              label: '暂不确定',
              order: 999,
              enabled: true
            }
          ]
        }
      }
    });

    // 清理并初始化测试用户
    await prisma.loginLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany({
      where: {
        id: {
          in: ['teacher_dim_001', 'student_dim_001']
        }
      }
    });

    await prisma.user.createMany({
      data: [
        {
          id: 'teacher_dim_001',
          phone: '13900009001',
          nickname: '维度配置老师',
          role: 'teacher',
          isActive: true,
          isBanned: false
        },
        {
          id: 'student_dim_001',
          phone: '13900009002',
          nickname: '维度配置学生',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      ]
    });
  });

  afterAll(async () => {
    await prisma.questionDimensionOption.deleteMany({
      where: {
        dimensionKey: 'method'
      }
    });
    await prisma.questionDimension.deleteMany({
      where: {
        key: 'method'
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: ['teacher_dim_001', 'student_dim_001']
        }
      }
    });
  });

  it('should return public question dimensions with unknown option at bottom', async () => {
    const res = await request(app)
      .get('/api/config/question-dimensions')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(Array.isArray(res.body.data.dimensions)).toBe(true);

    const methodDim = res.body.data.dimensions.find(
      (d: any) => d.key === 'method'
    );
    expect(methodDim).toBeDefined();
    expect(methodDim.enabled).toBe(true);
    expect(Array.isArray(methodDim.options)).toBe(true);

    const values = methodDim.options.map((o: any) => o.value);
    expect(values).toContain('unknown');
    expect(values[values.length - 1]).toBe('unknown');
  });

  it('should allow teacher to list and update method dimension config', async () => {
    const listRes = await request(app)
      .get('/api/admin/question-dimensions')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send();

    expect(listRes.status).toBe(200);
    expect(listRes.body.code).toBe(200);
    const methodDim = listRes.body.data.dimensions.find(
      (d: any) => d.key === 'method'
    );
    expect(methodDim).toBeDefined();
    expect(methodDim.name).toBe('解题方法');

    const updateRes = await request(app)
      .put('/api/admin/question-dimensions/method')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        name: '办法',
        enabled: true
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.code).toBe(200);
    expect(updateRes.body.data.name).toBe('办法');
    expect(updateRes.body.data.enabled).toBe(true);
  });

  it('should reject non-teacher accessing admin dimension APIs', async () => {
    const res = await request(app)
      .get('/api/admin/question-dimensions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send();

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PERMISSION_DENIED');
  });

  it('should allow teacher to create and update dimension options', async () => {
    const createRes = await request(app)
      .post('/api/admin/question-dimensions/method/options')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        value: '图像法',
        label: '图像法',
        order: 30,
        enabled: true
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.code).toBe(201);
    expect(createRes.body.data.value).toBe('图像法');

    const optionId = createRes.body.data.id as string;

    const updateRes = await request(app)
      .put(`/api/admin/question-dimensions/method/options/${optionId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        label: '图像法（更新）',
        order: 35,
        enabled: false
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.code).toBe(200);
    expect(updateRes.body.data.label).toBe('图像法（更新）');
    expect(updateRes.body.data.order).toBe(35);
    expect(updateRes.body.data.enabled).toBe(false);
  });
});

