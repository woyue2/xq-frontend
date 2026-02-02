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

    const whitelist = await prisma.userWhitelist.findUnique({
      where: { phone: user.phone }
    });

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
      name: whitelist?.name ?? user.nickname,
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

    const results: Array<{
      userId: string;
      oldValidUntil: Date | null;
      newValidUntil: Date | null;
      status: 'success' | 'failed';
      reason?: string;
    }> = [];

    await prisma.$transaction(async (tx) => {
      for (const userId of userIds) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          results.push({
            userId,
            oldValidUntil: null,
            newValidUntil: null,
            status: 'failed',
            reason: 'USER_NOT_FOUND'
          });
          continue;
        }

        const whitelist = await tx.userWhitelist.findUnique({
          where: { phone: user.phone }
        });

        const baseDate =
          whitelist?.validUntil ??
          user.expiresAt ??
          new Date();

        let newValidUntil =
          action === 'extend'
            ? addMonths(baseDate, months)
            : addMonths(baseDate, -months);

        if (action === 'reduce' && newValidUntil.getTime() < Date.now()) {
          results.push({
            userId,
            oldValidUntil: baseDate,
            newValidUntil: baseDate,
            status: 'failed',
            reason: 'CANNOT_REDUCE_TO_PAST'
          });
          continue;
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

        results.push({
          userId,
          oldValidUntil: baseDate,
          newValidUntil,
          status: 'success'
        });
      }
    });

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
