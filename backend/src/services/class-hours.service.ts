import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const addMonths = (date: Date, months: number) => {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) {
    d.setDate(0);
  }
  return d;
};

export class ClassHoursService {
  async getUserClassHours(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
    }

    const rawWhitelist = await prisma.userWhitelist.findUnique({
      where: { phone: user.phone }
    });

    const whitelist =
      rawWhitelist && !rawWhitelist.deletedAt ? rawWhitelist : null;

    const validUntil = whitelist?.validUntil ?? user.expiresAt ?? null;
    const now = new Date();
    let isExpired = false;
    let remainingDays = 0;

    if (validUntil) {
      const diff = validUntil.getTime() - now.getTime();
      remainingDays = Math.round(diff / MS_PER_DAY);
      isExpired = diff < 0;
    }

    const status = isExpired ? 'expired' : 'active';

    return {
      userId: user.id,
      phone: user.phone,
      // 修改原因：当用户在注册后修改真实姓名时，显示应优先使用 User.name，避免被白名单历史姓名覆盖。
      name: user.name ?? whitelist?.name ?? user.nickname,
      role: user.role,
      validUntil,
      isExpired,
      remainingDays,
      status
    };
  }

  async batchUpdate(params: {
    userIds: string[];
    action: 'extend' | 'reduce';
    months: number;
  }) {
    const { userIds, action, months } = params;

    // 参数校验：months 必须为正整数且在合理范围内（1个月到10年）
    if (!Number.isInteger(months) || months <= 0 || months > 120) {
      throw new AppError(
        400,
        'INVALID_PARAMS',
        '无效的月数设定，请设置为 1 到 120 之间的整数'
      );
    }


    const results: Array<{
      userId: string;
      oldValidUntil: Date | null;
      newValidUntil: Date | null;
      status: 'success' | 'failed';
      reason?: string;
    }> = [];

    // 为每个用户单独执行事务，确保“部分成功”特性
    for (const userId of userIds) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.findUnique({ where: { id: userId } });
          if (!user) {
            throw new Error('USER_NOT_FOUND');
          }

          const rawWhitelist = await tx.userWhitelist.findUnique({
            where: { phone: user.phone }
          });

          const whitelist =
            rawWhitelist && !rawWhitelist.deletedAt ? rawWhitelist : null;

          const baseDate =
            whitelist?.validUntil ??
            user.expiresAt ??
            new Date();

          let newValidUntil =
            action === 'extend'
              ? addMonths(baseDate, months)
              : addMonths(baseDate, -months);

          if (action === 'reduce' && newValidUntil.getTime() < Date.now()) {
            throw new Error('CANNOT_REDUCE_TO_PAST');
          }

          await tx.user.update({
            where: { id: userId },
            data: {
              expiresAt: newValidUntil
            }
          });

          if (whitelist) {
            await tx.userWhitelist.update({
              where: { id: whitelist.id },
              data: {
                validUntil: newValidUntil
              }
            });
          }

          return {
            userId,
            oldValidUntil: baseDate,
            newValidUntil,
            status: 'success' as const
          };
        });

        results.push(result);
      } catch (err: any) {
        // 捕获单个用户处理过程中的逻辑错误或数据库异常
        const msg = err.message;
        const validReasons = ['USER_NOT_FOUND', 'CANNOT_REDUCE_TO_PAST'];
        const reason = validReasons.includes(msg) ? msg : 'DB_ERROR'; // 掩盖这一层具体 DB 报错细节，或者保留 err.message

        results.push({
          userId,
          oldValidUntil: null,
          newValidUntil: null,
          status: 'failed',
          reason: reason === 'DB_ERROR' ? `系统异常: ${msg}` : reason
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const failedCount = results.length - successCount;

    return {
      successCount,
      failedCount,
      results
    };
  }
}

export const classHoursService = new ClassHoursService();
