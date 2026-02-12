import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { createApp } from '../../app';
import { env } from '../../config/env';

describe('Static audio serving', () => {
  const app = createApp();

  it('should serve local audio file via /static/audio/* URL', async () => {
    // 计算实际静态目录，与 app.ts 中逻辑保持一致
    const audioDir = path.isAbsolute(env.AUDIO_BASE_DIR)
      ? env.AUDIO_BASE_DIR
      : path.join(process.cwd(), env.AUDIO_BASE_DIR);

    fs.mkdirSync(audioDir, { recursive: true });

    const filename = 'test-audio.mp3';
    const filePath = path.join(audioDir, filename);

    // 写入一个简单的测试文件（内容无所谓，只要存在即可）
    fs.writeFileSync(filePath, 'dummy-audio-content');

    const res = await request(app).get(`/static/audio/${filename}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('audio');
    expect(res.body).toBeInstanceOf(Buffer);
  });
});
