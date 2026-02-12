import { interactionService } from '../../services/interaction.service';
import { prisma } from '../../config/database';
import { AppError } from '../../errors/AppError';

describe('InteractionService unit tests', () => {
  beforeEach(async () => {
    await prisma.like.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.question.deleteMany();
    await prisma.user.deleteMany({
      where: {
        phone: {
          startsWith: '134'
        }
      }
    });
  });

  const nextPhone = (() => {
    let counter = 0;
    return () => {
      counter += 1;
      const suffix = String(60000000 + counter).slice(-8);
      return `134${suffix}`;
    };
  })();

  describe('toggleQuestionLike', () => {
    it('should throw when question does not exist', async () => {
      const phone = nextPhone();

      const user = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          nickname: '点赞用户',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });

      await expect(
        interactionService.toggleQuestionLike({
          questionId: 'non-exist-question',
          userId: user.id
        })
      ).rejects.toMatchObject<AppError>({
        code: 'QUESTION_NOT_FOUND'
      } as any);
    });

    it('should like and unlike question and maintain likes count', async () => {
      const phone = nextPhone();

      const user = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          nickname: '点赞用户',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });

      const question = await prisma.question.create({
        data: {
          title: '点赞问题',
          content: '内容',
          subject: 'math',
          tags: [],
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: user.id,
          authorName: '点赞用户'
        }
      });

      const liked = await interactionService.toggleQuestionLike({
        questionId: question.id,
        userId: user.id
      });

      expect(liked.isLiked).toBe(true);
      expect(liked.likes).toBe(1);

      const unliked = await interactionService.toggleQuestionLike({
        questionId: question.id,
        userId: user.id
      });

      expect(unliked.isLiked).toBe(false);
      expect(unliked.likes).toBe(0);

      const stored = await prisma.question.findUnique({
        where: { id: question.id }
      });
      expect(stored?.likes).toBe(0);
    });
  });

  describe('toggleQuestionFavorite', () => {
    it('should throw when question does not exist', async () => {
      const phone = nextPhone();

      const user = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          nickname: '收藏用户',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });

      await expect(
        interactionService.toggleQuestionFavorite({
          questionId: 'non-exist-question',
          userId: user.id
        })
      ).rejects.toMatchObject<AppError>({
        code: 'QUESTION_NOT_FOUND'
      } as any);
    });

    it('should favorite and unfavorite question and maintain favorites count', async () => {
      const phone = nextPhone();

      const user = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          nickname: '收藏用户',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });

      const question = await prisma.question.create({
        data: {
          title: '收藏问题',
          content: '内容',
          subject: 'math',
          tags: [],
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: user.id,
          authorName: '收藏用户'
        }
      });

      const favorited = await interactionService.toggleQuestionFavorite({
        questionId: question.id,
        userId: user.id
      });

      expect(favorited.isFavorited).toBe(true);
      expect(favorited.favorites).toBe(1);

      const unfavorited =
        await interactionService.toggleQuestionFavorite({
          questionId: question.id,
          userId: user.id
        });

      expect(unfavorited.isFavorited).toBe(false);
      expect(unfavorited.favorites).toBe(0);

      const stored = await prisma.question.findUnique({
        where: { id: question.id }
      });
      expect(stored?.favorites).toBe(0);
    });
  });

  describe('listUserLikes', () => {
    it('should list liked questions with pagination', async () => {
      const phone1 = nextPhone();
      const phone2 = nextPhone();

      const user = await prisma.user.upsert({
        where: { phone: phone1 },
        update: {},
        create: {
          phone: phone1,
          nickname: '点赞用户',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });
      const otherUser = await prisma.user.upsert({
        where: { phone: phone2 },
        update: {},
        create: {
          phone: phone2,
          nickname: '其他用户',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });

      // 清理该用户及对照用户历史点赞记录，保证断言数量稳定
      await prisma.like.deleteMany({
        where: {
          userId: {
            in: [user.id, otherUser.id]
          }
        }
      });

      const q1 = await prisma.question.create({
        data: {
          title: '喜欢的问题1',
          content: '内容1',
          subject: 'math',
          tags: [],
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 5,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: user.id,
          authorName: '点赞用户'
        }
      });

      const q2 = await prisma.question.create({
        data: {
          title: '喜欢的问题2',
          content: '内容2',
          subject: 'math',
          tags: [],
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 3,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: user.id,
          authorName: '点赞用户'
        }
      });

      await prisma.like.createMany({
        data: [
          {
            userId: user.id,
            targetType: 'question',
            targetId: q1.id
          },
          {
            userId: user.id,
            targetType: 'question',
            targetId: q2.id
          },
          {
            userId: otherUser.id,
            targetType: 'question',
            targetId: q1.id
          }
        ]
      });

      const result = await interactionService.listUserLikes({
        userId: user.id,
        page: 1,
        pageSize: 10
      });

      expect(result.list.length).toBe(2);
      expect(result.pagination.total).toBe(2);
      const ids = result.list.map((q: any) => q.id);
      expect(ids).toContain(q1.id);
      expect(ids).toContain(q2.id);
    });
  });

  describe('listUserFavorites', () => {
    it('should list favorited questions with pagination', async () => {
      const phone1 = nextPhone();
      const phone2 = nextPhone();

      const user = await prisma.user.upsert({
        where: { phone: phone1 },
        update: {},
        create: {
          phone: phone1,
          nickname: '收藏用户',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });
      const otherUser = await prisma.user.upsert({
        where: { phone: phone2 },
        update: {},
        create: {
          phone: phone2,
          nickname: '其他用户',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });

      // 清理该用户及对照用户历史收藏记录，保证断言数量稳定
      await prisma.favorite.deleteMany({
        where: {
          userId: {
            in: [user.id, otherUser.id]
          }
        }
      });

      const q1 = await prisma.question.create({
        data: {
          title: '收藏的问题1',
          content: '内容1',
          subject: 'math',
          tags: [],
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 2,
          comments: 0,
          answers: 0,
          authorId: user.id,
          authorName: '收藏用户'
        }
      });

      const q2 = await prisma.question.create({
        data: {
          title: '收藏的问题2',
          content: '内容2',
          subject: 'math',
          tags: [],
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 1,
          comments: 0,
          answers: 0,
          authorId: user.id,
          authorName: '收藏用户'
        }
      });

      await prisma.favorite.createMany({
        data: [
          {
            userId: user.id,
            questionId: q1.id
          },
          {
            userId: user.id,
            questionId: q2.id
          },
          {
            userId: otherUser.id,
            questionId: q1.id
          }
        ]
      });

      const result = await interactionService.listUserFavorites({
        userId: user.id,
        page: 1,
        pageSize: 10
      });

      expect(result.list.length).toBe(2);
      expect(result.pagination.total).toBe(2);
      const ids = result.list.map((q: any) => q.id);
      expect(ids).toContain(q1.id);
      expect(ids).toContain(q2.id);
    });
  });
});
