/**
 * [POS] backend/src/services/answer.service.ts
 *   所属：服务层 | 角色：回答业务逻辑（发布、查询、AI 审核触发）
 *
 * [INPUT]
 *   - ../config/database    → prisma
 *   - ../errors/AppError    → AppError
 *   - ./ai-audit.service    → aiAuditService
 *
 * [OUTPUT]
 *   - answerService（AnswerService 单例）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/services/CLAUDE.md 的文件清单
 */
import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import { aiAuditService } from './ai-audit.service';

export class AnswerService {
  async create(params: {
    questionId: string;
    authorId: string;
    authorRole: string;
    content?: string;
    images?: string[];
    audioUrl?: string;
    audioUrls?: string[];
  }) {
    const { questionId, authorId, authorRole, content, images, audioUrl, audioUrls } = params;

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '问题不存在');
    }

    // 边界保护：禁止在未审核通过的问题下发表回答
    if (question.status !== 'approved') {
      throw new AppError(403, 'ANSWER_DENIED', '无法在未审核通过的问题下发表回答');
    }

    // 权限校验：学生只能回答教师提出的问题
    if (authorRole !== 'teacher' && authorRole !== 'admin') {
      const questionAuthor = await prisma.user.findUnique({ where: { id: question.authorId } });
      if (questionAuthor?.role !== 'teacher' && questionAuthor?.role !== 'admin') {
        throw new AppError(403, 'PERMISSION_DENIED', '学生只能回答教师提出的问题', undefined, 3002);
      }
    }

    const hasText = !!content && content.trim().length > 0;
    const hasImages = !!images && images.length > 0;

    let normalizedAudioUrl: string | null = null;
    if (audioUrls && audioUrls.length > 0) {
      normalizedAudioUrl = JSON.stringify(audioUrls);
    } else if (audioUrl && audioUrl.trim().length > 0) {
      normalizedAudioUrl = audioUrl.trim();
    }

    const hasAudio = !!normalizedAudioUrl;

    if (!hasText && !hasImages && !hasAudio) {
      throw new AppError(
        400,
        'EMPTY_CONTENT',
        '回答内容不能为空'
      );
    }

    const author = await prisma.user.findUnique({
      where: { id: authorId }
    });

    if (!author) {
      throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
    }

    // AI 内容审核（所有用户都需审核，确保回答内容安全）
    let auditResult: { safe: boolean; reason?: string; category?: string; quality?: { clear: boolean; suggestion?: string } } = {
      safe: true,
      quality: { clear: true }
    };
    let initialStatus = (author.role === 'teacher' || author.role === 'admin') ? 'approved' : 'pending';
    let aiResultText = '无违规';

    // 1. 文本审核
    if (hasText) {
      const result = await aiAuditService.auditContent(content!, 'answer');
      auditResult = {
        safe: result.safe,
        reason: result.reason,
        category: result.category,
        quality: result.quality
      };

      if (!result.safe) {
        initialStatus = 'rejected';
        aiResultText = JSON.stringify({
          safe: false,
          reason: result.reason,
          category: result.category
        });
      } else {
        if (author.role === 'teacher' || author.role === 'admin') {
          initialStatus = 'approved';
        }
        aiResultText = JSON.stringify({ safe: true });
      }
    }

    // 2. 图片审核（如果有图片且文本审核通过）
    if (auditResult.safe && hasImages) {
      const imageResults = await aiAuditService.auditImages(images!);
      const unsafeImage = imageResults.find(r => !r.safe);
      if (unsafeImage) {
        auditResult.safe = false;
        auditResult.reason = `图片违规：${unsafeImage.reason || '包含不适合未成年人的内容'}`;
        auditResult.category = unsafeImage.category || 'image_violation';
        initialStatus = 'rejected';
        aiResultText = JSON.stringify({
          safe: false,
          reason: auditResult.reason,
          category: auditResult.category
        });
      }
    }

    const [created] = await prisma.$transaction([
      prisma.answer.create({
        data: {
          questionId,
          content: content ?? '',
          images: images ?? [],
          audioUrl: normalizedAudioUrl,
          authorId,
          authorName: author.name || author.nickname,
          authorAvatar: author.avatar ?? null,
          likes: 0,
          status: initialStatus,
          aiResult: aiResultText
        }
      }),
      prisma.question.update({
        where: { id: questionId },
        data: {
          answers: {
            increment: 1
          }
        }
      })
    ]);

    // 回答创建成功后，若已审核通过，则为提问者生成一条"有新回答"通知（new_answer）
    if (initialStatus === 'approved') {
      try {
        const notificationContent = JSON.stringify({
          answerId: created.id,
          questionTitle: question.title
        });

        await prisma.notification.create({
          data: {
            userId: question.authorId,
            type: 'new_answer',
            title: '你的问题有新的回答',
            content: notificationContent,
            targetType: 'question',
            targetId: question.id
          }
        });
      } catch {
        // 通知创建失败不影响回答主流程，错误由日志系统统一处理（此处静默容错）
      }
    }


    let audioUrlsArr: string[] = [];
    if (created.audioUrl) {
      const trimmed = created.audioUrl.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            audioUrlsArr = parsed.filter((url: unknown) => typeof url === 'string');
          }
        } catch {
          audioUrlsArr = [created.audioUrl];
        }
      } else {
        audioUrlsArr = [created.audioUrl];
      }
    }

    return {
      id: created.id,
      questionId: created.questionId,
      content: created.content,
      images: created.images,
      audioUrl: created.audioUrl,
      audioUrls: audioUrlsArr,
      authorId: created.authorId,
      authorName: created.authorName,
      authorAvatar: created.authorAvatar ?? undefined,
      likes: created.likes,
      status: created.status,
      createdAt: created.createdAt,
      // 返回审核结果供前端显示
      aiAudit: {
        safe: auditResult.safe,
        reason: auditResult.reason
      }
    };
  }

  async list(params: { questionId: string; userId?: string }) {
    const { questionId, userId } = params;

    const answers = await prisma.answer.findMany({
      where: {
        questionId,
        status: 'approved',
        deletedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    let likedIds = new Set<string>();

    if (userId && answers.length > 0) {
      const likes = await prisma.like.findMany({
        where: {
          userId,
          targetType: 'answer',
          targetId: {
            in: answers.map((a) => a.id)
          }
        }
      });
      likedIds = new Set(likes.map((l) => l.targetId));
    }

    return {
      list: answers.map((a) => {
        let audioUrlsArr: string[] = [];
        if (a.audioUrl) {
          const trimmed = a.audioUrl.trim();
          if (trimmed.startsWith('[')) {
            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) {
                audioUrlsArr = parsed.filter((url: unknown) => typeof url === 'string');
              }
            } catch {
              audioUrlsArr = [a.audioUrl];
            }
          } else {
            audioUrlsArr = [a.audioUrl];
          }
        }

        return {
          id: a.id,
          questionId: a.questionId,
          content: a.content,
          images: a.images,
          audioUrl: a.audioUrl,
          audioUrls: audioUrlsArr,
          authorId: a.authorId,
          authorName: a.authorName,
          authorAvatar: a.authorAvatar ?? undefined,
          likes: a.likes,
          isLiked: likedIds.has(a.id),
          status: a.status,
          createdAt: a.createdAt
        };
      }),
      total: answers.length
    };
  }

  async listByAuthor(params: { authorId: string; page: number; pageSize: number }) {
    const { authorId, page, pageSize } = params;
    const skip = (page - 1) * pageSize;

    const [answers, total] = await Promise.all([
      prisma.answer.findMany({
        where: { authorId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.answer.count({ where: { authorId, deletedAt: null } })
    ]);

    const questionIds = Array.from(
      new Set(answers.map((a) => a.questionId).filter(Boolean))
    ) as string[];

    const questions = questionIds.length > 0
      ? await prisma.question.findMany({
          where: { id: { in: questionIds } },
          select: { id: true, title: true }
        })
      : [];

    const titleMap = new Map(questions.map((q) => [q.id, q.title ?? '']));

    return {
      items: answers.map((a) => ({
        id: a.id,
        questionId: a.questionId,
        questionTitle: titleMap.get(a.questionId) ?? '',
        content: a.content,
        likes: a.likes,
        status: a.status,
        createdAt: a.createdAt
      })),
      total,
      page,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async remove(params: { answerId: string; userId: string; role: string }) {
    const { answerId, userId, role } = params;

    const answer = await prisma.answer.findUnique({
      where: { id: answerId }
    });

    if (!answer || answer.deletedAt) {
      throw new AppError(404, 'ANSWER_NOT_FOUND', '回答不存在');
    }

    if (role !== 'teacher' && role !== 'admin' && answer.authorId !== userId) {
      throw new AppError(
        403,
        'PERMISSION_DENIED',
        '只有作者或教师可以删除回答',
        undefined,
        3002
      );
    }

    await prisma.$transaction([
      prisma.answer.update({
        where: { id: answerId },
        data: {
          deletedAt: new Date(),
          status: 'banned'
        }
      }),
      prisma.question.update({
        where: { id: answer.questionId },
        data: {
          answers: {
            decrement: 1
          }
        }
      })
    ]);
  }
}

export const answerService = new AnswerService();
