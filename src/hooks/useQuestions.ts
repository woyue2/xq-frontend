/**
 * [POS] src/hooks/useQuestions.ts
 *   所属：hooks 层 | 角色：问题列表无限滚动查询（wrap TanStack Query）
 *   兄弟：useQuestionDetail.ts / useAdminWhitelist.ts / useDebounce.ts
 *
 * [INPUT]
 *   - @tanstack/react-query  → useInfiniteQuery
 *   - @/services/api         → questionService
 *   - @/types/api            → QuestionListParams
 *
 * [OUTPUT]
 *   - useQuestions(params)   → query 对象 + getQuestionById(id)
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/hooks/CLAUDE.md 的文件清单
 */
import { useInfiniteQuery } from '@tanstack/react-query';
import { questionService } from '@/services/api';
import type { QuestionListParams } from '@/types/api';

export function useQuestions(params: Omit<QuestionListParams, 'page' | 'pageSize'> = {}) {
  const query = useInfiniteQuery({
    queryKey: ['questions', params],
    queryFn: async ({ pageParam = 1 }) => {
      // Direct API call since questionService.getQuestions is not available
      const response = await fetch(`/api/questions?${new URLSearchParams({
        ...params as any,
        page: String(pageParam),
        pageSize: '10',
      })}`);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      const nextPage = lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
      return nextPage;
    },
    initialPageParam: 1,
  });

  const getQuestionById = (id: string) => {
    return query.data?.pages.flatMap((page) => page.items).find((q) => q.id === id);
  };

  return { ...query, getQuestionById };
}
