import { api } from './api';
import type { BindChildPayload, ChildInfo } from '@/types/parent';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { Question } from '@/types';

export const parentService = {
  // 发送绑定验证码
  sendBindSms: (phone: string) => 
    api.post<ApiResponse<void>>('/auth/send-code', { phone, type: 'bind_child' }),
    
  // 绑定孩子
  bindChild: (data: BindChildPayload) =>
    api.post<ApiResponse<ChildInfo>>('/parent/bind', data),
    
  // 获取已绑定孩子列表
  getChildren: () =>
    api.get<ApiResponse<ChildInfo[]>>('/parent/children'),
    
  // 解绑孩子
  unbindChild: (childId: string) =>
    api.post<ApiResponse<void>>('/parent/unbind', { childId }),
    
  // 获取孩子提问列表
  getChildQuestions: async (childId: string, params?: any) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Question>>>(`/parent/questions/${childId}`, { params });
    const rawList = Array.isArray(response.data?.data?.list) ? response.data.data.list : [];

    // 修改原因：家长问题列表接口历史上返回的是扁平计数字段（likes/favorites/comments/answers），
    // QuestionCard 渲染依赖 stats/likeCount/collectionCount；这里做最小映射，避免卡片统计显示为 0。
    const normalizedList: Question[] = rawList.map((raw) => {
      const item = raw as Question & {
        likes?: number;
        favorites?: number;
        comments?: number;
        answers?: number;
        isLiked?: boolean | null;
        isFavorited?: boolean | null;
      };

      const likes =
        typeof item.stats?.likes === 'number'
          ? item.stats.likes
          : typeof item.likes === 'number'
            ? item.likes
            : typeof item.likeCount === 'number'
              ? item.likeCount
              : 0;
      const favorites =
        typeof item.stats?.favorites === 'number'
          ? item.stats.favorites
          : typeof item.favorites === 'number'
            ? item.favorites
            : typeof item.collectionCount === 'number'
              ? item.collectionCount
              : 0;
      const comments =
        typeof item.stats?.comments === 'number'
          ? item.stats.comments
          : typeof item.comments === 'number'
            ? item.comments
            : 0;
      const answers =
        typeof item.stats?.answers === 'number'
          ? item.stats.answers
          : typeof item.answers === 'number'
            ? item.answers
            : 0;

      return {
        ...item,
        likes,
        favorites,
        comments,
        answers,
        stats: {
          likes,
          favorites,
          comments,
          answers,
          views: item.stats?.views
        },
        likeCount: likes,
        collectionCount: favorites,
        answerCount: answers,
        // ⚠️ 不确定因素：若旧后端未返回互动状态字段，则默认 false（空心）以保证兼容。
        isLiked: !!item.isLiked,
        isFavorited: !!item.isFavorited
      };
    });

    response.data.data.list = normalizedList;
    return response;
  },

  downloadQuestionsPdf: (
    questionIds: string[],
    fileName?: string
  ) =>
    // 修改原因：新增最小 API 封装，避免页面直写二进制请求细节。
    api.post('/print/questions/pdf', {
      questionIds,
      fileName
    }, {
      responseType: 'blob'
    }),
};
