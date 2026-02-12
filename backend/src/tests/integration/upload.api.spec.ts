import request from 'supertest';
import { createApp } from '../../app';
import { signAccessToken } from '../../utils/jwt';

describe('Upload API', () => {
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

  // 教师可以正常上传小体积音频文件
  it('should allow teacher to upload small audio file', async () => {
    const buffer = Buffer.alloc(1024, 'a');

    const res = await request(app)
      .post('/api/upload/audio')
      .set('Authorization', `Bearer ${teacherToken}`)
      .attach('file', buffer, {
        filename: 'answer.webm',
        contentType: 'audio/webm'
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(typeof res.body.data.audioUrl).toBe('string');
    expect(res.body.data.audioUrl.startsWith('/static/audio/')).toBe(true);
  });

  // 学生上传音频应被拒绝
  it('should reject audio upload from non-teacher user', async () => {
    const buffer = Buffer.alloc(1024, 'a');

    const res = await request(app)
      .post('/api/upload/audio')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', buffer, {
        filename: 'answer.webm',
        contentType: 'audio/webm'
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PERMISSION_DENIED');
  });

  // 超过大小限制的音频应返回 400
  it('should reject audio upload when file is too large', async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 'a'); // 6MB

    const res = await request(app)
      .post('/api/upload/audio')
      .set('Authorization', `Bearer ${teacherToken}`)
      .attach('file', bigBuffer, {
        filename: 'big-answer.webm',
        contentType: 'audio/webm'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('FILE_TOO_LARGE');
  });

  // 非音频 MIME 类型应被拒绝
  it('should reject non-audio file type', async () => {
    const buffer = Buffer.alloc(1024, 'a');

    const res = await request(app)
      .post('/api/upload/audio')
      .set('Authorization', `Bearer ${teacherToken}`)
      .attach('file', buffer, {
        filename: 'answer.txt',
        contentType: 'text/plain'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_FILE_TYPE');
  });
});
