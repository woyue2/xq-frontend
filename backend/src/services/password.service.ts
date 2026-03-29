/**
 * [POS] backend/src/services/password.service.ts
 *   所属：服务层 | 角色：密码管理（设置密码、通过验证码重置密码）
 *   兄弟：auth.service.ts
 *
 * [INPUT]
 *   - ../config/database → prisma
 *   - ../errors/AppError → AppError
 *
 * [OUTPUT]
 *   - passwordService（PasswordService 单例）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/services/CLAUDE.md 的文件清单
 */
import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import bcrypt from 'bcryptjs';

export class PasswordService {
  async setPassword(userId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new AppError(400, 'INVALID_PASSWORD_FORMAT', '密码至少需 8 位', undefined, 1005);
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash }
    });
  }

  async resetWithCode(params: { phone: string; code: string; newPassword: string }) {
    const { phone, code, newPassword } = params;
    const normalizedPhone = phone.replace(/\D/g, '');

    if (!/^\d{11}$/.test(normalizedPhone)) {
      throw new AppError(400, 'INVALID_PHONE_FORMAT', '手机号格式错误');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new AppError(400, 'INVALID_PASSWORD_FORMAT', '密码至少需 8 位');
    }

    const record = await prisma.verificationCode.findFirst({
      where: { phone: normalizedPhone, type: 'reset_password', used: false },
      orderBy: { createdAt: 'desc' }
    });

    if (!record || record.code !== code || record.expireAt.getTime() < Date.now()) {
      throw new AppError(400, 'INVALID_CODE', '验证码错误或已过期');
    }

    const user = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.verificationCode.update({
        where: { id: record.id },
        data: { used: true, usedAt: new Date() }
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revoked: false },
        data: { revoked: true }
      })
    ]);
  }
}

export const passwordService = new PasswordService();
