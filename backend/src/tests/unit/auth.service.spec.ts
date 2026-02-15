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
    prismaAny.notification = {
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
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-login-001',
        phone: '13800138000',
        isActive: true,
        isBanned: false
      });
      (prismaAny.verificationCode.create as jest.Mock).mockResolvedValue({});

      const result = await service.sendCode('13800138000', 'login');

      expect(result.phone).toBe('13800138000');
      expect(result.expireIn).toBeGreaterThan(0);
      expect(result.cooldown).toBeGreaterThan(0);
      // 修改原因：测试环境改为随机码，断言为 6 位数字即可。
      expect(result.code).toMatch(/^\d{6}$/);
      expect(prismaAny.verificationCode.create).toHaveBeenCalled();
    });

    it('应当对同一手机号在冷却时间内进行限流', async () => {
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-login-002',
        phone: '13900139000',
        isActive: true,
        isBanned: false
      });
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

    it('应当在验证码记录写入失败时抛出内部错误而不是静默成功', async () => {
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-login-003',
        phone: '13700137000',
        isActive: true,
        isBanned: false
      });
      (prismaAny.verificationCode.create as jest.Mock).mockRejectedValue(
        new Error('db error')
      );

      await expect(
        service.sendCode('13700137000', 'login')
      ).rejects.toMatchObject<Partial<AppError>>({
        status: 500,
        code: 'INTERNAL_SERVER_ERROR'
      });
    });

    it('注册发码成功时不应创建老师通知（验证码直发用户）', async () => {
      (prismaAny.userWhitelist.findUnique as jest.Mock).mockResolvedValue({
        id: 'wl-register-001',
        phone: '13800138000',
        role: 'student',
        deletedAt: null
      });
      (prismaAny.verificationCode.create as jest.Mock).mockResolvedValue({});

      const result = await service.sendCode('13800138000', 'register');

      expect(result.phone).toBe('13800138000');
      expect(prismaAny.verificationCode.create).toHaveBeenCalled();
      expect(prismaAny.notification.create).not.toHaveBeenCalled();
    });

    it('绑定孩子发码成功时应写入孩子通知', async () => {
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'child-user-001',
        phone: '13600136000',
        isActive: true,
        isBanned: false
      });
      (prismaAny.verificationCode.create as jest.Mock).mockResolvedValue({});
      (prismaAny.notification.create as jest.Mock).mockResolvedValue({});

      const result = await service.sendCode('13600136000', 'bind_child');

      expect(result.phone).toBe('13600136000');
      expect(prismaAny.verificationCode.create).toHaveBeenCalled();
      expect(prismaAny.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'child-user-001',
            type: 'bind_child_code'
          })
        })
      );
    });

    it('绑定孩子发码时若孩子未注册应抛出 CHILD_NOT_REGISTERED', async () => {
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.sendCode('13600136001', 'bind_child')
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'CHILD_NOT_REGISTERED',
        status: 404
      });
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
      // 必须要有白名单才能登录
      (prismaAny.userWhitelist.findUnique as jest.Mock).mockResolvedValue({
        id: 'wl1',
        phone: '13800138000',
        name: '测试用户',
        role: 'student',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
        isRegistered: true,
        deletedAt: null
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
    it('应当在密码长度不足 8 位时抛出 INVALID_PASSWORD_FORMAT', async () => {
      await expect(
        service.register({
          phone: '13800138000',
          code: '123456',
          nickname: '新用户',
          password: '1234567',
          name: '张三'
        })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'INVALID_PASSWORD_FORMAT',
        status: 400
      });
    });

    it('在缺少昵称时应当自动生成默认昵称', async () => {
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
      (prismaAny.user.create as jest.Mock).mockImplementation((args: any) => {
        return {
          id: 'user1',
          phone: args.data.phone,
          nickname: args.data.nickname,
          avatar: null,
          role: args.data.role,
          grade: args.data.grade,
          age: args.data.age,
          school: args.data.school,
          expiresAt: args.data.expiresAt
        };
      });
      (prismaAny.userWhitelist.findUnique as jest.Mock).mockResolvedValue(
        null
      );
      (prismaAny.refreshToken.create as jest.Mock).mockResolvedValue({});
      (prismaAny.loginLog.create as jest.Mock).mockResolvedValue({});

      jest.spyOn(jwtUtils, 'signAccessToken').mockReturnValue('access-token');
      jest
        .spyOn(jwtUtils, 'signRefreshToken')
        .mockReturnValue('refresh-token');

      const result = await service.register({
        phone: '13800138000',
        code: '123456',
        // 不提供 nickname，期望后端自动生成
        password: '12345678',
        name: '张三'
      } as any);

      expect(result.user.nickname).toBeDefined();
      // 默认昵称以手机号后 4 位拼接，形如 "用户_8000"
      expect(result.user.nickname.startsWith('用户_')).toBe(true);
      expect(result.user.nickname.slice(-4)).toBe('8000');
    });

    it('应当在注册成功时为新用户分配随机默认头像', async () => {
      (prismaAny.verificationCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'vc-avatar-001',
        phone: '13800138000',
        code: '123456',
        type: 'register',
        used: false,
        expireAt: new Date(Date.now() + 60 * 1000)
      });
      (prismaAny.verificationCode.update as jest.Mock).mockResolvedValue({});
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaAny.userWhitelist.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaAny.refreshToken.create as jest.Mock).mockResolvedValue({});
      (prismaAny.loginLog.create as jest.Mock).mockResolvedValue({});
      (prismaAny.user.create as jest.Mock).mockImplementation((args: any) => ({
        id: 'user-avatar-001',
        phone: args.data.phone,
        nickname: args.data.nickname,
        avatar: args.data.avatar,
        role: args.data.role
      }));

      jest.spyOn(jwtUtils, 'signAccessToken').mockReturnValue('access-token');
      jest
        .spyOn(jwtUtils, 'signRefreshToken')
        .mockReturnValue('refresh-token');

      const result = await service.register({
        phone: '13800138000',
        code: '123456',
        password: '12345678',
        name: '张三'
      } as any);

      // 修改原因：注册后 avatar 不应为空，且应命中本地默认头像池路径规则。
      expect(result.user.avatar).toMatch(/^\/avators\/notionists-\d+\.png$/);
      expect(prismaAny.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            avatar: expect.stringMatching(/^\/avators\/notionists-\d+\.png$/)
          })
        })
      );
    });

    it('应当在验证码无效时抛出 INVALID_CODE', async () => {
      (prismaAny.verificationCode.findFirst as jest.Mock).mockResolvedValue(
        null
      );

      await expect(
        service.register({
          phone: '13800138000',
          code: '000000',
          nickname: '新用户',
          password: '12345678',
          name: '张三'
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
          nickname: '新用户',
          password: '12345678',
          name: '张三'
        })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'USER_EXISTS',
        status: 409
      });
    });

    it('应当在请求角色与白名单角色不一致时拒绝注册', async () => {
      (prismaAny.verificationCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'vc-role-mismatch',
        phone: '13800138000',
        code: '123456',
        type: 'register',
        used: false,
        expireAt: new Date(Date.now() + 60 * 1000)
      });
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaAny.userWhitelist.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'wl-role-mismatch',
          phone: '13800138000',
          role: 'student',
          name: '张三'
        })
        .mockResolvedValueOnce({
          id: 'wl-role-mismatch',
          phone: '13800138000',
          role: 'student',
          name: '张三'
        });

      await expect(
        service.register({
          phone: '13800138000',
          code: '123456',
          nickname: '新用户',
          password: '12345678',
          name: '张三',
          role: 'parent'
        })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'ROLE_MISMATCH_WHITELIST',
        status: 403
      });

      expect(prismaAny.user.create).not.toHaveBeenCalled();
    });

    it('应当在注册成功时返回 token 与用户信息', async () => {
      (prismaAny.verificationCode.findFirst as jest.Mock).mockResolvedValue({
        code: '123456',
        expireAt: new Date(Date.now() + 10000),
        used: false
      });
      (prismaAny.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaAny.user.create as jest.Mock).mockResolvedValue({
        id: 'user-new-001',
        phone: '13900139000',
        nickname: '新用户',
        role: 'student',
        name: '张三'
      });
      (prismaAny.userWhitelist.findUnique as jest.Mock).mockResolvedValue({
        phone: '13900139000',
        role: 'student',
        name: '张三'
      });
      (prismaAny.loginLog.create as jest.Mock).mockResolvedValue({});
      (prismaAny.refreshToken.create as jest.Mock).mockResolvedValue({});

      const signAccessSpy = jest
        .spyOn(jwtUtils, 'signAccessToken')
        .mockReturnValue('access-token');
      const signRefreshSpy = jest
        .spyOn(jwtUtils, 'signRefreshToken')
        .mockReturnValue('refresh-token');

      const result = await service.register({
        phone: '13900139000',
        code: '123456',
        nickname: '新用户',
        name: '张三',
        password: '12345678'
      });

      expect(signAccessSpy).toHaveBeenCalled();
      expect(signRefreshSpy).toHaveBeenCalled();
      expect(result.user.id).toBe('user-new-001');
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
