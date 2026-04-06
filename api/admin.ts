/**
 * [POS] api/admin.ts
 *   所属：API 路由层 | 角色：管理功能（whitelist + audit）
 *   兄弟：core.ts / auth.ts / content.ts / social.ts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma, getUserFromToken, AppError } from './_helpers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Client-Version, X-Client-Mode');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action, id } = req.query;
    const user = getUserFromToken(req);

    // Auth check - admin/teacher only
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      throw new AppError(403, 'PERMISSION_DENIED', '无管理权限', undefined, 3005);
    }

    // ============ WHITELIST ============
    if (action === 'whitelist-list') {
      const { page, pageSize, role, status, search, searchField } = req.query;
      const result = await listWhitelist({
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        role: role as string,
        status: status as any,
        search: search as string,
        searchField: searchField as any
      });
      return res.json({ code: 200, data: result });
    }

    if (action === 'whitelist-create') {
      const { phone, name, role, validUntil, notes } = req.body;
      const result = await createWhitelist({
        phone,
        name,
        role,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        notes,
        createdBy: user.id
      });
      return res.status(201).json({ code: 201, message: '添加成功', data: result });
    }

    if (action === 'whitelist-update' && id) {
      const { validUntil } = req.body;
      const result = await updateWhitelist(id as string, validUntil ? { validUntil: new Date(validUntil) } : {});
      return res.json({ code: 200, message: '更新成功', data: result });
    }

    if (action === 'whitelist-delete' && id) {
      const result = await deleteWhitelist(id as string, { deletedBy: user.id });
      return res.json({ code: 200, message: '删除成功', ...(result.warning ? { data: { warning: result.warning } } : {}) });
    }

    // ============ AUDIT ============
    if (action === 'audit-pending') {
      const { type, page, pageSize } = req.query;
      const result = await listPending({
        type: (type as string) || 'question',
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined
      });
      return res.json({ code: 200, data: result });
    }

    if (action === 'audit-approve' && id) {
      const { type, isGoodQuestion, score, tags, difficulty } = req.body;
      if (type === 'question') {
        const result = await approveQuestion({
          id: id as string,
          auditorId: user.id,
          isGoodQuestion,
          score,
          tags,
          difficulty
        });
        return res.json({
          code: 200,
          message: '审核完成：已通过',
          data: {
            id: result.id,
            status: result.status,
            isGoodQuestion: result.isGoodQuestion,
            score: result.score,
            tags: result.tags,
            difficulty: result.difficulty,
            approvedBy: user.id,
            approvedAt: result.updatedAt
          }
        });
      } else if (type === 'comment') {
        const result = await approveComment({ id: id as string, auditorId: user.id });
        return res.json({
          code: 200,
          message: '审核完成：已通过',
          data: {
            id: result.id,
            status: result.status,
            approvedBy: user.id,
            approvedAt: result.updatedAt
          }
        });
      }
      throw new AppError(400, 'VALIDATION_ERROR', '暂不支持该类型的审核通过');
    }

    if (action === 'audit-reject' && id) {
      const { type, reason } = req.body;
      if (type !== 'question') {
        throw new AppError(400, 'VALIDATION_ERROR', '仅支持驳回问题');
      }
      const result = await rejectQuestion({ id: id as string, auditorId: user.id, reason });
      return res.json({
        code: 200,
        message: '审核完成：已驳回',
        data: {
          id: result.id,
          status: result.status,
          reason: result.aiResult,
          rejectedBy: user.id,
          rejectedAt: result.updatedAt
        }
      });
    }

    if (action === 'audit-ban' && id) {
      const { type, reason } = req.body;
      if (type !== 'comment') {
        throw new AppError(400, 'VALIDATION_ERROR', '仅支持封禁评论');
      }
      const result = await banComment({ id: id as string, auditorId: user.id, reason });
      return res.json({
        code: 200,
        message: '审核完成：已封禁',
        data: {
          id: result.id,
          status: result.status,
          banReason: result.aiResult,
          bannedBy: user.id,
          bannedAt: result.updatedAt
        }
      });
    }

    if (action === 'audit-pin' && id) {
      const result = await togglePinQuestion({ id: id as string, auditorId: user.id });
      return res.json({
        code: 200,
        message: result.isPinned ? '已置顶' : '已取消置顶',
        data: {
          id: result.id,
          isPinned: result.isPinned
        }
      });
    }

    return res.status(404).json({ code: 404, message: 'Action not found' });

  } catch (error) {
    console.error('[Admin API Error]', error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        code: error.statusCode,
        error: error.code,
        message: error.message,
        errorCode: error.errorCode
      });
    }
    return res.status(500).json({ code: 500, message: 'Internal server error' });
  }
}


// ============ WHITELIST FUNCTIONS ============

async function listWhitelist(params: {
  page?: number;
  pageSize?: number;
  role?: string;
  status?: 'registered' | 'pending';
  search?: string;
  searchField?: 'name' | 'phone';
}) {
  const { page = 1, pageSize = 20, role, status, search, searchField } = params;

  const safePage = (Number.isInteger(Number(page)) && Number(page) > 0) ? Number(page) : 1;
  const safePageSize = (Number.isInteger(Number(pageSize)) && Number(pageSize) > 0) ? Math.min(Number(pageSize), 100) : 20;

  if (search && typeof search === 'string') {
    const MAX_SEARCH_KEYWORD_LENGTH = 64;
    if (search.trim().length > MAX_SEARCH_KEYWORD_LENGTH) {
      throw new AppError(400, 'SEARCH_KEYWORD_TOO_LONG', `搜索关键词过长，请限制在 ${MAX_SEARCH_KEYWORD_LENGTH} 字符以内`);
    }
  }

  const where: any = {};

  if (role) where.role = role;

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

  const [list, total, registered, pending, students, parents, teachers] = await Promise.all([
    prisma.userWhitelist.findMany({
      where: { deletedAt: null, ...where },
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize
    }),
    prisma.userWhitelist.count({ where: { deletedAt: null, ...where } }),
    prisma.userWhitelist.count({ where: { deletedAt: null, isRegistered: true } }),
    prisma.userWhitelist.count({ where: { deletedAt: null, isRegistered: false } }),
    prisma.userWhitelist.count({ where: { deletedAt: null, role: 'student' } }),
    prisma.userWhitelist.count({ where: { deletedAt: null, role: 'parent' } }),
    prisma.userWhitelist.count({ where: { deletedAt: null, role: 'teacher' } })
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

async function createWhitelist(params: {
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

  const existing = await prisma.userWhitelist.findUnique({ where: { phone } });

  if (existing) {
    if (!existing.deletedAt) {
      throw new AppError(409, 'PHONE_EXISTS', '该手机号已在白名单中');
    }

    const restored = await prisma.userWhitelist.update({
      where: { id: existing.id },
      data: {
        name,
        role,
        validUntil: validUntil ?? null,
        notes: notes ?? null,
        isRegistered: existing.userId ? true : false,
        deletedAt: null,
        deletedBy: null
      }
    });

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

    return { ...restored, createdBy };
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

  return { ...record, createdBy };
}

async function updateWhitelist(id: string, data: { validUntil?: Date }) {
  const wl = await prisma.userWhitelist.findUnique({ where: { id } });

  if (!wl || wl.deletedAt) {
    throw new AppError(404, 'WHITELIST_NOT_FOUND', '白名单记录不存在');
  }

  const updated = await prisma.userWhitelist.update({
    where: { id },
    data: { validUntil: data.validUntil ?? null }
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

async function deleteWhitelist(id: string, options: { deletedBy: string }) {
  const wl = await prisma.userWhitelist.findUnique({ where: { id } });

  if (!wl || wl.deletedAt) {
    throw new AppError(404, 'WHITELIST_NOT_FOUND', '白名单记录不存在');
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
      data: { isActive: false }
    });

    warning = '该用户已注册，移除后将无法登录';
  }

  return { warning };
}


// ============ AUDIT FUNCTIONS ============

async function listPending(params: {
  type: string;
  page?: number;
  pageSize?: number;
}) {
  const { type, page = 1, pageSize = 20 } = params;

  const isValidInteger = (value: number) =>
    Number.isFinite(value) && Number.isInteger(value) && value > 0;

  if (!isValidInteger(page) || !isValidInteger(pageSize)) {
    throw new AppError(400, 'INVALID_PAGINATION', '分页参数不合法');
  }

  const safePageSize = Math.min(pageSize, 100);
  const skip = (page - 1) * safePageSize;
  const take = safePageSize;

  if (type === 'question') {
    const [list, total, stats] = await Promise.all([
      prisma.question.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.question.count({ where: { status: 'pending' } }),
      prisma.question.groupBy({
        by: ['status'],
        _count: { _all: true }
      })
    ]);

    const statistics = {
      pending: stats.find((s) => s.status === 'pending')?._count._all ?? 0,
      approved: stats.find((s) => s.status === 'approved')?._count._all ?? 0,
      rejected: stats.find((s) => s.status === 'rejected')?._count._all ?? 0,
      banned: stats.find((s) => s.status === 'banned')?._count._all ?? 0
    };

    return {
      type: 'question' as const,
      list: list.map((q) => ({
        id: q.id,
        type: 'question' as const,
        title: q.title,
        content: q.content ?? '',
        images: [],
        authorId: q.authorId,
        authorName: q.authorName,
        status: q.status,
        aiResult: q.aiResult ?? null,
        createdAt: q.createdAt
      })),
      pagination: {
        page,
        pageSize: safePageSize,
        total,
        totalPages: Math.ceil(total / safePageSize)
      },
      statistics
    };
  }

  if (type === 'comment') {
    const list = await prisma.comment.findMany({
      where: { status: 'pending', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    });

    const questionIds = Array.from(new Set(list.map((c) => c.questionId)));
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } }
    });
    const map = new Map(questions.map((q) => [q.id, q]));

    return {
      type: 'comment' as const,
      list: list.map((c) => {
        const q = map.get(c.questionId);
        return {
          id: c.id,
          type: 'comment' as const,
          questionId: c.questionId,
          questionTitle: q?.title ?? '',
          content: c.content,
          image: c.image ?? null,
          authorId: c.authorId,
          authorName: c.authorName,
          status: c.status,
          aiResult: c.aiResult ?? null,
          createdAt: c.createdAt
        };
      })
    };
  }

  return { type, list: [] };
}

async function approveQuestion(params: {
  id: string;
  auditorId: string;
  isGoodQuestion?: boolean;
  score?: number;
  tags?: string[];
  difficulty?: string;
}) {
  const { id, auditorId, isGoodQuestion, score, tags, difficulty } = params;

  const q = await prisma.question.findUnique({ where: { id } });

  if (!q) {
    throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
  }

  if (q.status !== 'pending') {
    return q;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.question.update({
      where: { id },
      data: {
        status: 'approved',
        isGoodQuestion: isGoodQuestion ?? q.isGoodQuestion,
        score: typeof score === 'number' ? score : q.score,
        tags: tags ?? q.tags,
        difficulty: difficulty ?? q.difficulty
      }
    });

    await tx.auditLog.create({
      data: {
        auditorId,
        targetType: 'question',
        targetId: id,
        action: 'approve'
      }
    });

    await tx.notification.create({
      data: {
        userId: q.authorId,
        type: 'audit_result',
        title: '你的问题已通过审核',
        content: q.title,
        targetType: 'question',
        targetId: q.id
      }
    });

    return res;
  });

  return updated;
}

async function approveComment(params: { id: string; auditorId: string }) {
  const { id, auditorId } = params;

  const comment = await prisma.comment.findUnique({ where: { id } });

  if (!comment) {
    throw new AppError(404, 'COMMENT_NOT_FOUND', '评论不存在');
  }

  if (comment.status !== 'pending') {
    return comment;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.comment.update({
      where: { id },
      data: { status: 'approved' }
    });

    await tx.auditLog.create({
      data: {
        auditorId,
        targetType: 'comment',
        targetId: id,
        action: 'approve'
      }
    });

    const question = await tx.question.findUnique({
      where: { id: comment.questionId },
      select: { authorId: true, title: true, status: true }
    });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '所属问题已删除');
    }

    if (['rejected', 'banned'].includes(question.status)) {
      throw new AppError(403, 'PARENT_QUESTION_INVALID', '所属问题状态异常（已驳回或已封禁），无法通过评论审核');
    }

    if (question.authorId !== comment.authorId) {
      await tx.notification.create({
        data: {
          userId: question.authorId,
          type: 'comment',
          title: '有人评论了你的问题',
          content: comment.content || '[图片评论]',
          targetType: 'question',
          targetId: comment.questionId
        }
      });
    }

    return res;
  });

  return updated;
}

async function rejectQuestion(params: {
  id: string;
  auditorId: string;
  reason: string;
}) {
  const { id, auditorId, reason } = params;

  if (!reason || !reason.trim()) {
    throw new AppError(400, 'REASON_REQUIRED', '请填写驳回原因');
  }

  const q = await prisma.question.findUnique({ where: { id } });

  if (!q) {
    throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
  }

  if (q.status !== 'pending') {
    return q;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.question.update({
      where: { id },
      data: {
        status: 'rejected',
        aiResult: reason
      }
    });

    await tx.auditLog.create({
      data: {
        auditorId,
        targetType: 'question',
        targetId: id,
        action: 'reject',
        reason
      }
    });

    await tx.notification.create({
      data: {
        userId: q.authorId,
        type: 'audit_result',
        title: '你的问题未通过审核',
        content: reason,
        targetType: 'question',
        targetId: q.id
      }
    });

    return res;
  });

  return updated;
}

async function banComment(params: {
  id: string;
  auditorId: string;
  reason: string;
}) {
  const { id, auditorId, reason } = params;

  const comment = await prisma.comment.findUnique({ where: { id } });

  if (!comment) {
    throw new AppError(404, 'COMMENT_NOT_FOUND', '评论不存在');
  }

  if (comment.status !== 'pending') {
    return comment;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.comment.update({
      where: { id },
      data: {
        status: 'banned',
        aiResult: reason,
        deletedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        auditorId,
        targetType: 'comment',
        targetId: id,
        action: 'ban',
        reason
      }
    });

    return res;
  });

  return updated;
}

async function togglePinQuestion(params: { id: string; auditorId: string }) {
  const { id, auditorId } = params;

  const q = await prisma.question.findUnique({ where: { id } });

  if (!q) {
    throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
  }

  const newPinned = !q.isPinned;

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.question.update({
      where: { id },
      data: { isPinned: newPinned }
    });

    await tx.auditLog.create({
      data: {
        auditorId,
        targetType: 'question',
        targetId: id,
        action: newPinned ? 'pin' : 'unpin'
      }
    });

    return res;
  });

  return updated;
}
