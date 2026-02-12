import request from 'supertest';
import { createApp } from '../../app';
import { signAccessToken } from '../../utils/jwt';

describe('Audit API (smoke)', () => {
  const app = createApp();

  const teacherToken = signAccessToken({
    sub: 'audit_teacher_001',
    role: 'teacher'
  });

  const parentToken = signAccessToken({
    sub: 'audit_parent_001',
    role: 'parent'
  });

  const studentToken = signAccessToken({
    sub: 'audit_student_001',
    role: 'student'
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

  it('should reject non-teacher access to audit queue', async () => {
    const resParent = await request(app)
      .get('/api/admin/audit/pending?type=question&page=1&pageSize=10')
      .set('Authorization', `Bearer ${parentToken}`);

    expect(resParent.status).toBe(403);
    expect(resParent.body.error).toBe('PERMISSION_DENIED');

    const resStudent = await request(app)
      .get('/api/admin/audit/pending?type=question&page=1&pageSize=10')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(resStudent.status).toBe(403);
    expect(resStudent.body.error).toBe('PERMISSION_DENIED');
  });
});
