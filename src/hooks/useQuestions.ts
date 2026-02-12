import { useInfiniteQuery } from '@tanstack/react-query';
import { questionService } from '@/services/api';
import type { QuestionListParams } from '@/types/api';

export function useQuestions(params: Omit<QuestionListParams, 'page' | 'pageSize'> = {}) {
    const query = useInfiniteQuery({
        queryKey: ['questions', params],
        queryFn: async ({ pageParam = 1 }) => {
            return questionService.getQuestions({
                ...params,
                page: pageParam,
                pageSize: 10,
            });
        },
        getNextPageParam: (lastPage) => {
            if (!lastPage) return undefined;
            const nextPage =
                lastPage.pagination.page < lastPage.pagination.totalPages ? lastPage.pagination.page + 1 : undefined;
            return nextPage;
        },
        initialPageParam: 1,
    });

    const getQuestionById = (id: string) => {
        return query.data?.pages.flatMap(page => page.pagination ? page.list : []).find(q => q.id === id);
    };

    return { ...query, getQuestionById };
}
