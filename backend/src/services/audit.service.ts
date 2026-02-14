import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

type AuditContentType = 'question' | 'answer' | 'comment';
const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

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

    const isValidInteger = (value: number) =>
      Number.isFinite(value) && Number.isInteger(value) && value > 0;

    if (!isValidInteger(page) || !isValidInteger(pageSize)) {
      throw new AppError(
        400,
        'INVALID_PAGINATION',
        '分页参数不合法'
      );
    }

    const safePageSize = Math.min(pageSize, 100);

    const skip = (page - 1) * safePageSize;
    const take = safePageSize;

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
          // 修改原因：补齐待审核问题图片字段，供老师审核页直接查看题图。
          // ⚠️ 不确定因素：历史脏数据可能出现 null/异常值，当前先做数组兜底，避免前端渲染报错。
          images: q.images ?? [],
          authorId: q.authorId,
          authorName: q.authorName,
          status: q.status,
          // 修改原因：审核页必须基于真实难度做“必选”校验，不能再由前端写死默认值。
          difficulty: q.difficulty ?? null,
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

    if (type === 'answer') {
      // 修改原因：回答可能进入 pending（如图片审核异常转人工），审核台需要可见这些待审回答。
      const list = await prisma.answer.findMany({
        where: { status: 'pending', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      });

      const questionIds = Array.from(new Set(list.map((a) => a.questionId)));
      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, title: true }
      });
      const questionMap = new Map(questions.map((q) => [q.id, q.title]));

      const total = await prisma.answer.count({
        where: { status: 'pending', deletedAt: null }
      });

      const result: PendingCacheValue = {
        type: 'answer' as const,
        list: list.map((a) => ({
          id: a.id,
          type: 'answer' as const,
          questionId: a.questionId,
          questionTitle: questionMap.get(a.questionId) ?? '',
          content: a.content,
          images: a.images ?? [],
          audioUrl: a.audioUrl ?? null,
          authorId: a.authorId,
          authorName: a.authorName,
          status: a.status,
          aiResult: a.aiResult ?? null,
          createdAt: a.createdAt
        })),
        pagination: {
          page,
          pageSize: safePageSize,
          total,
          totalPages: Math.ceil(total / safePageSize)
        }
      };

      pendingCache.set(cacheKey, {
        expiresAt: now + PENDING_CACHE_TTL_MS,
        value: result
      });

      return result;
    }

    const result: PendingCacheValue = { type, list: [] };
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

    // 幂等性校验
    if (q.status !== 'pending') {
      return q;
    }

    // 自审校验
    if (q.authorId === auditorId) {
      throw new AppError(403, 'SELF_AUDIT_FORBIDDEN', '禁止角色内自我审核');
    }

    if (difficulty !== undefined && difficulty !== null) {
      // 修改原因：服务层兜底校验难度枚举，防止非审核路由或异常调用写入非法值。
      if (!ALLOWED_DIFFICULTIES.includes(difficulty as (typeof ALLOWED_DIFFICULTIES)[number])) {
        throw new AppError(400, 'VALIDATION_ERROR', '难度参数无效');
      }
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

    // 幂等性校验
    if (comment.status !== 'pending') {
      return comment;
    }

    // 自审校验
    if (comment.authorId === auditorId) {
      throw new AppError(403, 'SELF_AUDIT_FORBIDDEN', '禁止审批自己发布的内容');
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

      // 审核通过时，通知问题作者有人评论（延迟通知逻辑）
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

    pendingCache.clear();

    return updated;
  }

  async approveAnswer(params: { id: string; auditorId: string }) {
    const { id, auditorId } = params;

    const answer = await prisma.answer.findUnique({
      where: { id }
    });

    if (!answer) {
      throw new AppError(404, 'ANSWER_NOT_FOUND', '回答不存在');
    }

    // 幂等性校验
    if (answer.status !== 'pending') {
      return answer;
    }

    // 自审校验
    if (answer.authorId === auditorId) {
      throw new AppError(403, 'SELF_AUDIT_FORBIDDEN', '禁止审批自己发布的内容');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.answer.update({
        where: { id },
        data: { status: 'approved' }
      });

      await tx.auditLog.create({
        data: {
          auditorId,
          targetType: 'answer',
          targetId: id,
          action: 'approve'
        }
      });

      // 修改原因：回答从 pending 被人工通过后，也应补发“新回答”通知，保持与直通审核路径一致。
      const question = await tx.question.findUnique({
        where: { id: answer.questionId },
        select: { id: true, title: true, authorId: true }
      });
      if (question && question.authorId !== answer.authorId) {
        await tx.notification.create({
          data: {
            userId: question.authorId,
            type: 'new_answer',
            title: '你的问题有新的回答',
            content: JSON.stringify({
              answerId: answer.id,
              questionTitle: question.title
            }),
            targetType: 'question',
            targetId: question.id
          }
        });
      }

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

    // 幂等性校验
    if (q.status !== 'pending') {
      return q;
    }

    // 自审校验
    if (q.authorId === auditorId) {
      throw new AppError(403, 'SELF_AUDIT_FORBIDDEN', '禁止控制自己发布的内容状态');
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

  async rejectAnswer(params: {
    id: string;
    auditorId: string;
    reason: string;
  }) {
    const { id, auditorId, reason } = params;

    if (!reason || !reason.trim()) {
      throw new AppError(400, 'REASON_REQUIRED', '请填写驳回原因');
    }

    const answer = await prisma.answer.findUnique({
      where: { id }
    });

    if (!answer) {
      throw new AppError(404, 'ANSWER_NOT_FOUND', '回答不存在');
    }

    // 幂等性校验
    if (answer.status !== 'pending') {
      return answer;
    }

    // 自审校验
    if (answer.authorId === auditorId) {
      throw new AppError(403, 'SELF_AUDIT_FORBIDDEN', '禁止控制自己发布的内容状态');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.answer.update({
        where: { id },
        data: {
          status: 'rejected',
          aiResult: reason
        }
      });

      await tx.auditLog.create({
        data: {
          auditorId,
          targetType: 'answer',
          targetId: id,
          action: 'reject',
          reason
        }
      });

      await tx.notification.create({
        data: {
          userId: answer.authorId,
          type: 'audit_result',
          title: '你的回答未通过审核',
          content: reason,
          targetType: 'answer',
          targetId: answer.id
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

    // 幂等性校验
    if (comment.status !== 'pending') {
      return comment;
    }

    // 自审校验
    if (comment.authorId === auditorId) {
      throw new AppError(403, 'SELF_AUDIT_FORBIDDEN', '禁止审批自己发布的内容');
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

    // 自审校验
    if (q.authorId === auditorId) {
      throw new AppError(403, 'SELF_AUDIT_FORBIDDEN', '禁止操作自己发布的内容置顶状态');
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
