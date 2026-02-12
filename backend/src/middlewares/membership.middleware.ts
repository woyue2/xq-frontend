import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './auth.middleware';
import { classHoursService } from '../services/class-hours.service';
import { AppError } from '../errors/AppError';

export const requireActiveMembership = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHORIZED', '未登录'));
  }

  // 教师与家长账号不受课时限制：教师始终可写，家长写操作由各业务路由的角色校验单独控制
  if (req.user.role === 'teacher' || req.user.role === 'parent') {
    return next();
  }

  try {
    const info = await classHoursService.getUserClassHours(req.user.id);
    if (info.isExpired) {
      return next(
        new AppError(
          403,
          'MEMBER_EXPIRED',
          '会员课时已过期，请联系管理员续费',
          undefined,
          4004
        )
      );
    }
    return next();
  } catch (err) {
    next(err);
  }
};
