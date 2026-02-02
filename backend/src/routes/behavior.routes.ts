import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { behaviorLogService } from '../services/behavior-log.service';
import { AppError } from '../errors/AppError';
import { verifyToken } from '../utils/jwt';

// 简单的内存级防刷：按 (userId/IP + type) 在短时间内限流
type RateLimitKey = string;
const behaviorRateMap = new Map<RateLimitKey, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 分钟窗口
const RATE_LIMIT_MAX_EVENTS = 30; // 每窗口允许的最大上报次数

export const behaviorRouter = Router();

// 单条行为日志上报
behaviorRouter.post(
  '/log',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, timestamp, metadata } = req.body as {
        type?: string;
        timestamp?: number;
        metadata?: any;
      };

      if (!type) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          '缺少行为类型'
        );
      }

      let userId: string | undefined;
      const authHeader = req.headers.authorization ?? '';
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length)
        : '';

      if (token) {
        try {
          const payload: any = verifyToken(token);
          if (payload?.sub) {
            userId = String(payload.sub);
          }
        } catch {
          // token 无效时忽略用户信息
        }
      }

      // 防刷：按 userId 或 IP + type 做简易限流
      const identity = userId || req.ip || 'anonymous';
      const key: RateLimitKey = `${identity}:${type}`;
      const now = Date.now();
      const current = behaviorRateMap.get(key);

      if (!current || now - current.windowStart > RATE_LIMIT_WINDOW_MS) {
        behaviorRateMap.set(key, { count: 1, windowStart: now });
      } else {
        if (current.count >= RATE_LIMIT_MAX_EVENTS) {
          throw new AppError(
            429,
            'RATE_LIMITED',
            '行为上报过于频繁，请稍后再试'
          );
        }
        current.count += 1;
      }

      const created = await behaviorLogService.logSingle({
        userId,
        type,
        timestamp,
        metadata,
        path: metadata?.path ?? req.path,
        referrer: metadata?.referrer,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      });

      return res.json({
        code: 200,
        message: 'Logged successfully',
        data: {
          id: created.id,
          success: true,
          receivedAt: Date.now()
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
