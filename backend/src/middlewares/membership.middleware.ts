/**
 * [POS] backend/src/middlewares/membership.middleware.ts
 *   所属：中间件层 | 角色：会员资格校验，拦截非活跃会员访问付费功能
 *
 * [INPUT]
 *   - express                       → NextFunction / Response
 *   - ./auth.middleware              → AuthenticatedRequest
 *   - ../services/class-hours.service → classHoursService
 *   - ../errors/AppError             → AppError
 *
 * [OUTPUT]
 *   - membershipMiddleware（会员校验中间件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/middlewares/CLAUDE.md 的文件清单
 */
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

  // 教师、管理员与家长账号不受课时限制：教师/管理员始终可写，家长写操作由各业务路由的角色校验单独控制
  if (req.user.role === 'teacher' || req.user.role === 'admin' || req.user.role === 'parent') {
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
