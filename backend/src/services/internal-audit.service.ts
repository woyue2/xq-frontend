import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

export type AiResultPayload = {
  safe?: boolean;
  score?: number;
  [key: string]: unknown;
};

export class InternalAuditService {
  // 修改原因：把 /internal/ai-check 的审核状态判定和数据写入集中到 Service，避免 Route 直接承担业务编排（P0-3）。
  async processAiCheckCallback(params: {
    targetType: string;
    targetId: string;
    result: AiResultPayload;
  }) {
    const { targetType, targetId, result } = params;

    let aiResult: string;
    try {
      aiResult = JSON.stringify(result);
    } catch {
      throw new AppError(
        400,
        'INVALID_RESULT_PAYLOAD',
        'AI 回调结果字段不可序列化'
      );
    }

    const safe = result.safe === true;
    let updated: { id: string; status: string; aiResult: string | null } | null =
      null;

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
        ? author?.role === 'teacher'
          ? 'approved'
          : 'pending'
        : 'rejected';

      updated = await prisma.question.update({
        where: { id: targetId },
        data: {
          aiResult,
          status: nextStatus as any,
          score: typeof result.score === 'number' ? result.score : undefined
        },
        select: { id: true, status: true, aiResult: true }
      });
    } else if (targetType === 'answer') {
      const nextStatus = safe ? 'approved' : 'rejected';

      updated = await prisma.answer.update({
        where: { id: targetId },
        data: { aiResult, status: nextStatus as any },
        select: { id: true, status: true, aiResult: true }
      });
    } else if (targetType === 'comment') {
      const comment = await prisma.comment.findUnique({
        where: { id: targetId },
        select: { authorId: true }
      });
      if (!comment) throw new AppError(404, 'CONTENT_NOT_FOUND', '评论不存在');

      const author = await prisma.user.findUnique({
        where: { id: comment.authorId },
        select: { role: true }
      });

      const nextStatus =
        safe && author?.role === 'teacher'
          ? 'approved'
          : safe
            ? 'pending'
            : 'rejected';

      updated = await prisma.comment.update({
        where: { id: targetId },
        data: { aiResult, status: nextStatus as any },
        select: { id: true, status: true, aiResult: true }
      });
    } else {
      throw new AppError(
        400,
        'INVALID_CONTENT_TYPE',
        '不支持的审核内容类型'
      );
    }

    if (!updated) {
      throw new AppError(404, 'CONTENT_NOT_FOUND', '内容不存在');
    }

    return updated;
  }
}

export const internalAuditService = new InternalAuditService();
