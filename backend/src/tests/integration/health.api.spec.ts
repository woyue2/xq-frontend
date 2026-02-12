import request from 'supertest';
import { createApp } from '../../app';

describe('Health endpoint', () => {
  it('should return ok status', async () => {
    const app = createApp();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
