import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

export class BehaviorLogService {
  async logSingle(params: {
    userId?: string;
    sessionId?: string;
    type: string;
    timestamp?: number;
    metadata?: unknown;
    path?: string;
    referrer?: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const {
      userId,
      sessionId,
      type,
      timestamp,
      metadata,
      path,
      referrer,
      userAgent,
      ipAddress
    } = params;

    // 边界保护：验证事件类型长度，防止恶意超长或空类型干扰统计与查询
    if (!type || typeof type !== 'string' || type.length > 50) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        '事件类型无效',
        {
          errors: [
            {
              field: 'type',
              message: '行为类型必须为 1~50 个字符的字符串'
            }
          ]
        }
      );
    }

    // 关键边界保护：校验客户端上传的时间戳
    // 逻辑：如果客户端时间与服务器时间偏差超过 1 小时，或者早于 2024 年（系统上线前），
    // 则强制采用服务器当前时间，防止数据统计（如成长报告）被恶意干扰。
    const now = Date.now();
    let finalClientTime: Date | null = null;

    if (typeof timestamp === 'number') {
      const ONE_HOUR = 60 * 60 * 1000;
      const PLATFORM_START_DATE = new Date('2024-01-01').getTime();

      const isFuture = timestamp > now + ONE_HOUR;
      const isTooOld = timestamp < PLATFORM_START_DATE;

      if (isFuture || isTooOld) {
        finalClientTime = new Date(now);
      } else {
        finalClientTime = new Date(timestamp);
      }
    }

    const created = await prisma.behaviorLog.create({
      data: {
        userId: userId ?? null,
        sessionId: sessionId ?? null,
        eventType: type.slice(0, 50), // 确保存储不溢出
        metadata: metadata as any,
        path: path ?? null,
        referrer: referrer ?? null,
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
        clientTime: finalClientTime
      }
    });

    return created;
  }
}

export const behaviorLogService = new BehaviorLogService();
