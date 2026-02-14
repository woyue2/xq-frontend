import request from 'supertest';
import { createApp } from '../../app';
import { signAccessToken } from '../../utils/jwt';

describe('Upload API', () => {
  const app = createApp();
  const originalFetch = global.fetch;

  const teacherToken = signAccessToken({
    sub: 'teacher_upload_001',
    role: 'teacher'
  });

  const studentToken = signAccessToken({
    sub: 'student_upload_001',
    role: 'student'
  });

  afterEach(() => {
    global.fetch = originalFetch;
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

  // 兼容历史客户端：音频字段名为 audio 也可上传
  it('should allow teacher to upload audio file with audio field alias', async () => {
    const buffer = Buffer.alloc(1024, 'a');

    const res = await request(app)
      .post('/api/upload/audio')
      .set('Authorization', `Bearer ${teacherToken}`)
      .attach('audio', buffer, {
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

  // 图片上传失败时可回退到本地存储路径
  it('should allow authenticated user to upload image to local fallback storage', async () => {
    const buffer = Buffer.alloc(1024, 'a');

    const res = await request(app)
      .post('/api/upload/image-local')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', buffer, {
        filename: 'fallback.jpg',
        contentType: 'image/jpeg'
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(typeof res.body.data.imageUrl).toBe('string');
    expect(res.body.data.imageUrl.startsWith('/static/image/')).toBe(true);
  });

  // 非图片类型不允许走本地图片上传接口
  it('should reject non-image file when uploading to image-local endpoint', async () => {
    const buffer = Buffer.alloc(1024, 'a');

    const res = await request(app)
      .post('/api/upload/image-local')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', buffer, {
        filename: 'not-image.txt',
        contentType: 'text/plain'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_FILE_TYPE');
  });

  // 非白名单域名禁止通过图片代理读取，避免被滥用为开放代理
  it('should reject image-proxy request when host is not whitelisted', async () => {
    const res = await request(app)
      .get('/api/upload/image-proxy')
      .query({ url: 'https://example.com/demo.jpg' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PROXY_HOST_NOT_ALLOWED');
  });

  // 白名单图床可通过后端代理读取，提升图片加载稳定性
  it('should proxy image for allowed host', async () => {
    const payload = Buffer.from('image-binary');
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          const lower = name.toLowerCase();
          if (lower === 'content-type') return 'image/jpeg';
          if (lower === 'cache-control') return 'public, max-age=60';
          return null;
        }
      },
      arrayBuffer: async () => payload
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const targetUrl = 'https://s3.bmp.ovh/2026/02/14/demo.jpg';
    const res = await request(app)
      .get('/api/upload/image-proxy')
      .query({ url: targetUrl });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/jpeg');
    expect(res.headers['cache-control']).toBe('public, max-age=60');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      targetUrl,
      expect.objectContaining({
        method: 'GET',
        redirect: 'follow'
      })
    );
  });
});
