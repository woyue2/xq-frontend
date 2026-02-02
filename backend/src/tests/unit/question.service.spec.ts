import { questionService } from '../../services/question.service';
import { prisma } from '../../config/database';
import { AppError } from '../../errors/AppError';

describe('QuestionService unit tests', () => {
  describe('create', () => {
    it('should reject empty or too long title', async () => {
      await expect(
        questionService.create({
          title: '',
          authorId: 'u1',
          authorName: '用户1'
        } as any)
      ).rejects.toMatchObject<AppError>({
        code: 'TITLE_TOO_LONG'
      } as any);

      const longTitle = '长'.repeat(120);
      await expect(
        questionService.create({
          title: longTitle,
          authorId: 'u1',
          authorName: '用户1'
        } as any)
      ).rejects.toMatchObject<AppError>({
        code: 'TITLE_TOO_LONG'
      } as any);
    });

    it('should create pending question with default fields', async () => {
      const result = await questionService.create({
        title: '二次函数顶点公式',
        content: '请问顶点坐标如何推导？',
        tags: ['数学'],
        difficulty: 'medium',
        authorId: 'author-1',
        authorName: '学生A'
      });

      expect(result.id).toBeDefined();
      expect(result.title).toBe('二次函数顶点公式');
      expect(result.status).toBe('pending');
      expect(result.aiResult).toBe('无违规');

      const stored = await prisma.question.findUnique({
        where: { id: result.id }
      });
      expect(stored).not.toBeNull();
      expect(stored!.likes).toBe(0);
      expect(stored!.favorites).toBe(0);
      expect(stored!.comments).toBe(0);
      expect(stored!.answers).toBe(0);
    });
  });

  describe('list', () => {
    it('should filter by status, isGoodQuestion and tags', async () => {
      await prisma.question.deleteMany();

      const q1 = await prisma.question.create({
        data: {
          title: '好问题1',
          content: '内容1',
          subject: 'math',
          tags: ['tag-a'],
          difficulty: 'easy',
          status: 'approved',
          isGoodQuestion: true,
          isPinned: false,
          likes: 10,
          favorites: 2,
          comments: 1,
          answers: 0,
          authorId: 'u1',
          authorName: '用户1'
        }
      });

      await prisma.question.create({
        data: {
          title: '普通问题',
          content: '内容2',
          subject: 'math',
          tags: ['tag-b'],
          difficulty: 'medium',
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: 'u2',
          authorName: '用户2'
        }
      });

      await prisma.question.create({
        data: {
          title: '待审核问题',
          content: '内容3',
          subject: 'math',
          tags: ['tag-a'],
          difficulty: 'hard',
          status: 'pending',
          isGoodQuestion: true,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: 'u3',
          authorName: '用户3'
        }
      });

      const result = await questionService.list({
        page: 1,
        pageSize: 20,
        status: 'approved',
        isGoodQuestion: true,
        tags: ['tag-a']
      });

      expect(result.list.length).toBe(1);
      expect(result.list[0].id).toBe(q1.id);
      expect(result.list[0].status).toBe('approved');
      expect(result.list[0].isGoodQuestion).toBe(true);
      expect(result.list[0].tags).toContain('tag-a');
    });
  });

  describe('getById', () => {
    it('should throw when question does not exist', async () => {
      await expect(
        questionService.getById('non-exist-question')
      ).rejects.toMatchObject<AppError>({
        code: 'QUESTION_NOT_FOUND'
      } as any);
    });

    it('should return question detail with default flags', async () => {
      const q = await prisma.question.create({
        data: {
          title: '详情问题',
          content: '详情内容',
          subject: 'math',
          tags: ['t1', 't2'],
          difficulty: 'medium',
          status: 'approved',
          isGoodQuestion: false,
          isPinned: true,
          likes: 5,
          favorites: 3,
          comments: 2,
          answers: 1,
          authorId: 'u-detail',
          authorName: '用户详情'
        }
      });

      const result = await questionService.getById(q.id);

      expect(result.id).toBe(q.id);
      expect(result.title).toBe('详情问题');
      expect(result.images).toEqual([]);
      expect(result.audioUrl).toBeNull();
      expect(result.isLiked).toBe(false);
      expect(result.isFavorited).toBe(false);
      expect(result.isPinned).toBe(true);
      expect(result.likes).toBe(5);
      expect(result.favorites).toBe(3);
      expect(result.comments).toBe(2);
      expect(result.answers).toBe(1);
    });
  });
});

