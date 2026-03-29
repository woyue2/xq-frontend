/**
 * [POS] backend/src/middlewares/auth.middleware.ts
 *   所属：中间件层 | 角色：JWT 验证 + 角色注入，导出 authMiddleware / requireTeacher 等 guard
 *
 * [INPUT]
 *   - express           → NextFunction / Request / Response
 *   - ../utils/jwt      → verifyToken
 *   - ../errors/AppError → AppError
 *
 * [OUTPUT]
 *   - authMiddleware（JWT 验证中间件）
 *   - requireTeacher / createRequireTeacher（角色 guard）
 *   - AuthenticatedRequest（扩展 Request 类型）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/middlewares/CLAUDE.md 的文件清单
 */
import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../errors/AppError';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : '';

  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', '未登录'));
  }

  try {
    const payload: any = verifyToken(token);
    if (!payload.sub || !payload.role) {
      throw new Error('invalid payload');
    }
    req.user = {
      id: String(payload.sub),
      role: String(payload.role)
    };
    return next();
  } catch (err) {
    if (err && typeof err === 'object' && (err as any).name === 'TokenExpiredError') {
      return next(
        new AppError(401, 'TOKEN_EXPIRED', '登录已过期，请重新登录')
      );
    }
    return next(new AppError(401, 'UNAUTHORIZED', '认证失败'));
  }
};

export const createRequireTeacher =
  (options?: { message?: string; bizCode?: number }) =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', '未登录'));
    }

    if (req.user.role !== 'teacher') {
      return next(
        new AppError(
          403,
          'PERMISSION_DENIED',
          options?.message ?? '无权限访问',
          undefined,
          options?.bizCode
        )
      );
    }

    return next();
  };

export const requireTeacher = createRequireTeacher();
