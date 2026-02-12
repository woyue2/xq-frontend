import { answerService } from '../../services/answer.service';
import { prisma } from '../../config/database';
import { AppError } from '../../errors/AppError';

describe('AnswerService unit tests', () => {
  beforeEach(async () => {
    // 清理与本文件相关的表，避免其他测试残留数据影响唯一索引与计数断言
    await prisma.like.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
    await prisma.user.deleteMany({
      where: {
        phone: {
          startsWith: '136'
        }
      }
    });
  });

  const nextPhone = (() => {
    let counter = 0;
    return () => {
      counter += 1;
      const suffix = String(40000000 + counter).slice(-8);
      return `136${suffix}`;
    };
  })();

  describe('create', () => {
    it('should throw when question does not exist', async () => {
      const phone = nextPhone();

      const user = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          nickname: '回答作者',
          role: 'teacher',
          isActive: true,
          isBanned: false
        }
      });

      await expect(
        answerService.create({
          questionId: 'non-exist-question',
          authorId: user.id,
          content: '回答内容'
        })
      ).rejects.toMatchObject<AppError>({
        code: 'QUESTION_NOT_FOUND'
      } as any);
    });

    it('should throw when content is empty (no text/images/audio)', async () => {
      const phone = nextPhone();

      const user = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          nickname: '回答作者',
          role: 'teacher',
          isActive: true,
          isBanned: false
        }
      });

      const question = await prisma.question.create({
        data: {
          title: '需要回答的问题',
          content: '问题内容',
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
          authorName: '回答作者'
        }
      });

      await expect(
        answerService.create({
          questionId: question.id,
          authorId: user.id,
          content: '',
          images: [],
          audioUrl: undefined
        })
      ).rejects.toMatchObject<AppError>({
        code: 'EMPTY_CONTENT'
      } as any);
    });

    it('should throw when author does not exist', async () => {
      const question = await prisma.question.create({
        data: {
          title: '没有作者的问题',
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
          authorId: 'someone',
          authorName: 'someone'
        }
      });

      await expect(
        answerService.create({
          questionId: question.id,
          authorId: 'non-exist-author',
          content: '回答内容'
        })
      ).rejects.toMatchObject<AppError>({
        code: 'USER_NOT_FOUND'
      } as any);
    });

    it('should create answer and increase question.answers', async () => {
      const phone = nextPhone();

      const author = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          nickname: '李老师',
          role: 'teacher',
          isActive: true,
          isBanned: false
        }
      });

      const question = await prisma.question.create({
        data: {
          title: '二次函数问题',
          content: '问题内容',
          subject: 'math',
          tags: [],
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: author.id,
          authorName: author.nickname
        }
      });

      const result = await answerService.create({
        questionId: question.id,
        authorId: author.id,
        content: '详细回答内容',
        images: ['https://cdn.example.com/answer.jpg'],
        audioUrl: 'https://cdn.example.com/audio.mp3'
      });

      expect(result.id).toBeDefined();
      expect(result.questionId).toBe(question.id);
      expect(result.content).toBe('详细回答内容');
      expect(result.images).toHaveLength(1);
      expect(result.audioUrl).toBe('https://cdn.example.com/audio.mp3');
      expect(result.audioUrls).toEqual(['https://cdn.example.com/audio.mp3']);
      expect(result.authorId).toBe(author.id);
      expect(result.authorName).toBe('李老师');
      expect(result.likes).toBe(0);
      // 老师回答在当前实现中经过 AI 审核后应直接为 approved
      expect(result.status).toBe('approved');

      const updatedQuestion = await prisma.question.findUnique({
        where: { id: question.id }
      });
      expect(updatedQuestion?.answers).toBe(1);
    });
  });

  describe('list', () => {
    it('should list only approved, non-deleted answers and mark liked ones', async () => {
      const teacherPhone = nextPhone();
      const studentPhone = nextPhone();

      const teacher = await prisma.user.upsert({
        where: { phone: teacherPhone },
        update: {},
        create: {
          phone: teacherPhone,
          nickname: '李老师',
          role: 'teacher',
          isActive: true,
          isBanned: false
        }
      });
      const student = await prisma.user.upsert({
        where: { phone: studentPhone },
        update: {},
        create: {
          phone: studentPhone,
          nickname: '学生',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });

      const question = await prisma.question.create({
        data: {
          title: '问题用于回答列表',
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
          authorId: student.id,
          authorName: '学生'
        }
      });

      const a1 = await prisma.answer.create({
        data: {
          questionId: question.id,
          content: '回答1',
          images: [],
          audioUrl: null,
          authorId: teacher.id,
          authorName: '李老师',
          likes: 10,
          status: 'approved'
        }
      });

      await prisma.answer.create({
        data: {
          questionId: question.id,
          content: '回答2',
          images: [],
          audioUrl: null,
          authorId: teacher.id,
          authorName: '李老师',
          likes: 0,
          status: 'approved'
        }
      });

      await prisma.answer.create({
        data: {
          questionId: question.id,
          content: '待审核回答',
          images: [],
          audioUrl: null,
          authorId: teacher.id,
          authorName: '李老师',
          likes: 0,
          status: 'pending'
        }
      });

      await prisma.like.create({
        data: {
          userId: student.id,
          targetType: 'answer',
          targetId: a1.id
        }
      });

      const result = await answerService.list({
        questionId: question.id,
        userId: student.id
      });

      expect(result.total).toBe(2);
      expect(result.list.length).toBe(2);
      expect(
        result.list.every((a) => a.status === 'approved')
      ).toBe(true);

      const liked = result.list.find((a) => a.id === a1.id);
      expect(liked?.isLiked).toBe(true);
    });
  });

  describe('remove', () => {
    it('should throw when answer does not exist or already deleted', async () => {
      const phone = nextPhone();

      const user = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          nickname: '操作者',
          role: 'teacher',
          isActive: true,
          isBanned: false
        }
      });

      await expect(
        answerService.remove({
          answerId: 'non-exist-answer',
          userId: user.id,
          role: 'teacher'
        })
      ).rejects.toMatchObject<AppError>({
        code: 'ANSWER_NOT_FOUND'
      } as any);

      const question = await prisma.question.create({
        data: {
          title: '删除测试问题',
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
          authorName: '操作者'
        }
      });

      const deleted = await prisma.answer.create({
        data: {
          questionId: question.id,
          content: '已删除回答',
          images: [],
          audioUrl: null,
          authorId: user.id,
          authorName: '操作者',
          likes: 0,
          status: 'approved',
          deletedAt: new Date()
        }
      });

      await expect(
        answerService.remove({
          answerId: deleted.id,
          userId: user.id,
          role: 'teacher'
        })
      ).rejects.toMatchObject<AppError>({
        code: 'ANSWER_NOT_FOUND'
      } as any);
    });

    it('should forbid non-author student from deleting when not teacher', async () => {
      const teacherPhone = nextPhone();
      const studentPhone = nextPhone();

      const teacher = await prisma.user.upsert({
        where: { phone: teacherPhone },
        update: {},
        create: {
          phone: teacherPhone,
          nickname: '老师',
          role: 'teacher',
          isActive: true,
          isBanned: false
        }
      });
      const student = await prisma.user.upsert({
        where: { phone: studentPhone },
        update: {},
        create: {
          phone: studentPhone,
          nickname: '学生',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });

      const question = await prisma.question.create({
        data: {
          title: '删除权限问题',
          content: '内容',
          subject: 'math',
          tags: [],
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 1,
          authorId: student.id,
          authorName: '学生'
        }
      });

      const answer = await prisma.answer.create({
        data: {
          questionId: question.id,
          content: '教师回答',
          images: [],
          audioUrl: null,
          authorId: teacher.id,
          authorName: '老师',
          likes: 0,
          status: 'approved'
        }
      });

      await expect(
        answerService.remove({
          answerId: answer.id,
          userId: student.id,
          role: 'student'
        })
      ).rejects.toMatchObject<AppError>({
        code: 'PERMISSION_DENIED'
      } as any);
    });

    it('should soft delete answer and decrease question.answers when author deletes', async () => {
      const phone = nextPhone();

      const teacher = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          nickname: '老师',
          role: 'teacher',
          isActive: true,
          isBanned: false
        }
      });

      const question = await prisma.question.create({
        data: {
          title: '作者删除问题',
          content: '内容',
          subject: 'math',
          tags: [],
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 1,
          authorId: teacher.id,
          authorName: '老师'
        }
      });

      const answer = await prisma.answer.create({
        data: {
          questionId: question.id,
          content: '待删除回答',
          images: [],
          audioUrl: null,
          authorId: teacher.id,
          authorName: '老师',
          likes: 0,
          status: 'approved'
        }
      });

      await answerService.remove({
        answerId: answer.id,
        userId: teacher.id,
        role: 'teacher'
      });

      const updatedAnswer = await prisma.answer.findUnique({
        where: { id: answer.id }
      });
      expect(updatedAnswer?.deletedAt).toBeTruthy();
      expect(updatedAnswer?.status).toBe('banned');

      const updatedQuestion = await prisma.question.findUnique({
        where: { id: question.id }
      });
      expect(updatedQuestion?.answers).toBe(0);
    });
  });
});
