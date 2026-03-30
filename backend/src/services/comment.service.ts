/**
 * [POS] backend/src/services/comment.service.ts
 *   所属：服务层 | 角色：评论业务逻辑（发布、删除、查询，含 AI 审核触发）
 *
 * [INPUT]
 *   - ../config/database    → prisma
 *   - ../errors/AppError    → AppError
 *   - ./ai-audit.service    → aiAuditService
 *   - ./notification.service → notificationService
 *
 * [OUTPUT]
 *   - commentService（CommentService 单例）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/services/CLAUDE.md 的文件清单
 */
import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import { aiAuditService } from './ai-audit.service';
import { notificationService } from './notification.service';

export class CommentService {
  async create(params: {
    questionId: string;
    authorId: string;
    authorRole: string;
    content?: string;
    image?: string;
  }) {
    const { questionId, authorId, authorRole, content, image } = params;

    const hasText = !!content && content.trim().length > 0;
    const hasImage = !!image;

    if (!hasText && !hasImage) {
      throw new AppError(
        400,
        'EMPTY_CONTENT',
        '评论内容不能为空'
      );
    }

    if (authorRole === 'parent') {
      throw new AppError(403, 'PERMISSION_DENIED', '家长账号无评论权限', undefined, 3003);
    }

    // 先检查问题与作者是否存在，语义与 AnswerService 保持一致，
    // 便于单元测试通过 prisma.question / prisma.user 直接打桩。
    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }

    // 边界保护：禁止在未审核通过的问题下发表评论
    if (question.status !== 'approved') {
      throw new AppError(403, 'COMMENT_DENIED', '无法在未审核通过的问题下发表评论');
    }

    if (authorRole === 'student' && question.authorId !== authorId) {
      throw new AppError(403, 'PERMISSION_DENIED', '学生只能评论自己的问题', undefined, 3003);
    }

    const author = await prisma.user.findUnique({
      where: { id: authorId }
    });

    if (!author) {
      throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
    }

    // AI 内容审核（所有用户）
    let initialStatus = 'pending';
    let aiResultText = '无违规';

    if (hasText) {
      const result = await aiAuditService.auditContent(content!, 'comment');

      if (!result.safe) {
        initialStatus = 'rejected';
        aiResultText = JSON.stringify({
          safe: false,
          reason: result.reason,
          category: result.category
        });
      } else {
        // AI 审核通过，老师评论直接放行，其他用户保持 pending 等人工复核
        initialStatus = author.role === 'teacher' ? 'approved' : 'pending';
        aiResultText = JSON.stringify({ safe: true });
      }
    } else if (author.role === 'teacher') {
      // 纯图片评论，老师直接放行
      initialStatus = 'approved';
    }

    const [created] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          questionId,
          content: content ?? '',
          image: image ?? null,
          authorId,
          authorName: author.name || author.nickname,
          authorAvatar: author.avatar ?? null,
          status: initialStatus,
          aiResult: aiResultText
        }
      }),
      prisma.question.update({
        where: { id: questionId },
        data: {
          comments: {
            increment: 1
          }
        }
      })
    ]);

    // 发送通知给问题作者 (仅当评论已自动通过且评论者不是作者本人)
    if (initialStatus === 'approved' && question.authorId !== authorId) {
      await notificationService.create({
        userId: question.authorId,
        type: 'comment',
        title: '有人评论了你的问题',
        content: content || '[图片评论]',
        targetType: 'question',
        targetId: questionId
      });
    }

    return {
      id: created.id,
      questionId: created.questionId,
      content: created.content,
      image: created.image ?? undefined,
      authorId: created.authorId,
      authorName: created.authorName,
      authorAvatar: created.authorAvatar ?? undefined,
      status: created.status,
      aiResult: created.aiResult ?? undefined,
      createdAt: created.createdAt
    };
  }

  async list(params: { questionId: string }) {
    const { questionId } = params;

    const comments = await prisma.comment.findMany({
      where: {
        questionId,
        status: 'approved',
        deletedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      list: comments.map((c) => ({
        id: c.id,
        questionId: c.questionId,
        content: c.content,
        image: c.image ?? undefined,
        authorId: c.authorId,
        authorName: c.authorName,
        authorAvatar: c.authorAvatar ?? undefined,
        status: c.status,
        aiResult: c.aiResult ?? undefined,
        createdAt: c.createdAt
      })),
      total: comments.length
    };
  }

  async remove(params: { commentId: string; userId: string; role: string }) {
    const { commentId, userId, role } = params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment || comment.deletedAt) {
      throw new AppError(404, 'COMMENT_NOT_FOUND', '评论不存在');
    }

    if (role !== 'teacher' && comment.authorId !== userId) {
      throw new AppError(
        403,
        'PERMISSION_DENIED',
        '只有作者或教师可以删除评论',
        undefined,
        3003
      );
    }

    await prisma.$transaction([
      prisma.comment.update({
        where: { id: commentId },
        data: {
          deletedAt: new Date(),
          status: 'banned'
        }
      }),
      prisma.question.update({
        where: { id: comment.questionId },
        data: {
          comments: {
            decrement: 1
          }
        }
      })
    ]);
  }
}

export const commentService = new CommentService();
