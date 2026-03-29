/**
 * admin.service.ts — 管理员 + 审核 + 答案 + 评论 + 个人中心 + 课时
 *
 * 职责：
 *   adminService   — 白名单管理、题目维度管理
 *   auditService   — 待审内容查询 + 审核操作
 *   answerService  — 答案 CRUD
 *   commentService — 评论 CRUD
 *   profileService — 我的点赞/收藏/答题历史
 *   classHoursService — 课时批量操作
 */
import { api } from './http';
import type {
    ApiResponse,
    PaginatedResponse,
    WhitelistUser,
    WhitelistParams,
    AddWhitelistPayload,
    MyLikedQuestion,
    MyFavoritedQuestion,
    MyAnswerSummary,
    QuestionDimensionDto,
    QuestionDimensionOptionDto,
    BatchUpdateClassHoursResponse,
    PendingQuestion,
    PendingComment,
    AuditStatistics,
    ApproveQuestionResponse,
    RejectQuestionResponse,
    ApproveCommentResponse,
    BanCommentResponse,
    TogglePinQuestionResponse,
} from '@/types/api';
import type { Answer, Comment } from '@/types';

// ─── Admin: 白名单 + 题目维度 ────────────────────────────────────────────────
export const adminService = {
    getWhitelist: async (params: WhitelistParams) => {
        const { data } = await api.get<ApiResponse<any>>('/admin/whitelist', { params });
        const { list, pagination } = data.data || {};
        if (!list || !pagination) throw new Error('白名单数据格式异常');
        return {
            items: list,
            total: pagination.total,
            page: pagination.page,
            totalPages: pagination.totalPages,
        };
    },
    addToWhitelist: async (payload: AddWhitelistPayload) => {
        const { data } = await api.post<ApiResponse<WhitelistUser>>('/admin/whitelist', payload);
        return data.data;
    },
    removeFromWhitelist: async (id: string) => {
        const { data } = await api.delete<ApiResponse<null>>(`/admin/whitelist/${id}`);
        return data.data;
    },
    updateValidity: async (id: string, validUntil: string) => {
        const { data } = await api.patch<ApiResponse<WhitelistUser>>(`/admin/whitelist/${id}`, { validUntil });
        return data.data;
    },
    getQuestionDimensions: async (): Promise<QuestionDimensionDto[]> => {
        const { data } = await api.get<ApiResponse<{ dimensions: QuestionDimensionDto[] }>>(
            '/admin/question-dimensions'
        );
        return data.data.dimensions;
    },
    updateQuestionDimension: async (
        key: string,
        payload: { name?: string; enabled?: boolean; multiSelect?: boolean }
    ) => {
        const { data } = await api.put<ApiResponse<QuestionDimensionDto>>(
            `/admin/question-dimensions/${encodeURIComponent(key)}`,
            payload
        );
        return data.data;
    },
    createQuestionDimensionOption: async (
        key: string,
        payload: Pick<QuestionDimensionOptionDto, 'value' | 'label'> & { order?: number; enabled?: boolean }
    ) => {
        const { data } = await api.post<ApiResponse<QuestionDimensionOptionDto>>(
            `/admin/question-dimensions/${encodeURIComponent(key)}/options`,
            payload
        );
        return data.data;
    },
    updateQuestionDimensionOption: async (
        key: string,
        optionId: string,
        payload: { label?: string; order?: number; enabled?: boolean }
    ) => {
        const { data } = await api.put<ApiResponse<QuestionDimensionOptionDto>>(
            `/admin/question-dimensions/${encodeURIComponent(key)}/options/${encodeURIComponent(optionId)}`,
            payload
        );
        return data.data;
    },
};

