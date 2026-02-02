import request from 'supertest';
import { createApp } from '../../app';
import { signAccessToken } from '../../utils/jwt';

describe('Audit API (smoke)', () => {
  const app = createApp();

  const teacherToken = signAccessToken({
    sub: 'audit_teacher_001',
    role: 'teacher'
  });

  it('should return 200 for list pending questions', async () => {
    const res = await request(app)
      .get('/api/admin/audit/pending?type=question&page=1&pageSize=10')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.type).toBe('question');
    expect(res.body.data.pagination).toBeDefined();
  });
});

