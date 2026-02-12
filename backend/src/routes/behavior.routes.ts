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
const METADATA_MAX_BYTES = 2 * 1024; // 单次 metadata 最大大小（约 2KB）

export const behaviorRouter = Router();

/**
 * @swagger
 * /behavior/log:
 *   post:
 *     summary: 单条行为日志上报
 *     description: 上报单条用户行为日志，支持用户身份识别和简易防刷
 *     tags:
 *       - Behavior
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type:
 *                 type: string
 *                 description: 行为类型（1-50字符）
 *               timestamp:
 *                 type: number
 *                 description: 行为发生时间戳
 *               metadata:
 *                 type: object
 *                 description: 行为元数据（JSON对象，单次最大2KB）
 *     responses:
 *       200:
 *         description: 上报成功
 */
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

      // metadata 大小限制，避免单次埋点携带过大 payload
      if (metadata != null) {
        try {
          const serialized = JSON.stringify(metadata);
          const length = Buffer.byteLength(serialized, 'utf8');
          if (length > METADATA_MAX_BYTES) {
            throw new AppError(
              400,
              'VALIDATION_ERROR',
              'metadata 过大，单次埋点数据请控制在 2KB 以内'
            );
          }
        } catch {
          // 如果无法序列化，视为参数错误
          throw new AppError(
            400,
            'VALIDATION_ERROR',
            'metadata 必须是可序列化的 JSON 对象'
          );
        }
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
        message: 'success',
        data: {
          logId: created.id
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /behavior/log/batch:
 *   post:
 *     summary: 批量行为日志上报
 *     description: 批量上报多条用户行为日志，支持部分成功原则
 *     tags:
 *       - Behavior
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [events]
 *             properties:
 *               events:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       description: 行为类型
 *                     timestamp:
 *                       type: number
 *                       description: 行为时间戳
 *                     metadata:
 *                       type: object
 *                       description: 元数据
 *                     sessionId:
 *                       type: string
 *                       description: 会话ID
 *     responses:
 *       200:
 *         description: 上报完成
 */
behaviorRouter.post(
  '/log/batch',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { events } = req.body as {
        events?: Array<{
          type: string;
          timestamp?: number;
          metadata?: any;
          sessionId?: string;
        }>
      };

      if (!events || !Array.isArray(events) || events.length === 0) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'events 必须为非空数组'
        );
      }

      // 验证每个事件的基本结构
      const results: Array<{
        index: number;
        logId?: string;
        error?: string;
      }> = [];

      let successCount = 0;
      let failedCount = 0;

      // 并行处理所有事件（部分成功原则）
      const processedPromises = events.map(async (event, index) => {
        try {
          const { type, timestamp, metadata, sessionId } = event;

          if (!type || typeof type !== 'string' || type.length > 50) {
            throw new AppError(
              400,
              'VALIDATION_ERROR',
              `事件[${index}]类型无效：必须为1-50个字符的字符串`
            );
          }

          // metadata 大小限制
          if (metadata != null) {
            try {
              const serialized = JSON.stringify(metadata);
              const length = Buffer.byteLength(serialized, 'utf8');
              if (length > METADATA_MAX_BYTES) {
                throw new AppError(
                  400,
                  'VALIDATION_ERROR',
                  `事件[${index}]metadata 过大，请控制在 2KB 以内`
                );
              }
            } catch {
              throw new AppError(
                400,
                'VALIDATION_ERROR',
                `事件[${index}]metadata 必须是可序列化的 JSON 对象`
              );
            }
          }

          // 获取用户ID（从token，与单条接口一致）
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

          // 调用服务层记录日志
          const created = await behaviorLogService.logSingle({
            userId,
            type,
            timestamp,
            metadata,
            sessionId,
            path: metadata?.path ?? req.path,
            referrer: metadata?.referrer,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip
          });

          results[index] = { index, logId: created.id };
          successCount++;
        } catch (err: any) {
          let errorMessage = '未知错误';
          if (err instanceof AppError) {
            errorMessage = err.message;
          } else if (err instanceof Error) {
            errorMessage = err.message;
          }
          results[index] = { index, error: errorMessage };
          failedCount++;
        }
      });

      await Promise.all(processedPromises);

      // 确保 results 数组连续（可能有未处理的索引）
      const finalResults = results.filter(r => r !== undefined);

      return res.json({
        code: 200,
        message: 'success',
        data: {
          successCount,
          failedCount,
          results: finalResults
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
