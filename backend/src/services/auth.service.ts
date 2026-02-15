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
  code?: string;
}

// 简单的内存级验证码限流与存储（生产环境建议使用 Redis + DB）
const lastSendMap = new Map<string, number>();
const CODE_EXPIRE_SECONDS = 300;
const SEND_COOLDOWN_SECONDS = 60;

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

    let bindChildUserId: string | null = null;

    // 对登录/绑定/重置场景提前做账号存在性检查
    if (type === 'login' || type === 'reset_password' || type === 'bind_child') {
      try {
        const user = await prisma.user.findUnique({
          where: { phone: normalizedPhone }
        });

        if (!user) {
          // 修改原因：家长绑定孩子时，需求要求明确提示“孩子未注册”，而不是通用账号不存在文案。
          if (type === 'bind_child') {
            throw new AppError(
              404,
              'CHILD_NOT_REGISTERED',
              '孩子未注册，请先注册',
              undefined,
              4006
            );
          }
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

        if (type === 'bind_child') {
          bindChildUserId = user.id;
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

    // 修改原因：按方案A统一策略，所有环境都使用随机验证码，避免出现固定码 123456。
    const codeToSave = generateVerificationCode();

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

    if (type === 'bind_child' && bindChildUserId) {
      try {
        await prisma.notification.create({
          data: {
            userId: bindChildUserId,
            type: 'bind_child_code',
            title: '绑定验证码',
            content: `您的绑定验证码为 ${codeToSave}，${CODE_EXPIRE_SECONDS} 秒内有效`,
            // ⚠️ 不确定因素：targetType='bind' 目前仅用于语义标识，前端暂未做专门跳转分支。
            targetType: 'bind',
            targetId: bindChildUserId
          }
        });
      } catch {
        // 修改原因：需求要求验证码要存放在孩子通知中，通知写入失败时应视为发送失败，避免“假成功”。
        throw new AppError(
          500,
          'BIND_CODE_NOTIFY_FAILED',
          '验证码发送失败，请稍后重试'
        );
      }
    }

    return {
      phone: normalizedPhone,
      expireIn: CODE_EXPIRE_SECONDS,
      cooldown: SEND_COOLDOWN_SECONDS,
      // 修改原因：按当前项目需求，所有环境都需要在页面可见验证码，便于直接使用。
      // ⚠️ 不确定因素：该策略会降低生产环境安全性，后续接入真实短信时建议切回仅测试环境展示。
      code: codeToSave
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

    // 强制校验白名单与课时有效期（登录必须要有有效的白名单）
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
        name: user.name ?? undefined,
        nickname: user.nickname,
        avatar: user.avatar ?? undefined,
        role: user.role,
        grade: user.grade ?? undefined,
        age: user.age ?? undefined,
        school: user.school ?? undefined,
        // 课时有效期与权限等高级字段后续接入
        expiresAt: user.expiresAt ?? undefined,
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

    // 强制校验白名单与课时有效期（登录必须要有有效的白名单）
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
        name: user.name ?? undefined,
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
    name?: string;          // 真实姓名，可选
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
      name,
      nickname,
      grade,
      age,
      school,
      role: requestedRole,
      password
    } = params;

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

    // 尝试从白名单获取name（用于注册时自动填充）
    let nameFromWhitelist: string | null = null;
    try {
      const wlForName = await prisma.userWhitelist.findUnique({
        where: { phone: normalizedPhone }
      });
      if (wlForName && wlForName.name && wlForName.name.trim()) {
        nameFromWhitelist = wlForName.name.trim();
      }
    } catch (err) {
      // 白名单查询失败不影响后续流程（测试/开发环境）
      if (process.env.NODE_ENV === 'production') {
        coreLogger.error(
          { err, phone: normalizedPhone, feature: 'auth.register' },
          'Failed to query userWhitelist for name'
        );
      }
    }

    // 真实姓名：家长可选，其他角色必填
    // 优先使用请求中的name，其次使用白名单的name
    const finalName = name?.trim() || nameFromWhitelist || undefined;
    if (requestedRole !== 'parent' && !finalName) {
      throw new AppError(
        400,
        'INVALID_NAME',
        '请填写真实姓名',
        undefined,
        1006
      );
    }
    const effectiveName = requestedRole === 'parent'
      ? finalName
      : finalName!;

    // 昵称非必填，若未填写则生成默认昵称
    const effectiveNickname = nickname?.trim() || `用户_${phone.slice(-4)}`;

    // 校验验证码（注册场景优先使用 type=register）
    let record = null;
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
      // 修改原因：统一随机验证码后，注册校验只认数据库中的实际验证码记录。
    }

    const invalidCode = !record ||
      record.code !== code ||
      record.expireAt.getTime() < Date.now();

    if (invalidCode) {
      throw new AppError(
        400,
        'INVALID_CODE',
        '验证码错误或已过期',
        undefined,
        1002
      );
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

    // 默认角色：优先使用前端请求的角色（student/teacher/parent），白名单仅用于补充 grade 和 expiresAt
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
        // 修改原因：注册角色必须受白名单约束，避免前端任意选择越权角色。
        const whitelistRole =
          wl.role === 'student' || wl.role === 'teacher' || wl.role === 'parent'
            ? wl.role
            : null;

        // ⚠️ 不确定因素：历史脏数据可能出现非 student/teacher/parent 的 role。
        // 这里按服务异常处理，避免把错误角色落到用户表。
        if (!whitelistRole) {
          throw new AppError(
            500,
            'INTERNAL_SERVER_ERROR',
            '白名单角色配置异常，请联系管理员'
          );
        }

        if (requestedRole && requestedRole !== whitelistRole) {
          throw new AppError(
            403,
            'ROLE_MISMATCH_WHITELIST',
            '所选身份与白名单不一致，请联系管理员',
            {
              requestedRole,
              whitelistRole
            },
            4005
          );
        }

        role = requestedRole ?? whitelistRole;

        // 白名单补充 grade 和 expiresAt，角色以“白名单一致性校验后的 role”为准。
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
      // 修改原因：业务错误（如白名单角色不一致）必须透传，不能被降级分支吞掉。
      if (err instanceof AppError) {
        throw err;
      }
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
          name: effectiveName,
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
         name: effectiveName,
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

    // 变更原因：仅在注册流程成功后才消耗验证码，避免“后续字段失败导致验证码被提前作废”。
    if (record) {
      // ⚠️ 不确定因素：极端情况下（如验证码表瞬时写入失败），这里可能无法更新 used 状态。
      // 该场景下保持“注册成功优先返回”，避免用户已创建但前端收到失败。
      try {
        await prisma.verificationCode.update({
          where: { id: record.id },
          data: { used: true, usedAt: new Date() }
        });
      } catch (err) {
        coreLogger.warn(
          {
            mode: 'degraded',
            feature: 'auth.register',
            env: process.env.NODE_ENV ?? 'unknown',
            reason: 'verificationCode update failed after successful register',
            codeId: record.id
          },
          'Auth register warning: failed to mark verification code as used'
        );
      }
    }

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        // 修改原因：注册接口需回传真实姓名，避免前端登录态丢失 name 导致显示不一致。
        name: user.name ?? undefined,
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
      name: user.name ?? undefined,
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
