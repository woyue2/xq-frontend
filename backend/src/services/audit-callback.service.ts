/**
 * [POS] backend/src/services/audit-callback.service.ts
 *   所属：服务层 | 角色：AI 审核回调业务逻辑（处理外部 AI 服务的审核结果写回）
 *   兄弟：ai-audit.service.ts / audit.service.ts
 *
 * [INPUT]
 *   - ../config/database → prisma
 *   - ../errors/AppError → AppError
 *
 * [OUTPUT]
 *   - auditCallbackService（AuditCallbackService 单例）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/services/CLAUDE.md 的文件清单
 */
import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

type AiResultPayload = {
  safe?: boolean;
  score?: number;
  [key: string]: unknown;
};

export class AuditCallbackService {
  async applyResult(params: {
    targetType: string;
    targetId: string;
    result: AiResultPayload;
    aiResult: string;
  }) {
    const { targetType, targetId, result, aiResult } = params;
    const safe = result.safe === true;

    if (targetType === 'question') {
      const question = await prisma.question.findUnique({
        where: { id: targetId },
        select: { authorId: true }
      });
      if (!question) throw new AppError(404, 'CONTENT_NOT_FOUND', '问题不存在');

      const author = await prisma.user.findUnique({
        where: { id: question.authorId },
        select: { role: true }
      });

      const nextStatus = safe
        ? (author?.role === 'teacher' ? 'approved' : 'pending')
        : 'rejected';

      return prisma.question.update({
        where: { id: targetId },
        data: {
          aiResult,
          status: nextStatus as any,
          score: typeof result.score === 'number' ? result.score : undefined
        },
        select: { id: true, status: true, aiResult: true }
      });
    }

    if (targetType === 'answer') {
      const nextStatus = safe ? 'approved' : 'rejected';
      return prisma.answer.update({
        where: { id: targetId },
        data: { aiResult, status: nextStatus as any },
        select: { id: true, status: true, aiResult: true }
      });
    }

    if (targetType === 'comment') {
      const comment = await prisma.comment.findUnique({
        where: { id: targetId },
        select: { authorId: true }
      });
      if (!comment) throw new AppError(404, 'CONTENT_NOT_FOUND', '评论不存在');

      const author = await prisma.user.findUnique({
        where: { id: comment.authorId },
        select: { role: true }
      });

      const nextStatus = safe
        ? (author?.role === 'teacher' ? 'approved' : 'pending')
        : 'rejected';

      return prisma.comment.update({
        where: { id: targetId },
        data: { aiResult, status: nextStatus as any },
        select: { id: true, status: true, aiResult: true }
      });
    }

    throw new AppError(400, 'INVALID_CONTENT_TYPE', '不支持的审核内容类型');
  }
}

export const auditCallbackService = new AuditCallbackService();
