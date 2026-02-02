import request from 'supertest';
import { createApp } from '../../app';
import { signAccessToken } from '../../utils/jwt';

describe('Upload Signature API', () => {
  const app = createApp();

  const teacherToken = signAccessToken({
    sub: 'teacher_upload_001',
    role: 'teacher'
  });

  const studentToken = signAccessToken({
    sub: 'student_upload_001',
    role: 'student'
  });

  // 获取图片上传签名
  it('should return image upload signature', async () => {
    const res = await request(app)
      .get('/api/upload/signature?type=image')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('success');
    expect(typeof res.body.data.uploadUrl).toBe('string');
    expect(typeof res.body.data.key).toBe('string');
    expect(res.body.data.key.startsWith('image/')).toBe(true);
    expect(res.body.data.policy).toBeDefined();
    expect(res.body.data.signature).toBeDefined();
    expect(typeof res.body.data.expireAt).toBe('number');
  });

  // 音频上传签名仅教师可用
  it('should allow only teacher to get audio upload signature', async () => {
    const okRes = await request(app)
      .get('/api/upload/signature?type=audio')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(okRes.status).toBe(200);
    expect(okRes.body.code).toBe(200);
    expect(okRes.body.data.key.startsWith('audio/')).toBe(true);

    const forbiddenRes = await request(app)
      .get('/api/upload/signature?type=audio')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error).toBe('PERMISSION_DENIED');
  });
});
