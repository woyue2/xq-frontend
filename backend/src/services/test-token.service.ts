/**
 * [POS] backend/src/services/test-token.service.ts
 *   所属：服务层 | 角色：测试环境令牌生成（仅 Playwright / E2E 使用，非生产）
 *   兄弟：auth.service.ts
 *
 * [INPUT]
 *   - ../config/database → prisma
 *   - ../utils/jwt       → signAccessToken
 *   - ../errors/AppError → AppError
 *
 * [OUTPUT]
 *   - testTokenService（TestTokenService 单例）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/services/CLAUDE.md 的文件清单
 */
import { prisma } from '../config/database';
import { signAccessToken } from '../utils/jwt';
import { AppError } from '../errors/AppError';

const DEFAULT_PHONES: Record<string, string> = {
  student: '13900000001',
  parent: '13900000002',
  teacher: '13900000003'
};

export class TestTokenService {
  async generate(params: { role?: string; phone?: string }) {
    const role =
      params.role === 'teacher' || params.role === 'parent' || params.role === 'student'
        ? params.role
        : 'student';

    const phoneSource = params.phone ?? DEFAULT_PHONES[role] ?? DEFAULT_PHONES.student;
    const normalizedPhone = phoneSource.replace(/\D/g, '');

    if (!/^\d{11}$/.test(normalizedPhone)) {
      throw new AppError(400, 'INVALID_PHONE_FORMAT', '手机号格式错误', undefined, 1001);
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const user = await prisma.user.upsert({
      where: { phone: normalizedPhone },
      update: { role, expiresAt, isActive: true, isBanned: false },
      create: {
        phone: normalizedPhone,
        nickname: `Playwright_${role}`,
        role,
        grade: '初一',
        age: 15,
        school: '测试学校',
        expiresAt,
        isActive: true,
        isBanned: false
      }
    });

    const token = signAccessToken({ sub: user.id, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        role: user.role,
        expiresAt: user.expiresAt
      }
    };
  }
}

export const testTokenService = new TestTokenService();
