import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { behaviorLogService } from '../services/behavior-log.service';
import { AppError } from '../errors/AppError';
import { verifyToken } from '../utils/jwt';
import { getRedisClient } from '../config/redis';

// 简单的内存级防刷：按 (userId/IP + type) 在短时间内限流
type RateLimitKey = string;
const behaviorRateMap = new Map<RateLimitKey, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 分钟窗口
const RATE_LIMIT_MAX_EVENTS = 30; // 每窗口允许的最大上报次数
const METADATA_MAX_BYTES = 2 * 1024; // 单次 metadata 最大大小（约 2KB）
// 修改原因：测试环境给限流 key 增加进程隔离前缀，避免 Redis 残留计数影响同机重复执行测试。
const RATE_LIMIT_KEY_PREFIX =
  process.env.NODE_ENV === 'test'
    ? `behavior:rate:test:${process.pid}`
    : 'behavior:rate:v1';

const parseUserIdFromRequest = (req: Request): string | undefined => {
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

  return userId;
};

const validateMetadataSize = (
  metadata: any,
  tooLargeMessage: string,
  invalidMessage = 'metadata 必须是可序列化的 JSON 对象'
): void => {
  if (metadata == null) {
    return;
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(metadata);
  } catch {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      invalidMessage
    );
  }

  const length = Buffer.byteLength(serialized, 'utf8');
  if (length > METADATA_MAX_BYTES) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      tooLargeMessage
    );
  }
};

const consumeMemoryRateLimit = (key: string): void => {
  const now = Date.now();
  const current = behaviorRateMap.get(key);

  if (!current || now - current.windowStart > RATE_LIMIT_WINDOW_MS) {
    behaviorRateMap.set(key, { count: 1, windowStart: now });
    return;
  }

  if (current.count >= RATE_LIMIT_MAX_EVENTS) {
    throw new AppError(
      429,
      'RATE_LIMITED',
      '行为上报过于频繁，请稍后再试'
    );
  }

  current.count += 1;
};

const enforceBehaviorRateLimit = async (identity: string, type: string): Promise<void> => {
  const key: RateLimitKey = `${identity}:${type}`;
  const redis = await getRedisClient();

  if (!redis) {
    // 修改原因：方案B要求统一到 Redis 限流；当 Redis 不可用时降级到内存，避免上报接口整体不可用。
    // ⚠️ 不确定因素：降级后在多实例场景会回到“各实例各自计数”，仅保证可用性不保证全局一致性。
    consumeMemoryRateLimit(key);
    return;
  }

  const redisKey = `${RATE_LIMIT_KEY_PREFIX}:${key}`;
  const count = await redis.incr(redisKey);

  if (count === 1) {
    await redis.pExpire(redisKey, RATE_LIMIT_WINDOW_MS);
  } else {
    // 修改原因：兜底处理历史异常键（例如意外丢失 TTL），防止计数永不过期。
    const ttl = await redis.pTTL(redisKey);
    if (ttl < 0) {
      await redis.pExpire(redisKey, RATE_LIMIT_WINDOW_MS);
    }
  }

  if (count > RATE_LIMIT_MAX_EVENTS) {
    throw new AppError(
      429,
      'RATE_LIMITED',
      '行为上报过于频繁，请稍后再试'
    );
  }
};

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

      validateMetadataSize(metadata, 'metadata 过大，单次埋点数据请控制在 2KB 以内');

      const userId = parseUserIdFromRequest(req);

      // 修改原因：方案B将限流统一到 Redis（单条与批量共用），避免多实例下内存限流不一致。
      const identity = userId || req.ip || 'anonymous';
      await enforceBehaviorRateLimit(identity, type);

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

      const userId = parseUserIdFromRequest(req);
      const identity = userId || req.ip || 'anonymous';

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

          validateMetadataSize(
            metadata,
            `事件[${index}]metadata 过大，请控制在 2KB 以内`,
            `事件[${index}]metadata 必须是可序列化的 JSON 对象`
          );
          // 修改原因：补齐批量接口限流，避免绕过单条接口限流阈值。
          await enforceBehaviorRateLimit(identity, type);

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