// ─── Audit: 审核 ─────────────────────────────────────────────────────────────
export const auditService = {
    getPendingQuestions: async (params?: { page?: number; pageSize?: number }) => {
        const { data } = await api.get<
            ApiResponse<{
                type: 'question';
                list: PendingQuestion[];
                pagination: { page: number; pageSize: number; total: number; totalPages: number };
                statistics: AuditStatistics;
            }>
        >('/admin/audit/pending', { params: { ...(params || {}), type: 'question' } });
        return data.data;
    },
    getPendingComments: async (params?: { page?: number; pageSize?: number }) => {
        const { data } = await api.get<
            ApiResponse<{
                type: 'comment';
                list: PendingComment[];
                pagination?: { page: number; pageSize: number; total: number; totalPages: number };
            }>
        >('/admin/audit/pending', { params: { ...(params || {}), type: 'comment' } });
        return data.data;
    },
    approveQuestion: async (
        contentId: string,
        payload: { isGoodQuestion?: boolean; score?: number; tags?: string[]; difficulty?: string }
    ): Promise<ApproveQuestionResponse> => {
        const { data } = await api.post<ApiResponse<ApproveQuestionResponse>>(
            `/admin/audit/${encodeURIComponent(contentId)}/approve`,
            { type: 'question', ...payload }
        );
        return data.data;
    },
    rejectQuestion: async (contentId: string, reason: string): Promise<RejectQuestionResponse> => {
        const { data } = await api.post<ApiResponse<RejectQuestionResponse>>(
            `/admin/audit/${encodeURIComponent(contentId)}/reject`,
            { type: 'question', reason }
        );
        return data.data;
    },
    approveComment: async (contentId: string): Promise<ApproveCommentResponse> => {
        const { data } = await api.post<ApiResponse<ApproveCommentResponse>>(
            `/admin/audit/${encodeURIComponent(contentId)}/approve`,
            { type: 'comment' }
        );
        return data.data;
    },
    banComment: async (contentId: string, reason: string): Promise<BanCommentResponse> => {
        const { data } = await api.post<ApiResponse<BanCommentResponse>>(
            `/admin/audit/${encodeURIComponent(contentId)}/ban`,
            { type: 'comment', reason }
        );
        return data.data;
    },
    togglePinQuestion: async (questionId: string): Promise<TogglePinQuestionResponse> => {
        const { data } = await api.post<ApiResponse<TogglePinQuestionResponse>>(
            `/admin/audit/questions/${encodeURIComponent(questionId)}/pin`
        );
        return data.data;
    },
};

// ─── Answer & Comment ─────────────────────────────────────────────────────────
export const answerService = {
    create: async (
        questionId: string,
        payload: { content?: string; images?: string[]; audioUrl?: string; audioUrls?: string[] }
    ) => {
        const { data } = await api.post<ApiResponse<Answer>>(
            `/questions/${questionId}/answers`,
            payload
        );
        return data.data;
    },
    listByQuestion: async (questionId: string) => {
        const { data } = await api.get<ApiResponse<{ list: Answer[]; total: number }>>(
            `/questions/${questionId}/answers`
        );
        return data.data;
    },
};

export const commentService = {
    create: async (questionId: string, payload: { content?: string; image?: string }) => {
        const { data } = await api.post<ApiResponse<Comment>>(
            `/questions/${questionId}/comments`,
            payload
        );
        return data.data;
    },
    listByQuestion: async (questionId: string) => {
        const { data } = await api.get<ApiResponse<{ list: Comment[]; total: number }>>(
            `/questions/${questionId}/comments`
        );
        return data.data;
    },
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const profileService = {
    getMyLikes: async (params?: { page?: number; pageSize?: number }) => {
        const { data } = await api.get<
            ApiResponse<{
                list: MyLikedQuestion[];
                pagination: { page: number; pageSize: number; total: number; totalPages: number };
            }>
        >('/users/me/likes', { params });
        return data.data;
    },
    getMyFavorites: async (params?: { page?: number; pageSize?: number }) => {
        const { data } = await api.get<
            ApiResponse<{
                list: MyFavoritedQuestion[];
                pagination: { page: number; pageSize: number; total: number; totalPages: number };
            }>
        >('/users/me/favorites', { params });
        return data.data;
    },
    getMyAnswers: async (params?: { page?: number; pageSize?: number }) => {
        const { data } = await api.get<ApiResponse<PaginatedResponse<MyAnswerSummary>>>(
            '/profile/my-answers',
            { params }
        );
        return data.data;
    },
};

// ─── Class Hours ──────────────────────────────────────────────────────────────
export const classHoursService = {
    batchUpdate: async (
        userIds: string[],
        action: 'extend' | 'reduce',
        months: number
    ): Promise<BatchUpdateClassHoursResponse> => {
        const { data } = await api.patch<ApiResponse<BatchUpdateClassHoursResponse>>(
            '/admin/class-hours/batch-update',
            { userIds, action, months }
        );
        return data.data;
    },
};
