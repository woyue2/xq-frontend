import { ClassHoursService } from '../../services/class-hours.service';
import { prisma } from '../../config/database';
import { AppError } from '../../errors/AppError';

const service = new ClassHoursService();
const prismaAny = prisma as any;

describe('ClassHoursService - 单元测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    prismaAny.user = {
      findUnique: jest.fn(),
      update: jest.fn()
    };
    prismaAny.userWhitelist = {
      findUnique: jest.fn(),
      update: jest.fn()
    };
    prismaAny.$transaction = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getUserClassHours', () => {
    it('应当在用户不存在时抛出 USER_NOT_FOUND', async () => {
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getUserClassHours('missing')).rejects.toMatchObject<
        Partial<AppError>
      >({
        code: 'USER_NOT_FOUND',
        status: 404
      });
    });

    it('应当根据白名单或用户 expiresAt 计算剩余天数与状态', async () => {
      const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        phone: '13800138000',
        nickname: '学生A',
        role: 'student',
        expiresAt: null
      });
      (prismaAny.userWhitelist.findUnique as jest.Mock).mockResolvedValue({
        phone: '13800138000',
        name: '学生A',
        validUntil: future
      });

      const result = await service.getUserClassHours('u1');

      expect(result.userId).toBe('u1');
      expect(result.validUntil).toEqual(future);
      expect(result.isExpired).toBe(false);
      expect(result.remainingDays).toBeGreaterThanOrEqual(4);
      expect(result.status).toBe('active');
    });
  });

  describe('batchUpdate', () => {
    it('应当在用户不存在时返回失败结果并设置原因 USER_NOT_FOUND', async () => {
      (prismaAny.$transaction as jest.Mock).mockImplementation(
        async (fn: (tx: any) => Promise<void>) => {
          const tx = {
            user: {
              findUnique: jest.fn().mockResolvedValue(null),
              update: jest.fn()
            },
            userWhitelist: {
              findUnique: jest.fn(),
              update: jest.fn()
            }
          };
          await fn(tx);
        }
      );

      const result = await service.batchUpdate({
        userIds: ['missing'],
        action: 'extend',
        months: 1
      });

      expect(result.failedCount).toBe(1);
      expect(result.results[0].reason).toBe('USER_NOT_FOUND');
    });

    it('应当在缩短导致过期时返回失败并保留原过期时间', async () => {
      const baseDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

      (prismaAny.$transaction as jest.Mock).mockImplementation(
        async (fn: (tx: any) => Promise<void>) => {
          const tx = {
            user: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'u1',
                phone: '13800138000',
                expiresAt: baseDate
              }),
              update: jest.fn()
            },
            userWhitelist: {
              findUnique: jest.fn().mockResolvedValue(null),
              update: jest.fn()
            }
          };
          await fn(tx);
        }
      );

      const result = await service.batchUpdate({
        userIds: ['u1'],
        action: 'reduce',
        months: 24
      });

      expect(result.failedCount).toBe(1);
      expect(result.results[0].reason).toBe('CANNOT_REDUCE_TO_PAST');
      expect(result.results[0].oldValidUntil).toEqual(baseDate);
      expect(result.results[0].newValidUntil).toEqual(baseDate);
    });

    it('应当在批量延期成功时更新用户与白名单的有效期', async () => {
      const baseDate = new Date();

      const userUpdate = jest.fn();
      const wlUpdate = jest.fn();

      (prismaAny.$transaction as jest.Mock).mockImplementation(
        async (fn: (tx: any) => Promise<void>) => {
          const tx = {
            user: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'u1',
                phone: '13800138000',
                expiresAt: baseDate
              }),
              update: userUpdate
            },
            userWhitelist: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'w1',
                phone: '13800138000',
                validUntil: baseDate
              }),
              update: wlUpdate
            }
          };
          await fn(tx);
        }
      );

      const result = await service.batchUpdate({
        userIds: ['u1'],
        action: 'extend',
        months: 1
      });

      expect(result.successCount).toBe(1);
      expect(userUpdate).toHaveBeenCalled();
      expect(wlUpdate).toHaveBeenCalled();
    });
  });
});

