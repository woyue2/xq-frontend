import { prisma } from '../config/database';

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

    const created = await prisma.behaviorLog.create({
      data: {
        userId: userId ?? null,
        sessionId: sessionId ?? null,
        eventType: type,
        metadata: metadata as any,
        path: path ?? null,
        referrer: referrer ?? null,
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
        clientTime: typeof timestamp === 'number' ? new Date(timestamp) : null
      }
    });

    return created;
  }
}

export const behaviorLogService = new BehaviorLogService();
