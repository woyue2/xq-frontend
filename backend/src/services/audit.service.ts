import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

type AuditContentType = 'question' | 'answer' | 'comment';

const PENDING_CACHE_TTL_MS = 15_000;

type PendingCacheValue = {
  type: AuditContentType;
  list: any[];
  pagination?: any;
  statistics?: any;
};

const pendingCache = new Map<string, { expiresAt: number; value: PendingCacheValue }>();

export class AuditService {
  async listPending(params: {
    type: AuditContentType;
    page?: number;
    pageSize?: number;
  }) {
    const { type, page = 1, pageSize = 20 } = params;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const cacheKey = `${type}:${page}:${pageSize}`;
    const now = Date.now();
    const cached = pendingCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    if (type === 'question') {
      const [list, total, stats] = await Promise.all([
        prisma.question.findMany({
          where: { status: 'pending' },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        }),
        prisma.question.count({
          where: { status: 'pending' }
        }),
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

      const result: PendingCacheValue = {
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
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        },
        statistics
      };

      pendingCache.set(cacheKey, {
        expiresAt: now + PENDING_CACHE_TTL_MS,
        value: result
      });

      return result;
    }

    if (type === 'comment') {
      const list = await prisma.comment.findMany({
        where: { status: 'pending', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      });

      const questionIds = Array.from(
        new Set(list.map((c) => c.questionId))
      );
      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } }
      });
      const map = new Map(questions.map((q) => [q.id, q]));

      const result: PendingCacheValue = {
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

      pendingCache.set(cacheKey, {
        expiresAt: now + PENDING_CACHE_TTL_MS,
        value: result
      });

      return result;
    }

    // 目前暂不提供回答列表，但保留类型以便后续扩展
    const result: PendingCacheValue = {
      type,
      list: []
    };

    pendingCache.set(cacheKey, {
      expiresAt: now + PENDING_CACHE_TTL_MS,
      value: result
    });

    return result;
  }

  async approveQuestion(params: {
    id: string;
    auditorId: string;
    isGoodQuestion?: boolean;
    score?: number;
    tags?: string[];
    difficulty?: string;
  }) {
    const { id, auditorId, isGoodQuestion, score, tags, difficulty } = params;

    const q = await prisma.question.findUnique({
      where: { id }
    });

    if (!q) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
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

    pendingCache.clear();

    return updated;
  }

  async approveComment(params: { id: string; auditorId: string }) {
    const { id, auditorId } = params;

    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!comment) {
      throw new AppError(404, 'COMMENT_NOT_FOUND', '评论不存在');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.comment.update({
        where: { id },
        data: {
          status: 'approved'
        }
      });

      await tx.auditLog.create({
        data: {
          auditorId,
          targetType: 'comment',
          targetId: id,
          action: 'approve'
        }
      });

      return res;
    });

    pendingCache.clear();

    return updated;
  }

  async rejectQuestion(params: {
    id: string;
    auditorId: string;
    reason: string;
  }) {
    const { id, auditorId, reason } = params;

    if (!reason || !reason.trim()) {
      throw new AppError(400, 'REASON_REQUIRED', '请填写驳回原因');
    }

    const q = await prisma.question.findUnique({
      where: { id }
    });

    if (!q) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
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

    pendingCache.clear();

    return updated;
  }

  async banComment(params: {
    id: string;
    auditorId: string;
    reason: string;
  }) {
    const { id, auditorId, reason } = params;

    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!comment) {
      throw new AppError(404, 'COMMENT_NOT_FOUND', '评论不存在');
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

    pendingCache.clear();

    return updated;
  }

  async togglePinQuestion(params: { id: string; auditorId: string }) {
    const { id, auditorId } = params;

    const q = await prisma.question.findUnique({
      where: { id }
    });

    if (!q) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }

    const newPinned = !q.isPinned;

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.question.update({
        where: { id },
        data: {
          isPinned: newPinned
        }
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

    pendingCache.clear();

    return updated;
  }
}

export const auditService = new AuditService();
