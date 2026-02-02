import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { errorMiddleware } from '../../middlewares/error.middleware';
import { AppError } from '../../errors/AppError';

const createMockResponse = () => {
  const res: Partial<Response> = {};
  const status = jest.fn().mockImplementation(() => res);
  const json = jest.fn().mockImplementation(() => res);

  // 将方法挂载到 res 上，模拟 Express Response 接口
  (res as any).status = status;
  (res as any).json = json;

  return {
    res: res as Response,
    status,
    json
  };
};

const createMockRequest = (overrides?: Partial<Request & { log?: any }>) => {
  const base: Partial<Request> = {
    path: '/test-path',
    method: 'GET'
  };

  return {
    ...base,
    ...overrides
  } as Request & { log?: any };
};

describe('errorMiddleware', () => {
  const next: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle AppError and log structured error', () => {
    const log = {
      error: jest.fn()
    };
    const req = createMockRequest({ log, method: 'POST', path: '/api/test' });
    const { res, status, json } = createMockResponse();
    const err = new AppError(401, 'UNAUTHORIZED', '未授权访问', { reason: 'token missing' });

    errorMiddleware(err, req as unknown as Request, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 401,
        message: '未授权访问',
        error: 'UNAUTHORIZED',
        data: { reason: 'token missing' },
        timestamp: expect.any(Number)
      })
    );

    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'app_error',
        status: 401,
        code: 401,
        error: 'UNAUTHORIZED',
        path: '/api/test',
        method: 'POST'
      }),
      'Http request error'
    );
  });

  it('should handle ZodError and log validation error', () => {
    const log = {
      error: jest.fn()
    };
    const req = createMockRequest({ log });
    const { res, status, json } = createMockResponse();
    const zodError = new ZodError([]);

    errorMiddleware(zodError, req as unknown as Request, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: '参数校验失败',
        error: 'VALIDATION_ERROR',
        details: expect.any(Array),
        timestamp: expect.any(Number)
      })
    );

    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'validation_error',
        status: 400,
        code: 400,
        error: 'VALIDATION_ERROR',
        path: '/test-path',
        method: 'GET'
      }),
      'Http request error'
    );
  });

  it('should handle unknown error and log internal error', () => {
    const log = {
      error: jest.fn()
    };
    const req = createMockRequest({ log, method: 'DELETE', path: '/api/delete' });
    const { res, status, json } = createMockResponse();
    const err = new Error('unexpected failure');

    errorMiddleware(err, req as unknown as Request, res, next);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 500,
        message: '服务器内部错误',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: expect.any(Number)
      })
    );

    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'unknown_error',
        status: 500,
        code: 500,
        error: 'INTERNAL_SERVER_ERROR',
        path: '/api/delete',
        method: 'DELETE'
      }),
      'Http request error'
    );
  });

  it('should fallback to console.error when log is missing', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const req = createMockRequest({ log: undefined });
    const { res } = createMockResponse();
    const err = new Error('no logger');

    errorMiddleware(err, req as unknown as Request, res, next);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[HttpError]',
      expect.objectContaining({
        type: 'unknown_error',
        status: 500,
        code: 500,
        error: 'INTERNAL_SERVER_ERROR',
        path: '/test-path',
        method: 'GET'
      })
    );

    consoleSpy.mockRestore();
  });
});
