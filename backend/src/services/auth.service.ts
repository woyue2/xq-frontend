import { AppError } from '../errors/AppError';
import { prisma } from '../config/database';
import {
  signAccessToken,
  signRefreshToken,
  type JwtPayloadBase,
  verifyToken
} from '../utils/jwt';
import bcrypt from 'bcryptjs';
import { coreLogger } from '../middlewares/logger.middleware';

type SendCodeType = 'login' | 'register' | 'bind_child' | 'reset_password';

interface SendCodeResult {
  phone: string;
  expireIn: number;
  cooldown: number;
}

// 简单的内存级验证码限流与存储（生产环境建议使用 Redis + DB）
const lastSendMap = new Map<string, number>();
const CODE_EXPIRE_SECONDS = 300;
const SEND_COOLDOWN_SECONDS = 60;
const FIXED_CODE = '123456'; // 方便联调与测试环境

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class AuthService {
  // 发送验证码
  async sendCode(phone: string, type: SendCodeType = 'login'): Promise<SendCodeResult> {
    // 对手机号做一次规范化，兼容带空格/短横线等情况（仅保留数字）
    const normalizedPhone = phone.replace(/\D/g, '');

    if (!/^\d{11}$/.test(normalizedPhone)) {
      throw new AppError(
        400,
        'INVALID_PHONE_FORMAT',
        '手机号格式错误',
        undefined,
        1001
      );
    }

    // 注册场景需要先校验白名单
    if (type === 'register') {
      try {
        const wl = await prisma.userWhitelist.findUnique({
          where: { phone: normalizedPhone }
        });

        if (!wl || wl.deletedAt) {
          throw new AppError(
            403,
            'NOT_IN_WHITELIST',
            '该手机号暂未开通注册权限，请联系管理员',
            undefined,
            4001
          );
        }
      } catch (err) {
        if (err instanceof AppError) {
          throw err;
        }
        // 生产环境下白名单表不可用视为服务异常；开发/测试环境可降级以保证联调体验
        if (process.env.NODE_ENV === 'production') {
          throw new AppError(
            500,
            'INTERNAL_SERVER_ERROR',
            '验证码服务暂不可用，请稍后重试'
          );
        }
        // 在非生产环境中，出于兼容性考虑暂不强制白名单，并记录降级日志
        coreLogger.warn(
          {
            mode: 'degraded',
            feature: 'auth.sendCode',
            env: process.env.NODE_ENV ?? 'unknown',
            reason: 'userWhitelist lookup failed, skip in non-production'
          },
          'Auth sendCode degraded: whitelist check skipped'
        );
      }
    }

    const key = `${type}:${normalizedPhone}`;
    const now = Date.now();
    const last = lastSendMap.get(key) ?? 0;
    const diffSeconds = Math.floor((now - last) / 1000);

    if (diffSeconds < SEND_COOLDOWN_SECONDS) {
      const retryAfter = SEND_COOLDOWN_SECONDS - diffSeconds;
      throw new AppError(429, 'TOO_MANY_REQUESTS', '验证码发送过于频繁，请稍后再试', {
        retryAfter
      });
    }

    // 对登录/绑定/重置场景提前做账号存在性检查
    if (type === 'login' || type === 'reset_password' || type === 'bind_child') {
      try {
        const user = await prisma.user.findUnique({
          where: { phone: normalizedPhone }
        });

        if (!user) {
          throw new AppError(
            404,
            'USER_NOT_FOUND',
            '账号不存在，请先注册',
            undefined,
            4002
          );
        }

        if (!user.isActive || user.isBanned) {
          throw new AppError(
            403,
            'USER_DISABLED',
            '账号已被停用，请联系管理员',
            undefined,
            4003
          );
        }
      } catch (err) {
        if (err instanceof AppError) {
          throw err;
        }
        // 在生产环境中，用户表不可用视为服务异常
        if (process.env.NODE_ENV === 'production') {
          throw new AppError(
            500,
            'INTERNAL_SERVER_ERROR',
            '验证码服务暂不可用，请稍后重试'
          );
        }
      }
    }

    lastSendMap.set(key, now);

    const isProd = process.env.NODE_ENV === 'production';
    const useRandomCode =
      isProd || process.env.AUTH_FORCE_RANDOM_CODE === 'true';
    const codeToSave = useRandomCode ? generateVerificationCode() : FIXED_CODE;

    // 记录验证码到数据库：如果写入失败，必须显式抛错，避免“空保存”导致后续登录必然失败
    try {
      await prisma.verificationCode.create({
        data: {
          phone: normalizedPhone,
          code: codeToSave,
          type,
          expireAt: new Date(now + CODE_EXPIRE_SECONDS * 1000)
        }
      });
    } catch (err) {
      throw new AppError(
        500,
        'INTERNAL_SERVER_ERROR',
        '验证码服务暂不可用，请稍后重试'
      );
    }

    return {
      phone: normalizedPhone,
      expireIn: CODE_EXPIRE_SECONDS,
      cooldown: SEND_COOLDOWN_SECONDS
    };
  }

  // 登录
  async login(phone: string, code: string) {
    const normalizedPhone = phone.replace(/\D/g, '');

    if (!/^\d{11}$/.test(normalizedPhone)) {
      throw new AppError(
        400,
        'INVALID_PHONE_FORMAT',
        '手机号格式错误',
        undefined,
        1001
      );
    }

    const record = await prisma.verificationCode.findFirst({
      where: {
        phone: normalizedPhone,
        type: 'login',
        used: false
      },
      orderBy: { createdAt: 'desc' }
    });

    if (
      !record ||
      record.code !== code ||
      record.expireAt.getTime() < Date.now()
    ) {
      throw new AppError(
        400,
        'INVALID_CODE',
        '验证码错误或已过期',
        undefined,
        1002
      );
    }

    // 标记验证码已使用
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { used: true, usedAt: new Date() }
    });

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { phone: normalizedPhone }
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', '账号不存在，请先注册');
    }

    if (!user.isActive || user.isBanned) {
      throw new AppError(
        403,
        'USER_DISABLED',
        '账号已被停用，请联系管理员',
        undefined,
        4003
      );
    }

    // 可选：在登录阶段强制校验白名单与课时有效期（由环境变量控制）
    if (process.env.AUTH_STRICT_WHITELIST_FOR_LOGIN === 'true') {
      try {
        const wl = await prisma.userWhitelist.findUnique({
          where: { phone: normalizedPhone }
        });

        if (!wl || wl.deletedAt) {
          throw new AppError(
            403,
            'NOT_IN_WHITELIST',
            '该手机号暂未开通登录权限，请联系管理员',
            undefined,
            4001
          );
        }

        if (wl.validUntil && wl.validUntil.getTime() < Date.now()) {
          throw new AppError(
            403,
            'CLASS_HOUR_EXPIRED',
            '课时已过期，请联系老师续费',
            undefined,
            4004
          );
        }
      } catch (err) {
        if (err instanceof AppError) {
          throw err;
        }
        // 在生产环境中，白名单表不可用视为服务异常；开发/测试环境下可降级以保证联调体验
        if (process.env.NODE_ENV === 'production') {
          throw new AppError(
            500,
            'INTERNAL_SERVER_ERROR',
            '登录服务暂不可用，请稍后重试'
          );
        }
        coreLogger.warn(
          {
            mode: 'degraded',
            feature: 'auth.login',
            env: process.env.NODE_ENV ?? 'unknown',
            reason: 'userWhitelist lookup failed during login, skip in non-production'
          },
          'Auth login degraded: whitelist check skipped'
        );
      }
    }

    const payload: JwtPayloadBase = { sub: user.id, role: user.role };
    const token = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // 记录 RefreshToken，便于后续刷新与注销
    try {
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    } catch {
      // 测试/开发环境下数据库不可用时忽略
    }

    // 记录登录日志
    await prisma.loginLog.create({
      data: {
        userId: user.id,
        success: true
      }
    });

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar ?? undefined,
        role: user.role,
        grade: user.grade ?? undefined,
        age: user.age ?? undefined,
        school: user.school ?? undefined,
        // 课时有效期与权限等高级字段后续接入
        expiresAt: undefined,
        isValidMember: undefined,
        permissions: undefined
      }
    };
  }

  // 使用密码登录（不依赖短信验证码）
  async passwordLogin(phone: string, password: string) {
    const normalizedPhone = phone.replace(/\D/g, '');

    if (!/^\d{11}$/.test(normalizedPhone)) {
      throw new AppError(
        400,
        'INVALID_PHONE_FORMAT',
        '手机号格式错误',
        undefined,
        1001
      );
    }

    if (!password || password.length < 8) {
      throw new AppError(
        400,
        'INVALID_PASSWORD_FORMAT',
        '密码至少需 8 位',
        undefined,
        1005
      );
    }

    const user = await prisma.user.findUnique({
      where: { phone: normalizedPhone }
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', '账号不存在，请先注册');
    }

    if (!user.passwordHash) {
      throw new AppError(
        400,
        'PASSWORD_NOT_SET',
        '该账号尚未设置密码，请使用验证码登录'
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new AppError(
        400,
        'INVALID_PASSWORD',
        '密码错误',
        undefined,
        1006
      );
    }

    if (!user.isActive || user.isBanned) {
      throw new AppError(
        403,
        'USER_DISABLED',
        '账号已被停用，请联系管理员',
        undefined,
        4003
      );
    }

    // 密码登录同样可以选择启用白名单 + 课时校验
    if (process.env.AUTH_STRICT_WHITELIST_FOR_LOGIN === 'true') {
      try {
        const wl = await prisma.userWhitelist.findUnique({
          where: { phone: normalizedPhone }
        });

        if (!wl || wl.deletedAt) {
          throw new AppError(
            403,
            'NOT_IN_WHITELIST',
            '该手机号暂未开通登录权限，请联系管理员',
            undefined,
            4001
          );
        }

        if (wl.validUntil && wl.validUntil.getTime() < Date.now()) {
          throw new AppError(
            403,
            'CLASS_HOUR_EXPIRED',
            '课时已过期，请联系老师续费',
            undefined,
            4004
          );
        }
      } catch (err) {
        if (err instanceof AppError) {
          throw err;
        }
        if (process.env.NODE_ENV === 'production') {
          throw new AppError(
            500,
            'INTERNAL_SERVER_ERROR',
            '登录服务暂不可用，请稍后重试'
          );
        }
        coreLogger.warn(
          {
            mode: 'degraded',
            feature: 'auth.passwordLogin',
            env: process.env.NODE_ENV ?? 'unknown',
            reason: 'userWhitelist lookup failed during password login, skip in non-production'
          },
          'Auth passwordLogin degraded: whitelist check skipped'
        );
      }
    }

    const payload: JwtPayloadBase = { sub: user.id, role: user.role };
    const token = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    try {
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    } catch {
      // 测试/开发环境下数据库不可用时忽略
    }

    await prisma.loginLog.create({
      data: {
        userId: user.id,
        success: true
      }
    });

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar ?? undefined,
        role: user.role,
        grade: user.grade ?? undefined,
        age: user.age ?? undefined,
        school: user.school ?? undefined,
        expiresAt: user.expiresAt ?? undefined,
        isValidMember: undefined,
        permissions: undefined
      }
    };
  }

  // 注册
  async register(params: {
    phone: string;
    code: string;
    nickname?: string;
    grade?: string;
    age?: number;
    school?: string;
    role?: 'student' | 'teacher' | 'parent';
    password?: string;
  }) {
    const {
      phone,
      code,
      nickname,
      grade,
      age,
      school,
      role: requestedRole,
      password
    } = params;

    // 昵称非必填，若未填写则生成默认昵称
    const effectiveNickname = nickname || `用户_${phone.slice(-4)}`;

    const normalizedPhone = phone.replace(/\D/g, '');

    if (!/^\d{11}$/.test(normalizedPhone)) {
      throw new AppError(
        400,
        'INVALID_PHONE_FORMAT',
        '手机号格式错误',
        undefined,
        1001
      );
    }

    if (!password || password.length < 8) {
      throw new AppError(
        400,
        'INVALID_PASSWORD_FORMAT',
        '密码至少需 8 位',
        undefined,
        1005
      );
    }

    // 校验验证码（注册场景优先使用 type=register）
    let record = null;
    const isProd = process.env.NODE_ENV === 'production';
    try {
      record = await prisma.verificationCode.findFirst({
        where: {
          phone: normalizedPhone,
          type: 'register',
          used: false
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch {
      // 测试/开发环境无表时忽略，允许使用固定验证码
    }

    const invalidCode = isProd
      ? !record ||
      record.code !== code ||
      record.expireAt.getTime() < Date.now()
      : (!record && code !== FIXED_CODE) ||
      (record &&
        (record.code !== code ||
          record.expireAt.getTime() < Date.now()));

    if (invalidCode) {
      throw new AppError(
        400,
        'INVALID_CODE',
        '验证码错误或已过期',
        undefined,
        1002
      );
    }

    if (record) {
      await prisma.verificationCode.update({
        where: { id: record.id },
        data: { used: true, usedAt: new Date() }
      });
    }

    // 检查是否已注册
    try {
      const existing = await prisma.user.findUnique({
        where: { phone: normalizedPhone }
      });
      if (existing) {
        throw new AppError(
          409,
          'USER_EXISTS',
          '该手机号已注册，请直接登录',
          undefined,
          4002
        );
      }
    } catch (err) {
      if (err instanceof AppError) {
        // 业务性错误需要向上抛出，不能被“数据库不可用”降级逻辑吞掉
        throw err;
      }
      // 数据库不可用时视为未注册（仅限测试/开发环境）
    }

    // 默认角色：优先使用前端请求的角色（student/teacher/parent），如白名单存在则以白名单为准
    const normalizedRole: 'student' | 'teacher' | 'parent' =
      requestedRole && ['student', 'teacher', 'parent'].includes(requestedRole)
        ? requestedRole
        : 'student';

    let role: 'student' | 'teacher' | 'parent' = normalizedRole;
    let effectiveGrade = grade;
    let expiresAt: Date | undefined;

    try {
      const wl = await prisma.userWhitelist.findUnique({
        where: { phone: normalizedPhone }
      });
      if (wl) {
        // 白名单中的角色字段为 string，这里限制为受支持的三种角色之一
        if (
          wl.role === 'student' ||
          wl.role === 'teacher' ||
          wl.role === 'parent'
        ) {
          role = wl.role;
        } else {
          role = 'student';
        }
        effectiveGrade = effectiveGrade ?? wl.grade ?? undefined;
        expiresAt = wl.validUntil ?? undefined;

        await prisma.userWhitelist.update({
          where: { id: wl.id },
          data: {
            isRegistered: true,
            registeredAt: new Date()
          }
        });
      }
    } catch (err) {
      // 生产环境中白名单表不可用视为服务异常；开发/测试环境下继续使用默认角色
      if (process.env.NODE_ENV === 'production') {
        throw new AppError(
          500,
          'INTERNAL_SERVER_ERROR',
          '注册服务暂不可用，请稍后重试'
        );
      }
      coreLogger.warn(
        {
          mode: 'degraded',
          feature: 'auth.register',
          env: process.env.NODE_ENV ?? 'unknown',
          reason: 'userWhitelist lookup failed during register, continue with default role'
        },
        'Auth register degraded: whitelist check skipped'
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user;
    try {
      user = await prisma.user.create({
        data: {
          phone: normalizedPhone,
          nickname: effectiveNickname,
          avatar: null,
          role,
          grade: effectiveGrade,
          age: age ?? null,
          school: school ?? null,
          expiresAt,
          passwordHash,
          isActive: true,
          isBanned: false
        }
      });
    } catch (err) {
      // 生产环境禁止降级为内存用户，数据库异常视为注册失败
      if (process.env.NODE_ENV === 'production') {
        throw new AppError(
          500,
          'INTERNAL_SERVER_ERROR',
          '注册服务暂不可用，请稍后重试'
        );
      }

      // 在开发/测试环境下，保留原有的内存降级策略，便于无数据库时联调前端
      coreLogger.warn(
        {
          mode: 'degraded',
          feature: 'auth.register',
          env: process.env.NODE_ENV ?? 'unknown',
          reason: 'prisma.user.create failed, fallback to in-memory user'
        },
        'Auth register degraded: fallback to in-memory user'
      );
      user = {
        id: `user_${Date.now()}`,
        phone: normalizedPhone,
        nickname: effectiveNickname,
        avatar: null,
        role,
        grade: effectiveGrade ?? null,
        age: age ?? null,
        school: school ?? null,
        expiresAt: expiresAt ?? null,
        passwordHash,
        isActive: true,
        isBanned: false,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
    }

    const payload: JwtPayloadBase = { sub: user.id, role: user.role };
    const token = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    try {
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    } catch (err) {
      // 生产环境中，RefreshToken 持久化失败视为注册失败，避免令牌状态与数据库不一致
      if (process.env.NODE_ENV === 'production') {
        throw new AppError(
          500,
          'INTERNAL_SERVER_ERROR',
          '注册服务暂不可用，请稍后重试'
        );
      }
      // 开发/测试环境下忽略数据库错误，便于在无数据库时联调
      coreLogger.warn(
        {
          mode: 'degraded',
          feature: 'auth.register',
          env: process.env.NODE_ENV ?? 'unknown',
          reason: 'refreshToken create failed during register, ignored in non-production'
        },
        'Auth register degraded: refreshToken persist failed (ignored in non-production)'
      );
    }

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar ?? undefined,
        role: user.role,
        grade: user.grade ?? undefined,
        age: user.age ?? undefined,
        school: user.school ?? undefined,
        expiresAt: user.expiresAt ?? undefined,
        isValidMember: undefined,
        permissions: undefined
      }
    };
  }

  // 使用 RefreshToken 刷新访问令牌
  async refreshToken(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new AppError(
        401,
        'UNAUTHORIZED',
        '未提供RefreshToken'
      );
    }

    let payload: any;
    try {
      payload = verifyToken(rawRefreshToken);
    } catch {
      throw new AppError(
        401,
        'TOKEN_EXPIRED',
        'RefreshToken已过期，请重新登录'
      );
    }

    if (payload.type !== 'refresh' || !payload.sub) {
      throw new AppError(
        401,
        'TOKEN_EXPIRED',
        'RefreshToken已过期，请重新登录'
      );
    }

    // 检查数据库中的 RefreshToken 记录
    try {
      const record = await prisma.refreshToken.findUnique({
        where: { token: rawRefreshToken }
      });

      if (!record || record.revoked || record.expiresAt.getTime() < Date.now()) {
        if (record && !record.revoked) {
          await prisma.refreshToken.update({
            where: { id: record.id },
            data: { revoked: true }
          });
        }

        throw new AppError(
          401,
          'TOKEN_EXPIRED',
          'RefreshToken已过期，请重新登录'
        );
      }

      // 标记旧的 RefreshToken 为已失效
      await prisma.refreshToken.update({
        where: { id: record.id },
        data: { revoked: true }
      });
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      // 生产环境中数据库不可用视为服务异常；开发/测试环境下退化为仅依赖 JWT 过期时间
      if (process.env.NODE_ENV === 'production') {
        throw new AppError(
          500,
          'INTERNAL_SERVER_ERROR',
          '刷新登录状态失败，请稍后重试'
        );
      }
      coreLogger.warn(
        {
          mode: 'degraded',
          feature: 'auth.refreshToken',
          env: process.env.NODE_ENV ?? 'unknown',
          reason: 'refreshToken lookup failed, fallback to JWT expiry only'
        },
        'Auth refreshToken degraded: DB lookup failed, fallback to JWT-only check'
      );
    }

    const basePayload: JwtPayloadBase = {
      sub: payload.sub,
      role: payload.role
    };

    const newAccessToken = signAccessToken(basePayload);
    const newRefreshToken = signRefreshToken(basePayload);

    try {
      await prisma.refreshToken.create({
        data: {
          userId: payload.sub as string,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    } catch {
      // 忽略本地/测试环境下的数据库错误
    }

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 7 * 24 * 60 * 60
    };
  }

  // 退出登录：使当前访问令牌及关联的 RefreshToken 失效
  async logout(accessToken: string) {
    if (!accessToken) {
      throw new AppError(401, 'UNAUTHORIZED', '未登录');
    }

    let payload: any;
    try {
      payload = verifyToken(accessToken);
    } catch {
      // token 已过期则视为已退出
      return;
    }

    // 将该用户所有有效 RefreshToken 标记为 revoked
    try {
      await prisma.refreshToken.updateMany({
        where: {
          userId: payload.sub as string,
          revoked: false
        },
        data: {
          revoked: true
        }
      });
    } catch {
      // 测试/开发环境数据库不可用时忽略
    }
  }

  // 获取当前登录用户信息（基于 JWT）
  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
    }

    return {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar ?? undefined,
      role: user.role,
      grade: user.grade ?? undefined,
      age: user.age ?? undefined,
      school: user.school ?? undefined,
      expiresAt: user.expiresAt ?? undefined,
      isValidMember: undefined,
      permissions: undefined
    };
  }

  // 为当前用户设置/更新登录密码
  async setPassword(userId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new AppError(
        400,
        'INVALID_PASSWORD_FORMAT',
        '密码至少需 8 位',
        undefined,
        1005
      );
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hash
      }
    });
  }

  // 通过验证码重置密码
  async resetPasswordWithCode(params: { phone: string; code: string; newPassword: string }) {
    const { phone, code, newPassword } = params;
    const normalizedPhone = phone.replace(/\D/g, '');

    if (!/^\d{11}$/.test(normalizedPhone)) {
      throw new AppError(400, 'INVALID_PHONE_FORMAT', '手机号格式错误');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new AppError(400, 'INVALID_PASSWORD_FORMAT', '密码至少需 8 位');
    }

    const record = await prisma.verificationCode.findFirst({
      where: {
        phone: normalizedPhone,
        type: 'reset_password',
        used: false
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!record || record.code !== code || record.expireAt.getTime() < Date.now()) {
      throw new AppError(400, 'INVALID_CODE', '验证码错误或已过期');
    }

    const user = await prisma.user.findUnique({
      where: { phone: normalizedPhone }
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      }),
      prisma.verificationCode.update({
        where: { id: record.id },
        data: { used: true, usedAt: new Date() }
      }),
      // 重置密码后，使该用户所有旧的 RefreshToken 失效，强制重新登录
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revoked: false },
        data: { revoked: true }
      })
    ]);
  }
}

export const authService = new AuthService();
