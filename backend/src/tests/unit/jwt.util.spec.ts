import jwt from 'jsonwebtoken';
import { signAccessToken, signRefreshToken, verifyToken } from '../../utils/jwt';
import { env } from '../../config/env';

describe('jwt utils', () => {
  const secret = env.JWT_SECRET;

  it('signAccessToken 应当生成包含 type=access 的 JWT', () => {
    const token = signAccessToken({ sub: 'user1', role: 'student' });
    const decoded = jwt.verify(token, secret) as any;

    expect(decoded.sub).toBe('user1');
    expect(decoded.role).toBe('student');
    expect(decoded.type).toBe('access');
  });

  it('signRefreshToken 应当生成包含 type=refresh 的 JWT', () => {
    const token = signRefreshToken({ sub: 'user2', role: 'teacher' });
    const decoded = jwt.verify(token, secret) as any;

    expect(decoded.sub).toBe('user2');
    expect(decoded.role).toBe('teacher');
    expect(decoded.type).toBe('refresh');
  });

  it('verifyToken 应当解析由 signAccessToken 生成的 token', () => {
    const token = signAccessToken({ sub: 'user3', role: 'student' });
    const payload = verifyToken(token);

    expect(payload.sub).toBe('user3');
    expect(payload.role).toBe('student');
    expect(payload.type).toBe('access');
  });
});
