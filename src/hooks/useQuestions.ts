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
        getNextPageParam: (lastPage) => lastPage.nextPage,
        initialPageParam: 1,
    });

    const getQuestionById = (id: string) => {
        return query.data?.pages.flatMap(page => page.items).find(q => q.id === id);
    };

    return { ...query, getQuestionById };
}
