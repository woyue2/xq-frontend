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
          skip: (page - 1) * pageSize,
          take: pageSize
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
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
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

    if (existing && !existing.deletedAt) {
      throw new AppError(
        409,
        'PHONE_EXISTS',
        '该手机号已在白名单中'
      );
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
