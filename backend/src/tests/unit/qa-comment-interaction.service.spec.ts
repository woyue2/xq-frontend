import { QuestionService } from '../../services/question.service';
import { AnswerService } from '../../services/answer.service';
import { CommentService } from '../../services/comment.service';
import { InteractionService } from '../../services/interaction.service';
import { prisma } from '../../config/database';
import { AppError } from '../../errors/AppError';

const questionService = new QuestionService();
const answerService = new AnswerService();
const commentService = new CommentService();
const interactionService = new InteractionService();

const prismaAny = prisma as any;

describe('Question/Answer/Comment/Interaction Service - 单元测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    prismaAny.question = {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    };
    prismaAny.answer = {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    };
    prismaAny.comment = {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    };
    prismaAny.like = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    };
    prismaAny.favorite = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    };
    prismaAny.$transaction = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('QuestionService', () => {
    it('应当在标题缺失或过长时抛出 TITLE_TOO_LONG', async () => {
      await expect(
        questionService.create({
          title: '',
          authorId: 'u1',
          authorName: '学生A'
        } as any)
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'TITLE_TOO_LONG'
      });
    });

    it('应当成功创建问题并返回基础字段', async () => {
      const createdAt = new Date();
      (prismaAny.question.create as jest.Mock).mockResolvedValue({
        id: 'q1',
        title: '测试问题',
        content: '内容',
        tags: ['tag1'],
        difficulty: 'easy',
        status: 'pending',
        aiResult: '无违规',
        authorId: 'u1',
        authorName: '学生A',
        authorAvatar: null,
        createdAt
      });

      const result = await questionService.create({
        title: '测试问题',
        content: '内容',
        tags: ['tag1'],
        authorId: 'u1'
      });

      expect(result.id).toBe('q1');
      expect(result.title).toBe('测试问题');
      expect(result.status).toBe('pending');
      expect(result.authorId).toBe('u1');
    });

    it('应当在问题不存在时 getById 抛出 QUESTION_NOT_FOUND', async () => {
      (prismaAny.question.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(questionService.getById('missing')).rejects.toMatchObject<
        Partial<AppError>
      >({
        code: 'QUESTION_NOT_FOUND',
        status: 404
      });
    });
  });

  describe('AnswerService', () => {
    it('应当在问题不存在时抛出 QUESTION_NOT_FOUND', async () => {
      (prismaAny.question.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        answerService.create({
          questionId: 'missing',
          authorId: 'u1',
          authorRole: 'teacher',
          content: '回答'
        })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'QUESTION_NOT_FOUND'
      });
    });

    it('应当在回答内容为空时抛出 EMPTY_CONTENT', async () => {
      (prismaAny.question.findUnique as jest.Mock).mockResolvedValue({
        id: 'q1',
        status: 'approved'
      });

      await expect(
        answerService.create({
          questionId: 'q1',
          authorId: 'u1',
          authorRole: 'teacher',
          content: '   ',
          images: [],
          audioUrl: undefined
        })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'EMPTY_CONTENT'
      });
    });

    it('应当在作者不存在时抛出 USER_NOT_FOUND', async () => {
      (prismaAny.question.findUnique as jest.Mock).mockResolvedValue({
        id: 'q1',
        status: 'approved'
      });
      prismaAny.user = {
        findUnique: jest.fn().mockResolvedValue(null)
      };

      await expect(
        answerService.create({
          questionId: 'q1',
          authorId: 'u1',
          authorRole: 'teacher',
          content: '回答'
        })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'USER_NOT_FOUND'
      });
    });

    it('应当在创建回答成功时维护问题 answers 计数', async () => {
      const createdAt = new Date();

      (prismaAny.question.findUnique as jest.Mock).mockResolvedValue({
        id: 'q1',
        status: 'approved'
      });
      prismaAny.user = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          nickname: '学生A',
          avatar: null
        })
      };

      (prismaAny.$transaction as jest.Mock).mockResolvedValue([
        {
          id: 'a1',
          questionId: 'q1',
          content: '回答',
          images: [],
          audioUrl: null,
          authorId: 'u1',
          authorName: '学生A',
          authorAvatar: null,
          likes: 0,
          status: 'pending',
          createdAt
        },
        {}
      ]);

      const result = await answerService.create({
        questionId: 'q1',
        authorId: 'u1',
        authorRole: 'teacher',
        content: '回答'
      });

      expect(result.id).toBe('a1');
      expect(result.questionId).toBe('q1');
      expect(result.authorId).toBe('u1');
    });
  });

  describe('CommentService', () => {
    it('应当在问题不存在时抛出 QUESTION_NOT_FOUND', async () => {
      (prismaAny.question.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        commentService.create({
          questionId: 'missing',
          authorId: 'u1',
          authorRole: 'student',
          content: '评论'
        })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'QUESTION_NOT_FOUND'
      });
    });

    it('应当在文本与图片均为空时抛出 EMPTY_CONTENT', async () => {
      (prismaAny.question.findUnique as jest.Mock).mockResolvedValue({
        id: 'q1',
        status: 'approved'
      });

      await expect(
        commentService.create({
          questionId: 'q1',
          authorId: 'u1',
          authorRole: 'student',
          content: '   ',
          image: undefined
        })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'EMPTY_CONTENT'
      });
    });

    it('应当在作者不存在时抛出 USER_NOT_FOUND', async () => {
      (prismaAny.question.findUnique as jest.Mock).mockResolvedValue({
        id: 'q1',
        status: 'approved'
      });
      prismaAny.user = {
        findUnique: jest.fn().mockResolvedValue(null)
      };

      await expect(
        commentService.create({
          questionId: 'q1',
          authorId: 'u1',
          authorRole: 'teacher',
          content: '评论'
        })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'USER_NOT_FOUND'
      });
    });

    it('应当在创建评论成功时维护问题 comments 计数', async () => {
      const createdAt = new Date();

      (prismaAny.question.findUnique as jest.Mock).mockResolvedValue({
        id: 'q1',
        status: 'approved'
      });
      prismaAny.user = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          nickname: '学生A',
          avatar: null
        })
      };

      (prismaAny.$transaction as jest.Mock).mockResolvedValue([
        {
          id: 'c1',
          questionId: 'q1',
          content: '评论',
          image: null,
          authorId: 'u1',
          authorName: '学生A',
          authorAvatar: null,
          status: 'pending',
          aiResult: '无违规',
          createdAt
        },
        {}
      ]);

      const result = await commentService.create({
        questionId: 'q1',
        authorId: 'u1',
        authorRole: 'teacher',
        content: '评论'
      });

      expect(result.id).toBe('c1');
      expect(result.questionId).toBe('q1');
      expect(result.authorId).toBe('u1');
    });
  });

  describe('InteractionService', () => {
    it('应当在问题不存在时 toggleQuestionLike 抛出 QUESTION_NOT_FOUND', async () => {
      (prismaAny.question.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        interactionService.toggleQuestionLike({
          questionId: 'missing',
          userId: 'u1'
        })
      ).rejects.toMatchObject<Partial<AppError>>({
        code: 'QUESTION_NOT_FOUND'
      });
    });

    it('应当在第一次点赞时创建 like 并增加计数', async () => {
      (prismaAny.question.findUnique as jest.Mock).mockResolvedValue({
        id: 'q1',
        status: 'approved'
      });

      const tx = {
        like: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          delete: jest.fn()
        },
        question: {
          update: jest.fn().mockResolvedValue({
            id: 'q1',
        status: 'approved',
            likes: 1
          })
        }
      };

      (prismaAny.$transaction as jest.Mock).mockImplementation(
        async (fn: (tx: any) => Promise<any>) => fn(tx)
      );

      const result = await interactionService.toggleQuestionLike({
        questionId: 'q1',
        userId: 'u1'
      });

      expect(tx.like.create).toHaveBeenCalled();
      expect(result.isLiked).toBe(true);
      expect(result.likes).toBe(1);
    });

    it('应当在再次调用 toggleQuestionLike 时取消点赞并减少计数', async () => {
      (prismaAny.question.findUnique as jest.Mock).mockResolvedValue({
        id: 'q1',
        status: 'approved'
      });

      const tx = {
        like: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'like1',
            userId: 'u1',
            targetType: 'question',
            targetId: 'q1'
          }),
          create: jest.fn(),
          delete: jest.fn()
        },
        question: {
          update: jest.fn().mockResolvedValue({
            id: 'q1',
        status: 'approved',
            likes: 0
          })
        }
      };

      (prismaAny.$transaction as jest.Mock).mockImplementation(
        async (fn: (tx: any) => Promise<any>) => fn(tx)
      );

      const result = await interactionService.toggleQuestionLike({
        questionId: 'q1',
        userId: 'u1'
      });

      expect(tx.like.delete).toHaveBeenCalled();
      expect(result.isLiked).toBe(false);
      expect(result.likes).toBe(0);
    });

    it('应当返回用户点赞的问题列表与分页信息', async () => {
      const createdAt = new Date();

      (prismaAny.like.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'like1',
          userId: 'u1',
          targetType: 'question',
          targetId: 'q1',
          createdAt
        }
      ]);
      (prismaAny.like.count as jest.Mock).mockResolvedValue(1);
      (prismaAny.question.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'q1',
        status: 'approved',
          title: '测试问题',
          content: '内容',
          authorName: '学生A',
          likes: 1,
          favorites: 0,
          answers: 0,
          createdAt
        }
      ]);

      const result = await interactionService.listUserLikes({
        userId: 'u1',
        page: 1,
        pageSize: 10
      });

      expect(result.list).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.list[0]?.id).toBe('q1');
    });
  });
});
