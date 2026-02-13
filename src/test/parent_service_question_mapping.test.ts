import { describe, it, expect, vi, afterEach } from 'vitest';
import { api } from '@/services/api';
import { parentService } from '@/services/parentService';

describe('parentService.getChildQuestions mapping', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should normalize flat counters to QuestionCard-compatible fields', async () => {
    // 修改原因：覆盖“家长列表返回扁平计数字段，卡片统计显示异常”回归场景。
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        code: 200,
        message: 'success',
        data: {
          list: [
            {
              id: 'q-parent-1',
              title: '家长列表问题',
              content: '内容',
              subject: 'math',
              tags: [],
              images: [],
              status: 'approved',
              isPinned: false,
              isGoodQuestion: false,
              authorId: 'student-1',
              authorName: '学生A',
              createdAt: '2026-02-13T00:00:00.000Z',
              likes: 3,
              favorites: 2,
              comments: 1,
              answers: 4,
              isLiked: true,
              isFavorited: true
            }
          ],
          pagination: {
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1
          }
        }
      }
    } as any);

    const response = await parentService.getChildQuestions('child-1', { page: 1, pageSize: 10 });
    const item = response.data.data.list[0];

    expect(item.stats.likes).toBe(3);
    expect(item.stats.favorites).toBe(2);
    expect(item.stats.comments).toBe(1);
    expect(item.stats.answers).toBe(4);
    expect(item.likeCount).toBe(3);
    expect(item.collectionCount).toBe(2);
    expect(item.answerCount).toBe(4);
    expect(item.isLiked).toBe(true);
    expect(item.isFavorited).toBe(true);
  });

  it('should fallback safely when optional fields are missing', async () => {
    // ⚠️ 不确定因素：旧后端可能未返回互动状态或部分计数字段，这里验证兼容兜底。
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        code: 200,
        message: 'success',
        data: {
          list: [
            {
              id: 'q-parent-2',
              title: '家长列表兼容题目',
              subject: 'math',
              images: [],
              status: 'approved',
              isPinned: false,
              isGoodQuestion: false,
              authorId: 'student-2',
              authorName: '学生B',
              createdAt: '2026-02-13T00:00:00.000Z'
            }
          ],
          pagination: {
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1
          }
        }
      }
    } as any);

    const response = await parentService.getChildQuestions('child-2', { page: 1, pageSize: 10 });
    const item = response.data.data.list[0];

    expect(item.stats.likes).toBe(0);
    expect(item.stats.favorites).toBe(0);
    expect(item.stats.comments).toBe(0);
    expect(item.stats.answers).toBe(0);
    expect(item.isLiked).toBe(false);
    expect(item.isFavorited).toBe(false);
  });
});
