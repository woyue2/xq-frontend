import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    const outCode =
      typeof err.bizCode === 'number' ? err.bizCode : err.status;
    return res.status(err.status).json({
      code: outCode,
      message: err.message,
      error: err.code,
      ...(err.data ? { data: err.data } : {}),
      timestamp: Date.now()
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      code: 400,
      message: '参数校验失败',
      error: 'VALIDATION_ERROR',
      details: err.errors,
      timestamp: Date.now()
    });
  }

  const status = 500;
  const message = '服务器内部错误';

  return res.status(status).json({
    code: status,
    message,
    error: 'INTERNAL_SERVER_ERROR',
    timestamp: Date.now()
  });
};
