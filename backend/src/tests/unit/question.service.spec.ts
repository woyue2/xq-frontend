import { questionService } from '../../services/question.service';
import { prisma } from '../../config/database';
import { AppError } from '../../errors/AppError';

describe('QuestionService unit tests', () => {
  beforeEach(async () => {
    await prisma.question.deleteMany();
    await prisma.user.deleteMany({
      where: {
        phone: {
          in: ['13900008888', '13900009999', '13900007777']
        }
      }
    });
  });
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

    it('should create pending question with default fields for safe student content', async () => {
      const student = await prisma.user.create({
        data: {
          id: 'author-1',
          phone: '13900008888',
          nickname: '学生A',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });

      const result = await questionService.create({
        title: '二次函数顶点公式',
        content: '请问顶点坐标如何推导？',
        tags: ['数学'],
        difficulty: 'medium',
        authorId: student.id,
        authorName: student.nickname
      });

      expect(result.id).toBeDefined();
      expect(result.title).toBe('二次函数顶点公式');
      // 学生提问在当前规则下应先进入 pending，待老师审核
      expect(result.status).toBe('pending');
      expect(result.aiResult).toBeDefined();

      const stored = await prisma.question.findUnique({
        where: { id: result.id }
      });
      expect(stored).not.toBeNull();
      expect(stored!.likes).toBe(0);
      expect(stored!.favorites).toBe(0);
      expect(stored!.comments).toBe(0);
      expect(stored!.answers).toBe(0);
    });

    it('should append student grade as tag when student asks question', async () => {
      const student = await prisma.user.create({
        data: {
          id: 'stu-grade-1',
          phone: '13900009999',
          nickname: '学生一',
          role: 'student',
          grade: '初二',
          isActive: true,
          isBanned: false
        }
      });

      const result = await questionService.create({
        title: '带年级标签的问题',
        content: '这是一个学生问题',
        tags: ['tag-a'],
        authorId: student.id,
        authorName: student.nickname
      });

      expect(result.tags).toEqual(expect.arrayContaining(['tag-a', '初二']));

      const stored = await prisma.question.findUnique({
        where: { id: result.id }
      });
      expect(stored?.tags).toEqual(expect.arrayContaining(['tag-a', '初二']));
    });

    it('should persist subject as math even when request subject is missing or non-math', async () => {
      const student = await prisma.user.create({
        data: {
          id: 'stu-subject-1',
          phone: '13900007777',
          nickname: '学生科目',
          role: 'student',
          isActive: true,
          isBanned: false
        }
      });

      const createdWithoutSubject = await questionService.create({
        title: '未传科目',
        content: '测试',
        authorId: student.id,
        authorName: student.nickname
      });

      const createdWithOtherSubject = await questionService.create({
        title: '传入非数学科目',
        content: '测试',
        subject: 'physics',
        authorId: student.id,
        authorName: student.nickname
      });

      const storedWithoutSubject = await prisma.question.findUnique({
        where: { id: createdWithoutSubject.id }
      });
      const storedWithOtherSubject = await prisma.question.findUnique({
        where: { id: createdWithOtherSubject.id }
      });

      expect(storedWithoutSubject?.subject).toBe('math');
      expect(storedWithOtherSubject?.subject).toBe('math');
    }, 15000); // 修改原因：启用“单次重试”后该用例在外部审核接口慢响应时可能超过默认 5s。
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

    it('should fallback to safe defaults when page or pageSize is invalid', async () => {
      const resultInvalidPage = await questionService.list({
        page: 0,
        pageSize: 20
      } as any);
      expect(resultInvalidPage.pagination.page).toBe(1);
      expect(resultInvalidPage.pagination.pageSize).toBe(20);

      const resultInvalidPageSize = await questionService.list({
        page: 1,
        pageSize: 0
      } as any);
      expect(resultInvalidPageSize.pagination.page).toBe(1);
      expect(resultInvalidPageSize.pagination.pageSize).toBe(20);

      const resultInvalidPageNaN = await questionService.list({
        page: NaN as any,
        pageSize: 20
      } as any);
      expect(resultInvalidPageNaN.pagination.page).toBe(1);
      expect(resultInvalidPageNaN.pagination.pageSize).toBe(20);
    });
  });

  describe('getById', () => {
    it('should throw when question does not exist', async () => {
      await expect(
        questionService.getById('non-exist-question', {
          userId: 'viewer',
          role: 'student'
        })
      ).rejects.toMatchObject<AppError>({
        code: 'QUESTION_NOT_FOUND'
      } as any);
    });

    it('should enforce visibility rules for non-approved questions', async () => {
      const pending = await prisma.question.create({
        data: {
          title: '待审核问题',
          content: '详情内容',
          subject: 'math',
          tags: [],
          difficulty: 'medium',
          status: 'pending',
          isGoodQuestion: false,
          isPinned: false,
          likes: 0,
          favorites: 0,
          comments: 0,
          answers: 0,
          authorId: 'author-1',
          authorName: '作者A'
        }
      });

      // 非作者且非教师访问 pending 问题应被拒绝
      await expect(
        questionService.getById(pending.id, {
          userId: 'other-user',
          role: 'student'
        })
      ).rejects.toMatchObject<AppError>({
        code: 'PERMISSION_DENIED'
      } as any);

      // 作者本人可以查看
      const byAuthor = await questionService.getById(pending.id, {
        userId: 'author-1',
        role: 'student'
      });
      expect(byAuthor.id).toBe(pending.id);

      // 教师可以查看
      const byTeacher = await questionService.getById(pending.id, {
        userId: 'teacher-1',
        role: 'teacher'
      });
      expect(byTeacher.id).toBe(pending.id);
    });

    it('should return question detail with default flags for approved question', async () => {
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

      const result = await questionService.getById(q.id, {
        userId: 'viewer',
        role: 'student'
      });

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
