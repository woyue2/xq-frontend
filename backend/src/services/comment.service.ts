import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import { aiAuditService } from './ai-audit.service';
import { notificationService } from './notification.service';

export class CommentService {
  async create(params: {
    questionId: string;
    authorId: string;
    content?: string;
    image?: string;
  }) {
    const { questionId, authorId, content, image } = params;

    const hasText = !!content && content.trim().length > 0;
    const hasImage = !!image;

    if (!hasText && !hasImage) {
      throw new AppError(
        400,
        'EMPTY_CONTENT',
        '评论内容不能为空'
      );
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

    const author = await prisma.user.findUnique({
      where: { id: authorId }
    });

    if (!author) {
      throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
    }

    // AI 内容审核（老师与非老师都需要经过 AI 审核）
    let auditResult: {
      safe: boolean;
      reason?: string;
      category?: string;
      requiresManualReview?: boolean;
      quality?: { clear: boolean; suggestion?: string }
    } = {
      safe: true,
      quality: { clear: true }
    };
    let initialStatus = author.role === 'teacher' ? 'approved' : 'pending';
    let aiResultText = '无违规';

    if (hasText) {
      const result = await aiAuditService.auditContent(content!, 'comment');
      auditResult = {
        safe: result.safe,
        reason: result.reason,
        category: result.category,
        requiresManualReview: result.requiresManualReview
      };

      if (result.requiresManualReview) {
        // AI 审核服务异常，转人工审核
        initialStatus = 'pending';
        aiResultText = JSON.stringify({
          safe: result.safe,
          reason: result.reason,
          category: result.category,
          requiresManualReview: true
        });
      } else if (!result.safe) {
        initialStatus = 'rejected';
        aiResultText = JSON.stringify({
          safe: false,
          reason: result.reason,
          category: result.category
        });
      } else {
        // 修改原因：老师评论也接入 AI 审核；AI 通过后老师维持自动通过，学生仍待人工复核。
        initialStatus = author.role === 'teacher' ? 'approved' : 'pending';
        aiResultText = JSON.stringify({ safe: true });
      }
    }

    const [created] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          questionId,
          content: content ?? '',
          image: image ?? null,
          authorId,
          // 修改原因：评论区属于公开场景，默认展示昵称优先。
          // ⚠️ 不确定因素：若未来需要向特定角色展示真实姓名，请在响应层按角色脱敏处理。
          authorName: author.nickname || author.name || '用户',
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
      questionTitle: question.title,  // 补充 questionTitle
      content: created.content,
      image: created.image ?? undefined,
      authorId: created.authorId,
      authorName: created.authorName,
      authorAvatar: created.authorAvatar ?? undefined,
      authorRole: author.role,  // 补充 authorRole
      status: created.status,
      aiResult: created.aiResult ?? undefined,
      createdAt: created.createdAt,
      // 返回审核结果供前端显示
      aiAudit: {
        safe: auditResult.safe,
        reason: auditResult.reason
      }
    };
  }

  async list(params: { questionId: string }) {
    const { questionId } = params;

    // 先查询评论
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

    // 批量查询关联的问题标题
    const questionIds = [...new Set(comments.map(c => c.questionId))];
    const questions = await prisma.question.findMany({
      where: {
        id: { in: questionIds }
      },
      select: {
        id: true,
        title: true
      }
    });
    const questionMap = new Map(questions.map(q => [q.id, q.title]));

    return {
      list: comments.map((c) => ({
        id: c.id,
        questionId: c.questionId,
        questionTitle: questionMap.get(c.questionId),  // 补充 questionTitle
        content: c.content,
        image: c.image ?? undefined,
        authorId: c.authorId,
        authorName: c.authorName,
        authorAvatar: c.authorAvatar ?? undefined,
        // authorRole 暂不返回，需要 schema 支持
        status: c.status,
        aiResult: c.aiResult ?? undefined,
        createdAt: c.createdAt,
        // 补充 aiAudit 字段，从 aiResult 解析
        aiAudit: (() => {
          if (c.aiResult && c.aiResult !== '无违规') {
            try {
              const result = JSON.parse(c.aiResult);
              return { safe: result.safe ?? true, reason: result.reason };
            } catch {
              return undefined;
            }
          }
          return undefined;
        })()
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
