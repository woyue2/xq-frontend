import { behaviorLogService } from '../../services/behavior-log.service';
import { prisma } from '../../config/database';
import { AppError } from '../../errors/AppError';

describe('BehaviorLogService - 单元测试', () => {
  const prismaAny = prisma as any;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaAny.behaviorLog = {
      create: jest.fn()
    };
  });

  it('应当将缺省字段写为 null 并保留元数据', async () => {
    const timestamp = 1706832000000;

    (prismaAny.behaviorLog.create as jest.Mock).mockResolvedValue({
      id: 'log1',
      userId: 'u1',
      sessionId: 's1',
      eventType: 'click_good_question',
      metadata: { questionId: 'q1' },
      path: '/question/1',
      referrer: '/home',
      userAgent: 'jest',
      ipAddress: '127.0.0.1',
      clientTime: new Date(timestamp)
    });

    const result = await behaviorLogService.logSingle({
      userId: 'u1',
      sessionId: 's1',
      type: 'click_good_question',
      timestamp,
      metadata: { questionId: 'q1' },
      path: '/question/1',
      referrer: '/home',
      userAgent: 'jest',
      ipAddress: '127.0.0.1'
    });

    expect(prismaAny.behaviorLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        sessionId: 's1',
        eventType: 'click_good_question',
        metadata: { questionId: 'q1' },
        path: '/question/1',
        referrer: '/home',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        clientTime: new Date(timestamp)
      }
    });

    expect(result.id).toBe('log1');
  });

  it('应当在部分字段缺省时写入 null', async () => {
    (prismaAny.behaviorLog.create as jest.Mock).mockResolvedValue({
      id: 'log2'
    });

    await behaviorLogService.logSingle({
      type: 'page_view'
    });

    expect(prismaAny.behaviorLog.create).toHaveBeenCalledWith({
      data: {
        userId: null,
        sessionId: null,
        eventType: 'page_view',
        metadata: undefined,
        path: null,
        referrer: null,
        userAgent: null,
        ipAddress: null,
        clientTime: null
      }
    });
  });

  it('应当在事件类型为空时抛出 VALIDATION_ERROR', async () => {
    await expect(
      behaviorLogService.logSingle({ type: '' } as any)
    ).rejects.toMatchObject<Partial<AppError>>({
      code: 'VALIDATION_ERROR',
      status: 400
    });
    expect(prismaAny.behaviorLog.create).not.toHaveBeenCalled();
  });

  it('应当在事件类型过长时抛出 VALIDATION_ERROR', async () => {
    const longType = 'x'.repeat(51);

    await expect(
      behaviorLogService.logSingle({ type: longType })
    ).rejects.toMatchObject<Partial<AppError>>({
      code: 'VALIDATION_ERROR',
      status: 400
    });
    expect(prismaAny.behaviorLog.create).not.toHaveBeenCalled();
  });
});
