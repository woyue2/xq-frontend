/**
 * notification.service.ts — 通知 & 应用配置
 *
 * 职责：notificationService + configService
 */
import { api } from './http';
import type {
    ApiResponse,
    Notification,
    QuestionDimensionDto,
} from '@/types/api';

export const notificationService = {
    getNotifications: async (params: { page?: number; limit?: number; unread?: boolean }) => {
        // 将 boolean 类型的 unread 转换为后端期望的字符串格式
        const queryParams: Record<string, string | number | undefined> = { ...params as any };
        if (typeof (params as any).unread === 'boolean') {
            queryParams.unread = (params as any).unread ? 'true' : 'false';
        }
        const { data } = await api.get<
            ApiResponse<{
                notifications: Notification[];
                unreadCount: number;
                total: number;
            }>
        >('/notifications', { params: queryParams });
        return data.data;
    },
    markAsRead: async (ids: string[]) => {
        const { data } = await api.post<ApiResponse<{ success: boolean; updatedCount: number }>>(
            '/notifications/read',
            { ids }
        );
        return data.data;
    },
    getUnreadCount: async () => {
        const { data } = await api.get<ApiResponse<{ unreadCount: number }>>(
            '/notifications/unread-count'
        );
        return data.data;
    },
};

export const configService = {
    getQuestionDimensions: async (): Promise<QuestionDimensionDto[]> => {
        const { data } = await api.get<ApiResponse<{ dimensions: QuestionDimensionDto[] }>>(
            '/config/question-dimensions'
        );
        return data.data.dimensions;
    },
};
