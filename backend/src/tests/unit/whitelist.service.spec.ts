import { WhitelistService } from '../../services/whitelist.service';
import { prisma } from '../../config/database';
import { AppError } from '../../errors/AppError';

const service = new WhitelistService();
const prismaAny = prisma as any;

describe('WhitelistService - 单元测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    prismaAny.userWhitelist = {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    };
    prismaAny.user = {
      update: jest.fn()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('应当在手机号格式错误时抛出 VALIDATION_ERROR', async () => {
      await expect(
        service.create({
          phone: '123',
          name: '张三',
          role: 'student',
          createdBy: 'admin'
        } as any)
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'VALIDATION_ERROR'
      });
    });

    it('应当在姓名缺失时抛出 VALIDATION_ERROR', async () => {
      await expect(
        service.create({
          phone: '13800138000',
          name: '',
          role: 'student',
          createdBy: 'admin'
        })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'VALIDATION_ERROR'
      });
    });

    it('应当在角色非法时抛出 VALIDATION_ERROR', async () => {
      await expect(
        service.create({
          phone: '13800138000',
          name: '张三',
          role: 'invalid' as any,
          createdBy: 'admin'
        })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'VALIDATION_ERROR'
      });
    });

    it('应当在手机号已存在且未删除时抛出 PHONE_EXISTS', async () => {
      (prismaAny.userWhitelist.findUnique as jest.Mock).mockResolvedValue({
        id: 'w1',
        phone: '13800138000',
        deletedAt: null
      });

      await expect(
        service.create({
          phone: '13800138000',
          name: '张三',
          role: 'student',
          createdBy: 'admin'
        })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'PHONE_EXISTS',
        status: 409
      });
    });

    it('应当在创建成功时返回记录与 createdBy', async () => {
      (prismaAny.userWhitelist.findUnique as jest.Mock).mockResolvedValue(
        null
      );
      (prismaAny.userWhitelist.create as jest.Mock).mockResolvedValue({
        id: 'w1',
        phone: '13800138000',
        name: '张三',
        role: 'student',
        validUntil: null,
        notes: null,
        isRegistered: false,
        deletedAt: null,
        deletedBy: null
      });

      const result = await service.create({
        phone: '13800138000',
        name: '张三',
        role: 'student',
        createdBy: 'admin'
      });

      expect(result.id).toBe('w1');
      expect(result.createdBy).toBe('admin');
    });
  });

  describe('list', () => {
    it('应当返回分页结果与统计信息', async () => {
      (prismaAny.userWhitelist.findMany as jest.Mock).mockResolvedValue([
        { id: 'w1' },
        { id: 'w2' }
      ]);
      (prismaAny.userWhitelist.count as jest.Mock)
        .mockResolvedValueOnce(2) // total
        .mockResolvedValueOnce(1) // registered
        .mockResolvedValueOnce(1) // pending
        .mockResolvedValueOnce(1) // students
        .mockResolvedValueOnce(0) // parents
        .mockResolvedValueOnce(1); // teachers

      const result = await service.list({
        page: 1,
        pageSize: 10,
        role: 'student',
        status: 'registered',
        search: '张',
        searchField: 'name'
      });

      expect(result.list).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.statistics.registered).toBe(1);
      expect(prismaAny.userWhitelist.findMany).toHaveBeenCalled();
    });

    it('应当在 page/pageSize 非法时回退到安全默认值', async () => {
      (prismaAny.userWhitelist.findMany as jest.Mock).mockResolvedValue([]);
      (prismaAny.userWhitelist.count as jest.Mock)
        .mockResolvedValueOnce(0) // total
        .mockResolvedValueOnce(0) // registered
        .mockResolvedValueOnce(0) // pending
        .mockResolvedValueOnce(0) // students
        .mockResolvedValueOnce(0) // parents
        .mockResolvedValueOnce(0); // teachers

      const result = await service.list({
        page: -1,
        pageSize: 1000
      } as any);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
      expect(result.pagination.totalPages).toBe(0);
      expect(prismaAny.userWhitelist.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
    });
  });

  describe('update', () => {
    it('应当在记录不存在或已删除时抛出 WHITELIST_NOT_FOUND', async () => {
      (prismaAny.userWhitelist.findUnique as jest.Mock).mockResolvedValue(
        null
      );

      await expect(
        service.update('missing', { validUntil: new Date() })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'WHITELIST_NOT_FOUND',
        status: 404
      });
    });

    it('应当在更新成功且关联用户存在时同步用户课时', async () => {
      const now = new Date();
      (prismaAny.userWhitelist.findUnique as jest.Mock).mockResolvedValue({
        id: 'w1',
        userId: 'u1',
        deletedAt: null
      });
      (prismaAny.userWhitelist.update as jest.Mock).mockResolvedValue({
        id: 'w1',
        userId: 'u1',
        validUntil: now
      });

      await service.update('w1', { validUntil: now });

      expect(prismaAny.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          expiresAt: now,
          isActive: true
        }
      });
    });
  });

  describe('remove', () => {
    it('应当在记录不存在或已删除时抛出 WHITELIST_NOT_FOUND', async () => {
      (prismaAny.userWhitelist.findUnique as jest.Mock).mockResolvedValue(
        null
      );

      await expect(
        service.remove('missing', { deletedBy: 'admin' })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'WHITELIST_NOT_FOUND',
        status: 404
      });
    });

    it('应当在记录关联已注册用户时返回 warning 并禁用用户', async () => {
      (prismaAny.userWhitelist.findUnique as jest.Mock).mockResolvedValue({
        id: 'w1',
        userId: 'u1',
        deletedAt: null
      });
      (prismaAny.userWhitelist.update as jest.Mock).mockResolvedValue({});

      const result = await service.remove('w1', { deletedBy: 'admin' });

      expect(prismaAny.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          isActive: false
        }
      });
      expect(result.warning).toBeDefined();
    });

    it('应当在记录未关联用户时不返回 warning', async () => {
      (prismaAny.userWhitelist.findUnique as jest.Mock).mockResolvedValue({
        id: 'w1',
        userId: null,
        deletedAt: null
      });
      (prismaAny.userWhitelist.update as jest.Mock).mockResolvedValue({});

      const result = await service.remove('w1', { deletedBy: 'admin' });

      expect(prismaAny.user.update).not.toHaveBeenCalled();
      expect(result.warning).toBeUndefined();
    });
  });
});
