import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

export class WhitelistService {
  async list(params: {
    page?: number;
    pageSize?: number;
    role?: string;
    status?: 'registered' | 'pending';
    search?: string;
    searchField?: 'name' | 'phone';
  }) {
    const {
      page = 1,
      pageSize = 20,
      role,
      status,
      search,
      searchField
    } = params;

    const safePage = (Number.isInteger(Number(page)) && Number(page) > 0) ? Number(page) : 1;
    const safePageSize = (Number.isInteger(Number(pageSize)) && Number(pageSize) > 0) ? Math.min(Number(pageSize), 100) : 20;

    if (search && typeof search === 'string') {
      const MAX_SEARCH_KEYWORD_LENGTH = 64;
      if (search.trim().length > MAX_SEARCH_KEYWORD_LENGTH) {
        throw new AppError(
          400,
          'SEARCH_KEYWORD_TOO_LONG',
          `搜索关键词过长，请限制在 ${MAX_SEARCH_KEYWORD_LENGTH} 字符以内`
        );
      }
    }

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status === 'registered') {
      where.isRegistered = true;
    } else if (status === 'pending') {
      where.isRegistered = false;
    }

    if (search && searchField) {
      if (searchField === 'name') {
        where.name = { contains: search };
      } else if (searchField === 'phone') {
        where.phone = { contains: search };
      }
    }

    const [list, total, registered, pending, students, parents, teachers] =
      await Promise.all([
        prisma.userWhitelist.findMany({
          where: {
            deletedAt: null,
            ...where
          },
          orderBy: { createdAt: 'desc' },
          skip: (safePage - 1) * safePageSize,
          take: safePageSize
        }),
        prisma.userWhitelist.count({ where: { deletedAt: null, ...where } }),
        prisma.userWhitelist.count({
          where: { deletedAt: null, isRegistered: true }
        }),
        prisma.userWhitelist.count({
          where: { deletedAt: null, isRegistered: false }
        }),
        prisma.userWhitelist.count({
          where: { deletedAt: null, role: 'student' }
        }),
        prisma.userWhitelist.count({
          where: { deletedAt: null, role: 'parent' }
        }),
        prisma.userWhitelist.count({
          where: { deletedAt: null, role: 'teacher' }
        })
      ]);

    return {
      list,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages: Math.ceil(total / safePageSize)
      },
      statistics: {
        total,
        registered,
        pending,
        students,
        parents,
        teachers
      }
    };
  }

  async create(params: {
    phone: string;
    name: string;
    role: 'student' | 'parent' | 'teacher';
    validUntil?: Date;
    notes?: string;
    createdBy: string;
  }) {
    const { phone, name, role, validUntil, notes, createdBy } = params;

    if (!/^\d{11}$/.test(phone)) {
      throw new AppError(400, 'VALIDATION_ERROR', '参数验证失败', {
        errors: [{ field: 'phone', message: '手机号格式错误' }]
      }, 1001);
    }

    if (!name) {
      throw new AppError(400, 'VALIDATION_ERROR', '参数验证失败', {
        errors: [{ field: 'name', message: '姓名不能为空' }]
      });
    }

    if (!['student', 'parent', 'teacher'].includes(role)) {
      throw new AppError(400, 'VALIDATION_ERROR', '参数验证失败', {
        errors: [{ field: 'role', message: '角色值无效' }]
      });
    }

    const existing = await prisma.userWhitelist.findUnique({
      where: { phone }
    });

    if (existing) {
      if (!existing.deletedAt) {
        throw new AppError(
          409,
          'PHONE_EXISTS',
          '该手机号已在白名单中'
        );
      }

      // 如果已存在软删除记录，则恢复并更新
      const restored = await prisma.userWhitelist.update({
        where: { id: existing.id },
        data: {
          name,
          role,
          validUntil: validUntil ?? null,
          notes: notes ?? null,
          isRegistered: existing.userId ? true : false, // 保持原有注册状态，或者重置？
          // 如果用户已被物理删除，isRegistered状态可能不准。但通常用户也是软删除/禁用。
          // 简单起见，仅恢复白名单。
          deletedAt: null,
          deletedBy: null
        }
      });

      // 如果关联了用户，可能还需要重新激活用户用户表状态？
      // 原 remove 逻辑是将用户设为 isActive: false.
      // 这里应该设为 isActive: true
      if (restored.userId) {
        try {
          await prisma.user.update({
            where: { id: restored.userId },
            data: { isActive: true }
          });
        } catch {
          // ignore if user not found
        }
      }

      return {
        ...restored,
        createdBy
      };
    }

    const record = await prisma.userWhitelist.create({
      data: {
        phone,
        name,
        role,
        validUntil: validUntil ?? null,
        notes: notes ?? null,
        isRegistered: false,
        deletedAt: null,
        deletedBy: null
      }
    });

    return {
      ...record,
      createdBy
    };
  }

  async update(id: string, data: { validUntil?: Date }) {
    const wl = await prisma.userWhitelist.findUnique({
      where: { id }
    });

    if (!wl || wl.deletedAt) {
      throw new AppError(
        404,
        'WHITELIST_NOT_FOUND',
        '白名单记录不存在'
      );
    }

    const updated = await prisma.userWhitelist.update({
      where: { id },
      data: {
        validUntil: data.validUntil ?? null
      }
    });

    if (updated.userId && updated.validUntil) {
      await prisma.user.update({
        where: { id: updated.userId },
        data: {
          expiresAt: updated.validUntil,
          isActive: true
        }
      });
    }

    return updated;
  }

  async remove(id: string, options: { deletedBy: string }) {
    const wl = await prisma.userWhitelist.findUnique({
      where: { id }
    });

    if (!wl || wl.deletedAt) {
      throw new AppError(
        404,
        'WHITELIST_NOT_FOUND',
        '白名单记录不存在'
      );
    }

    await prisma.userWhitelist.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: options.deletedBy
      }
    });

    let warning: string | undefined;

    if (wl.userId) {
      await prisma.user.update({
        where: { id: wl.userId },
        data: {
          isActive: false
        }
      });

      warning = '该用户已注册，移除后将无法登录';
    }

    return { warning };
  }
}

export const whitelistService = new WhitelistService();
