import { prisma } from '../config/database';

export class ProfileService {
  // 修改原因：承接 /profile/my-answers 的查询与结果拼装，消除 Route 直连数据层（P0-3）。
  async getMyAnswers(params: { userId: string; page?: number; pageSize?: number }) {
    const { userId, page = 1, pageSize = 20 } = params;

    const rawPage = Number(page ?? 1);
    const rawSize = Number(pageSize ?? 20);

    const currentPage =
      Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const size =
      Number.isFinite(rawSize) && rawSize > 0 && rawSize <= 100
        ? rawSize
        : 20;

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
}

export const profileService = new ProfileService();
