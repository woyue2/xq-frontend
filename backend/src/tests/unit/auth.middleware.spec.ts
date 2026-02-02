import type { NextFunction, Response } from 'express';
import { authMiddleware, requireTeacher, type AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../errors/AppError';
import * as jwtUtils from '../../utils/jwt';
import { TokenExpiredError } from 'jsonwebtoken';

const createMock = () => {
  const req = {
    headers: {}
  } as unknown as AuthenticatedRequest;
  const res = {} as Response;
  const next = jest.fn() as unknown as NextFunction & {
    mock: jest.Mock;
  };
  return { req, res, next: next as unknown as jest.Mock & NextFunction };
};

describe('authMiddleware', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('应当在缺少 Authorization 时返回 UNAUTHORIZED 错误', () => {
    const { req, res, next } = createMock();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('应当在 token 解析失败时返回 UNAUTHORIZED 错误', () => {
    const { req, res, next } = createMock();
    req.headers.authorization = 'Bearer invalid-token';

    jest.spyOn(jwtUtils, 'verifyToken').mockImplementation(() => {
      throw new Error('invalid');
    });

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.status).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('应当在 token 过期时返回 TOKEN_EXPIRED 错误', () => {
    const { req, res, next } = createMock();
    req.headers.authorization = 'Bearer expired-token';

    jest.spyOn(jwtUtils, 'verifyToken').mockImplementation(() => {
      throw new TokenExpiredError('jwt expired', new Date());
    });

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.status).toBe(401);
    expect(err.code).toBe('TOKEN_EXPIRED');
  });

  it('应当在 token 合法且 payload 完整时为 req.user 赋值并继续', () => {
    const { req, res, next } = createMock();
    req.headers.authorization = 'Bearer valid-token';

    jest.spyOn(jwtUtils, 'verifyToken').mockReturnValue({
      sub: 'user-001',
      role: 'student',
      type: 'access'
    } as any);

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      id: 'user-001',
      role: 'student'
    });
  });
});

describe('requireTeacher', () => {
  it('应当在未登录时返回 UNAUTHORIZED', () => {
    const { req, res, next } = createMock();

    requireTeacher(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.status).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('应当在角色非 teacher 时返回 PERMISSION_DENIED', () => {
    const { req, res, next } = createMock();
    req.user = {
      id: 'user-002',
      role: 'student'
    };

    requireTeacher(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.status).toBe(403);
    expect(err.code).toBe('PERMISSION_DENIED');
  });

  it('应当在角色为 teacher 时放行', () => {
    const { req, res, next } = createMock();
    req.user = {
      id: 'teacher-001',
      role: 'teacher'
    };

    requireTeacher(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
