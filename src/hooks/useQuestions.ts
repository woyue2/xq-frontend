import { useInfiniteQuery } from '@tanstack/react-query';
import { questionService, QuestionParams } from '@/services/api';

export function useQuestions(params: Omit<QuestionParams, 'page' | 'limit'> = {}) {
    return useInfiniteQuery({
        queryKey: ['questions', params],
        queryFn: async ({ pageParam = 1 }) => {
            return questionService.getQuestions({
                ...params,
                page: pageParam,
                limit: 10,
            });
        },
        getNextPageParam: (lastPage) => lastPage.nextPage,
        initialPageParam: 1,
    });
}
