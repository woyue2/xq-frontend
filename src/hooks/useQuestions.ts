import { useInfiniteQuery } from '@tanstack/react-query';
import { questionService } from '@/services/api';
import type { QuestionListParams } from '@/types/api';
import { useAuthStore } from '@/stores/useAuthStore';

type UseQuestionsParams = Omit<QuestionListParams, 'page' | 'pageSize'> & {
    topic?: string;
};

export function useQuestions(params: UseQuestionsParams = {}) {
    const userId = useAuthStore((state) => state.user?.id ?? null);

    const query = useInfiniteQuery({
        // 修改原因：/questions 列表返回 isLiked/isFavorited 与当前用户相关，
        // queryKey 增加 userId，避免切换账号后复用到上一位用户的互动状态缓存。
        queryKey: ['questions', userId, params],
        queryFn: async ({ pageParam = 1 }) => {
            const { topic, tags, ...rest } = params;
            // 修改原因：前端筛选组件传的是 topic，而后端 /questions 仅按 tags 过滤；
            // 在通用查询入口统一做映射，避免各页面重复拼接。
            const mergedTags = topic
                ? Array.from(new Set([...(tags ?? []), topic]))
                : tags;
            // ⚠️ 不确定因素：当前按“topic 文本 === question.tags 文本”做直接匹配；
            // 若后续存在别名/标准化字典，需在此处或后端统一映射规则。
            return questionService.getQuestions({
                ...rest,
                tags: mergedTags,
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
