import { useInfiniteQuery } from '@tanstack/react-query';
import { questionService, QuestionParams } from '@/services/api';

export function useQuestions(params: Omit<QuestionParams, 'page' | 'limit'> = {}) {
    const query = useInfiniteQuery({
        queryKey: ['questions', params],
        queryFn: async ({ pageParam = 1 }) => {
            return questionService.getQuestions({
                ...params,
                page: pageParam,
                limit: 10,
            });
        },
        getNextPageParam: (lastPage) => {
            if (!lastPage) return undefined;
            const nextPage =
                lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
            return nextPage;
        },
        initialPageParam: 1,
    });

    const getQuestionById = (id: string) => {
        return query.data?.pages.flatMap(page => page.items).find(q => q.id === id);
    };

    return { ...query, getQuestionById };
}
