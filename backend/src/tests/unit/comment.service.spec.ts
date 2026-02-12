import { commentService } from '../../services/comment.service';
import { prisma } from '../../config/database';
import { AppError } from '../../errors/AppError';

describe('CommentService unit tests', () => {

  const nextPhone = (() => {
    let counter = 0;
    return () => {
      counter += 1;
      const suffix = String(50000000 + counter).slice(-8);
      return `135${suffix}`;
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
          nickname: '评论作者',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });

      await expect(
        commentService.create({
          questionId: 'non-exist-question',
          authorId: user.id,
          content: '评论内容'
        })
      ).rejects.toMatchObject<AppError>({
        code: 'QUESTION_NOT_FOUND'
      } as any);
    });

    it('should throw when content and image are both empty', async () => {
      const phone = nextPhone();

      const user = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          nickname: '评论作者',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });

      const question = await prisma.question.create({
        data: {
          title: '评论问题',
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
          authorName: '评论作者'
        }
      });

      await expect(
        commentService.create({
          questionId: question.id,
          authorId: user.id,
          content: '',
          image: undefined
        })
      ).rejects.toMatchObject<AppError>({
        code: 'EMPTY_CONTENT'
      } as any);
    });

    it('should throw when author does not exist', async () => {
      const question = await prisma.question.create({
        data: {
          title: '评论作者不存在问题',
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
          authorId: 'u',
          authorName: 'u'
        }
      });

      await expect(
        commentService.create({
          questionId: question.id,
          authorId: 'non-exist-author',
          content: '评论内容'
        })
      ).rejects.toMatchObject<AppError>({
        code: 'USER_NOT_FOUND'
      } as any);
    });

    it('should create comment and increase question.comments', async () => {
      const phone = nextPhone();

      const user = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          nickname: '评论作者',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });

      const question = await prisma.question.create({
        data: {
          title: '评论计数问题',
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
          authorName: user.nickname
        }
      });

      // 使用教师身份，确保评论直接通过审核，便于验证计数与状态。
      const teacherPhone = nextPhone();
      const teacher = await prisma.user.upsert({
        where: { phone: teacherPhone },
        update: {},
        create: {
          phone: teacherPhone,
          nickname: '评论老师',
          role: 'teacher',
          isActive: true,
          isBanned: false
        }
      });

      const result = await commentService.create({
        questionId: question.id,
        authorId: teacher.id,
        content: '这是评论内容',
        image: 'https://cdn.example.com/comment.png'
      });

      expect(result.id).toBeDefined();
      expect(result.questionId).toBe(question.id);
      expect(result.content).toBe('这是评论内容');
      expect(result.image).toBe('https://cdn.example.com/comment.png');
      // 教师评论应直接标记为 approved
      expect(result.status).toBe('approved');

      const updatedQuestion = await prisma.question.findUnique({
        where: { id: question.id }
      });
      expect(updatedQuestion?.comments).toBe(1);
    });
  });

  describe('list', () => {
    it('should list only approved, non-deleted comments', async () => {
      const phone = nextPhone();

      const user = await prisma.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          nickname: '评论用户',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });

      const question = await prisma.question.create({
        data: {
          title: '评论列表问题',
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
          authorName: '评论用户'
        }
      });

      const c1 = await prisma.comment.create({
        data: {
          questionId: question.id,
          content: '评论1',
          image: null,
          authorId: user.id,
          authorName: '评论用户',
          status: 'approved'
        }
      });

      await prisma.comment.create({
        data: {
          questionId: question.id,
          content: '评论2',
          image: null,
          authorId: user.id,
          authorName: '评论用户',
          status: 'pending'
        }
      });

      await prisma.comment.create({
        data: {
          questionId: question.id,
          content: '已删除评论',
          image: null,
          authorId: user.id,
          authorName: '评论用户',
          status: 'approved',
          deletedAt: new Date()
        }
      });

      const result = await commentService.list({
        questionId: question.id
      });

      expect(result.total).toBe(1);
      expect(result.list.length).toBe(1);
      expect(result.list[0].id).toBe(c1.id);
      expect(result.list[0].status).toBe('approved');
    });
  });

  describe('remove', () => {
    it('should throw when comment does not exist or already deleted', async () => {
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
        commentService.remove({
          commentId: 'non-exist-comment',
          userId: user.id,
          role: 'teacher'
        })
      ).rejects.toMatchObject<AppError>({
        code: 'COMMENT_NOT_FOUND'
      } as any);

      const question = await prisma.question.create({
        data: {
          title: '删除评论问题',
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

      const deleted = await prisma.comment.create({
        data: {
          questionId: question.id,
          content: '已删除评论',
          image: null,
          authorId: user.id,
          authorName: '操作者',
          status: 'approved',
          deletedAt: new Date()
        }
      });

      await expect(
        commentService.remove({
          commentId: deleted.id,
          userId: user.id,
          role: 'teacher'
        })
      ).rejects.toMatchObject<AppError>({
        code: 'COMMENT_NOT_FOUND'
      } as any);
    });

    it('should forbid non-author student from deleting comment', async () => {
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
          title: '评论删除权限问题',
          content: '内容',
          subject: 'math',
          tags: [],
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 1,
          answers: 0,
          authorId: student.id,
          authorName: '学生'
        }
      });

      const comment = await prisma.comment.create({
        data: {
          questionId: question.id,
          content: '教师评论',
          image: null,
          authorId: teacher.id,
          authorName: '老师',
          status: 'approved'
        }
      });

      await expect(
        commentService.remove({
          commentId: comment.id,
          userId: student.id,
          role: 'student'
        })
      ).rejects.toMatchObject<AppError>({
        code: 'PERMISSION_DENIED'
      } as any);
    });

    it('should soft delete comment and decrease question.comments when author/teacher deletes', async () => {
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
          title: '评论删除问题',
          content: '内容',
          subject: 'math',
          tags: [],
          status: 'approved',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 1,
          answers: 0,
          authorId: teacher.id,
          authorName: '老师'
        }
      });

      const comment = await prisma.comment.create({
        data: {
          questionId: question.id,
          content: '待删除评论',
          image: null,
          authorId: teacher.id,
          authorName: '老师',
          status: 'approved'
        }
      });

      await commentService.remove({
        commentId: comment.id,
        userId: teacher.id,
        role: 'teacher'
      });

      const updatedComment = await prisma.comment.findUnique({
        where: { id: comment.id }
      });
      expect(updatedComment?.deletedAt).toBeTruthy();
      expect(updatedComment?.status).toBe('banned');

      const updatedQuestion = await prisma.question.findUnique({
        where: { id: question.id }
      });
      expect(updatedQuestion?.comments).toBe(0);
    });
  });
});
