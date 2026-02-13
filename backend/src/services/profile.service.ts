import { prisma } from '../config/database';

export class ProfileService {
  private normalizePagination(page?: number, pageSize?: number) {
    const rawPage = Number(page ?? 1);
    const rawSize = Number(pageSize ?? 20);

    const currentPage =
      Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const size =
      Number.isFinite(rawSize) && rawSize > 0 && rawSize <= 100
        ? rawSize
        : 20;

    return { currentPage, size };
  }

  // 修改原因：承接 /profile/my-answers 的查询与结果拼装，消除 Route 直连数据层（P0-3）。
  async getMyAnswers(params: { userId: string; page?: number; pageSize?: number }) {
    const { userId, page = 1, pageSize = 20 } = params;
    const { currentPage, size } = this.normalizePagination(page, pageSize);

    const [answers, total] = await Promise.all([
      prisma.answer.findMany({
        where: {
          authorId: userId,
          deletedAt: null
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (currentPage - 1) * size,
        take: size
      }),
      prisma.answer.count({
        where: {
          authorId: userId,
          deletedAt: null
        }
      })
    ]);

    const questionIds = Array.from(
      new Set(answers.map((a) => a.questionId).filter(Boolean))
    ) as string[];

    const questions =
      questionIds.length > 0
        ? await prisma.question.findMany({
            where: {
              id: {
                in: questionIds
              }
            },
            select: {
              id: true,
              title: true
            }
          })
        : [];

    const questionTitleMap = new Map(
      questions.map((q) => [q.id, q.title ?? ''])
    );

    return {
      items: answers.map((a) => ({
        id: a.id,
        questionId: a.questionId,
        questionTitle: questionTitleMap.get(a.questionId) ?? '',
        content: a.content,
        likes: a.likes,
        status: a.status,
        createdAt: a.createdAt
      })),
      total,
      page: currentPage,
      totalPages: Math.ceil(total / size)
    };
  }

  // 修改原因：新增“待老师作答问题”专用查询，避免前端把“我的回答状态”误当作“待作答任务”。
  async getMyAnswerTodos(params: { userId: string; page?: number; pageSize?: number }) {
    const { userId, page = 1, pageSize = 20 } = params;
    const { currentPage, size } = this.normalizePagination(page, pageSize);

    // ⚠️ 不确定因素：当前口径定义为“审核通过且当前老师尚未回答的问题”；
    // 若后续产品改为“仅无人回答的问题”或“包含老师自己提问”，需要调整 where 条件。
    const whereClause = {
      status: 'approved',
      authorId: {
        not: userId
      },
      answerList: {
        none: {
          authorId: userId,
          deletedAt: null
        }
      }
    } as const;

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        skip: (currentPage - 1) * size,
        take: size,
        select: {
          id: true,
          title: true,
          content: true,
          subject: true,
          difficulty: true,
          likes: true,
          createdAt: true,
          authorName: true
        }
      }),
      prisma.question.count({
        where: whereClause
      })
    ]);

    return {
      items: questions.map((q) => ({
        id: q.id,
        title: q.title,
        content: q.content ?? '',
        subject: q.subject ?? '',
        difficulty: q.difficulty ?? '',
        likes: q.likes,
        createdAt: q.createdAt,
        authorName: q.authorName
      })),
      total,
      page: currentPage,
      totalPages: Math.ceil(total / size)
    };
  }
}

export const profileService = new ProfileService();
