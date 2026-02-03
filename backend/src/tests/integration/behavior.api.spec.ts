import request from 'supertest';
import { createApp } from '../../app';
import { signAccessToken } from '../../utils/jwt';
import { prisma } from '../../config/database';

describe('Behavior Log API', () => {
  const app = createApp();

  const studentId = 'behavior_student_001';
  const studentToken = signAccessToken({
    sub: studentId,
    role: 'student'
  });

  beforeEach(async () => {
    await prisma.behaviorLog.deleteMany();
  });

  // LOG-API-001 / BEHAVIOR-API-001 记录点击好问题
  it('should log behavior event (LOG-API-001 / BEHAVIOR-API-001)', async () => {
    const res = await request(app)
      .post('/api/behavior/log')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        type: 'click_good_question',
        timestamp: 1706832000000,
        metadata: {
          questionId: 'q-123',
          sourcePage: '/question/123'
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('success');
    expect(typeof res.body.data.logId).toBe('string');

    const logs = await prisma.behaviorLog.findMany();
    expect(logs.length).toBe(1);
    const log = logs[0];
    expect(log.eventType).toBe('click_good_question');
    expect(log.userId).toBe(studentId);
    expect(log.metadata).toMatchObject({
      questionId: 'q-123',
      sourcePage: '/question/123'
    });
    // path/IP/userAgent 等字段由中间件/真实网关注入，此处只校验 clientTime 由 timestamp 正确转换
    expect(log.clientTime).toEqual(new Date(1706832000000));
  });

  // BEHAVIOR-API-002 缺少必填参数
  it('should return 400 when type is missing (BEHAVIOR-API-002)', async () => {
    const res = await request(app)
      .post('/api/behavior/log')
      .send({
        timestamp: 1706832000000
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  // BEHAVIOR-API-003 高频上报限流
  it('should rate limit high frequency logs (BEHAVIOR-API-003)', async () => {
    // 在限流窗口内重复上报超过阈值
    const totalRequests = 40;
    let limited = false;

    for (let i = 0; i < totalRequests; i++) {
      const res = await request(app)
        .post('/api/behavior/log')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          type: 'click_good_question',
          timestamp: Date.now(),
          metadata: {
            questionId: 'q-limit-001',
            sourcePage: '/question/limit'
          }
        });

      if (res.status === 429) {
        expect(res.body.error).toBe('RATE_LIMITED');
        limited = true;
        break;
      }
    }

    expect(limited).toBe(true);
  });

  // BEHAVIOR-API-004 metadata 超过大小限制时返回 400
  it('should reject too large metadata payload (BEHAVIOR-API-004)', async () => {
    const largeMetadata = {
      payload: 'x'.repeat(4096)
    };

    const res = await request(app)
      .post('/api/behavior/log')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        type: 'click_good_question',
        timestamp: Date.now(),
        metadata: largeMetadata
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});
