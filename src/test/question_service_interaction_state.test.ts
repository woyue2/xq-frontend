import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, questionService } from '@/services/api';

describe('questionService.getQuestions interaction state mapping', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should map isLiked/isFavorited from backend list response', async () => {
    // 修改原因：回归覆盖“后端返回互动状态，但前端映射后丢失”问题。
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        code: 200,
        message: 'success',
        data: {
          list: [
            {
              id: 'q-interaction-1',
              title: '互动状态映射题目',
              content: '用于验证列表映射',
              authorId: 'u-1',
              authorName: '测试学生',
              isGoodQuestion: false,
              isPinned: false,
              likes: 1,
              favorites: 1,
              comments: 0,
              answers: 0,
              status: 'approved',
              createdAt: '2026-02-13T00:00:00.000Z',
              subject: 'math',
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

    const result = await questionService.getQuestions({ page: 1, pageSize: 10 });

    expect(result.list).toHaveLength(1);
    expect(result.list[0].isLiked).toBe(true);
    expect(result.list[0].isFavorited).toBe(true);
  });

  it('should fallback to false when backend omits interaction fields', async () => {
    // ⚠️ 不确定因素：旧后端或中间代理可能省略 isLiked/isFavorited，此处验证兼容兜底。
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        code: 200,
        message: 'success',
        data: {
          list: [
            {
              id: 'q-interaction-2',
              title: '兼容兜底题目',
              content: '用于验证兼容',
              authorId: 'u-2',
              authorName: '测试家长',
              isGoodQuestion: false,
              isPinned: false,
              likes: 0,
              favorites: 0,
              comments: 0,
              answers: 0,
              status: 'approved',
              createdAt: '2026-02-13T00:00:00.000Z',
              subject: 'math'
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

    const result = await questionService.getQuestions({ page: 1, pageSize: 10 });

    expect(result.list).toHaveLength(1);
    expect(result.list[0].isLiked).toBe(false);
    expect(result.list[0].isFavorited).toBe(false);
  });
});
