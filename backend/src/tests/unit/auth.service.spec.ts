import { AuthService } from '../../services/auth.service';
import { prisma } from '../../config/database';
import { AppError } from '../../errors/AppError';
import * as jwtUtils from '../../utils/jwt';

const service = new AuthService();
const prismaAny = prisma as any;

describe('AuthService - 单元测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    prismaAny.verificationCode = {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn()
    };
    prismaAny.user = {
      findUnique: jest.fn(),
      create: jest.fn()
    };
    prismaAny.userWhitelist = {
      findUnique: jest.fn(),
      update: jest.fn()
    };
    prismaAny.refreshToken = {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    };
    prismaAny.loginLog = {
      create: jest.fn()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('sendCode', () => {
    it('应当在手机号格式错误时抛出 INVALID_PHONE_FORMAT', async () => {
      await expect(service.sendCode('123', 'login')).rejects.toMatchObject<
        Partial<AppError>
      >({
        code: 'INVALID_PHONE_FORMAT',
        status: 400
      });
    });

    it('应当成功发送验证码并返回过期与冷却时间', async () => {
      (prismaAny.verificationCode.create as jest.Mock).mockResolvedValue({});

      const result = await service.sendCode('13800138000', 'login');

      expect(result.phone).toBe('13800138000');
      expect(result.expireIn).toBeGreaterThan(0);
      expect(result.cooldown).toBeGreaterThan(0);
      expect(prismaAny.verificationCode.create).toHaveBeenCalled();
    });

    it('应当对同一手机号在冷却时间内进行限流', async () => {
      (prismaAny.verificationCode.create as jest.Mock).mockResolvedValue({});

      const nowSpy = jest.spyOn(Date, 'now');

      // 第一次发送在 t = 60s 之后，确保 diffSeconds >= 60 不限流
      nowSpy.mockReturnValueOnce(60 * 1000);
      await service.sendCode('13900139000', 'login');

      // 30 秒后再次发送，仍在 60 秒冷却窗口内
      nowSpy.mockReturnValueOnce(90 * 1000);

      await expect(
        service.sendCode('13900139000', 'login')
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'TOO_MANY_REQUESTS',
        status: 429
      });

      nowSpy.mockRestore();
    });
  });

  describe('login', () => {
    it('应当在手机号格式错误时抛出 INVALID_PHONE_FORMAT', async () => {
      await expect(service.login('123', '123456')).rejects.toMatchObject<
        Partial<AppError>
      >({
        code: 'INVALID_PHONE_FORMAT'
      });
    });

    it('应当在验证码不存在或不匹配时抛出 INVALID_CODE', async () => {
      (prismaAny.verificationCode.findFirst as jest.Mock).mockResolvedValue(
        null
      );

      await expect(
        service.login('13800138000', '000000')
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'INVALID_CODE'
      });
    });

    it('应当在用户不存在时抛出 USER_NOT_FOUND', async () => {
      (prismaAny.verificationCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'vc1',
        phone: '13800138000',
        code: '123456',
        type: 'login',
        used: false,
        expireAt: new Date(Date.now() + 60 * 1000)
      });
      (prismaAny.verificationCode.update as jest.Mock).mockResolvedValue({});
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login('13800138000', '123456')
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'USER_NOT_FOUND',
        status: 404
      });
    });

    it('应当在用户被禁用时抛出 USER_DISABLED', async () => {
      (prismaAny.verificationCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'vc1',
        phone: '13800138000',
        code: '123456',
        type: 'login',
        used: false,
        expireAt: new Date(Date.now() + 60 * 1000)
      });
      (prismaAny.verificationCode.update as jest.Mock).mockResolvedValue({});
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user1',
        phone: '13800138000',
        nickname: '禁用用户',
        avatar: null,
        role: 'student',
        grade: null,
        age: null,
        school: null,
        isActive: false,
        isBanned: false
      });

      await expect(
        service.login('13800138000', '123456')
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'USER_DISABLED',
        status: 403
      });
    });

    it('应当在登录成功时返回 token 与用户信息', async () => {
      (prismaAny.verificationCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'vc1',
        phone: '13800138000',
        code: '123456',
        type: 'login',
        used: false,
        expireAt: new Date(Date.now() + 60 * 1000)
      });
      (prismaAny.verificationCode.update as jest.Mock).mockResolvedValue({});
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user1',
        phone: '13800138000',
        nickname: '测试用户',
        avatar: null,
        role: 'student',
        grade: null,
        age: null,
        school: null,
        isActive: true,
        isBanned: false
      });
      (prismaAny.refreshToken.create as jest.Mock).mockResolvedValue({});
      (prismaAny.loginLog.create as jest.Mock).mockResolvedValue({});

      const signAccessSpy = jest
        .spyOn(jwtUtils, 'signAccessToken')
        .mockReturnValue('access-token');
      const signRefreshSpy = jest
        .spyOn(jwtUtils, 'signRefreshToken')
        .mockReturnValue('refresh-token');

      const result = await service.login('13800138000', '123456');

      expect(signAccessSpy).toHaveBeenCalled();
      expect(signRefreshSpy).toHaveBeenCalled();
      expect(result.token).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.id).toBe('user1');
      expect(result.user.phone).toBe('13800138000');
    });
  });

  describe('register', () => {
    it('应当在缺少昵称时抛出 MISSING_REQUIRED_FIELD', async () => {
      await expect(
        service.register({
          phone: '13800138000',
          code: '123456'
        } as any)
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'MISSING_REQUIRED_FIELD'
      });
    });

    it('应当在验证码无效时抛出 INVALID_CODE', async () => {
      (prismaAny.verificationCode.findFirst as jest.Mock).mockResolvedValue(
        null
      );

      await expect(
        service.register({
          phone: '13800138000',
          code: '000000',
          nickname: '新用户'
        })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'INVALID_CODE'
      });
    });

    it('应当在手机号已注册时抛出 USER_EXISTS', async () => {
      (prismaAny.verificationCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'vc1',
        phone: '13800138000',
        code: '123456',
        type: 'register',
        used: false,
        expireAt: new Date(Date.now() + 60 * 1000)
      });
      (prismaAny.verificationCode.update as jest.Mock).mockResolvedValue({});
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user1'
      });

      await expect(
        service.register({
          phone: '13800138000',
          code: '123456',
          nickname: '已存在用户'
        })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'USER_EXISTS',
        status: 409
      });
    });

    it('应当在注册成功时返回 token 与用户信息', async () => {
      (prismaAny.verificationCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'vc1',
        phone: '13800138000',
        code: '123456',
        type: 'register',
        used: false,
        expireAt: new Date(Date.now() + 60 * 1000)
      });
      (prismaAny.verificationCode.update as jest.Mock).mockResolvedValue({});
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaAny.user.create as jest.Mock).mockResolvedValue({
        id: 'user1',
        phone: '13800138000',
        nickname: '新用户',
        avatar: null,
        role: 'student',
        grade: null,
        age: null,
        school: null,
        expiresAt: null
      });
      (prismaAny.userWhitelist.findUnique as jest.Mock).mockResolvedValue(
        null
      );
      (prismaAny.refreshToken.create as jest.Mock).mockResolvedValue({});

      const signAccessSpy = jest
        .spyOn(jwtUtils, 'signAccessToken')
        .mockReturnValue('access-token');
      const signRefreshSpy = jest
        .spyOn(jwtUtils, 'signRefreshToken')
        .mockReturnValue('refresh-token');

      const result = await service.register({
        phone: '13800138000',
        code: '123456',
        nickname: '新用户'
      });

      expect(signAccessSpy).toHaveBeenCalled();
      expect(signRefreshSpy).toHaveBeenCalled();
      expect(result.user.id).toBe('user1');
      expect(result.token).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });
  });

  describe('refreshToken', () => {
    it('应当在未提供 RefreshToken 时抛出 UNAUTHORIZED', async () => {
      await expect(service.refreshToken('')).rejects.toMatchObject<
        Partial<AppError>
      >({
        code: 'UNAUTHORIZED'
      });
    });

    it('应当在 JWT 解析失败时抛出 TOKEN_EXPIRED', async () => {
      jest.spyOn(jwtUtils, 'verifyToken').mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        service.refreshToken('bad-token')
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'TOKEN_EXPIRED'
      });
    });

    it('应当在 RefreshToken 记录过期或撤销时抛出 TOKEN_EXPIRED', async () => {
      jest.spyOn(jwtUtils, 'verifyToken').mockReturnValue({
        sub: 'user1',
        role: 'student',
        type: 'refresh'
      } as any);

      (prismaAny.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'rt1',
        userId: 'user1',
        token: 'old-token',
        revoked: false,
        expiresAt: new Date(Date.now() - 1000)
      });
      (prismaAny.refreshToken.update as jest.Mock).mockResolvedValue({});

      await expect(
        service.refreshToken('old-token')
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'TOKEN_EXPIRED'
      });
    });

    it('应当在 RefreshToken 有效时返回新的访问令牌', async () => {
      jest.spyOn(jwtUtils, 'verifyToken').mockReturnValue({
        sub: 'user1',
        role: 'student',
        type: 'refresh'
      } as any);

      (prismaAny.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'rt1',
        userId: 'user1',
        token: 'old-token',
        revoked: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60)
      });
      (prismaAny.refreshToken.update as jest.Mock).mockResolvedValue({});
      (prismaAny.refreshToken.create as jest.Mock).mockResolvedValue({});

      jest
        .spyOn(jwtUtils, 'signAccessToken')
        .mockReturnValue('new-access-token');
      jest
        .spyOn(jwtUtils, 'signRefreshToken')
        .mockReturnValue('new-refresh-token');

      const result = await service.refreshToken('old-token');

      expect(result.token).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });
  });

  describe('logout', () => {
    it('应当在未提供访问令牌时抛出 UNAUTHORIZED', async () => {
      await expect(service.logout('')).rejects.toMatchObject<
        Partial<AppError>
      >({
        code: 'UNAUTHORIZED'
      });
    });

    it('应当在访问令牌已过期时静默返回', async () => {
      jest.spyOn(jwtUtils, 'verifyToken').mockImplementation(() => {
        throw new Error('expired');
      });

      await expect(service.logout('expired-token')).resolves.toBeUndefined();
    });

    it('应当在访问令牌有效时撤销用户所有 RefreshToken', async () => {
      jest.spyOn(jwtUtils, 'verifyToken').mockReturnValue({
        sub: 'user1',
        role: 'student',
        type: 'access'
      } as any);

      (prismaAny.refreshToken.updateMany as jest.Mock).mockResolvedValue({});

      await service.logout('valid-token');

      expect(prismaAny.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          revoked: false
        },
        data: {
          revoked: true
        }
      });
    });
  });

  describe('me', () => {
    it('应当在用户不存在时抛出 USER_NOT_FOUND', async () => {
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.me('missing')).rejects.toMatchObject<
        Partial<AppError>
      >({
        code: 'USER_NOT_FOUND',
        status: 404
      });
    });

    it('应当返回当前用户的基本信息', async () => {
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user1',
        phone: '13800138000',
        nickname: '测试用户',
        avatar: null,
        role: 'student',
        grade: null,
        age: null,
        school: null,
        expiresAt: null
      });

      const result = await service.me('user1');

      expect(result.id).toBe('user1');
      expect(result.phone).toBe('13800138000');
      expect(result.role).toBe('student');
    });
  });
});
