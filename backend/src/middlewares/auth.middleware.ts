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
