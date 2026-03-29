/**
 * [POS] src/services/notification.service.ts
 *   所属：services 层 | 角色：消息通知 + 题目维度配置读取
 *   兄弟：http.ts（依赖）/ admin.service.ts（维度写操作在此）
 *
 * [INPUT]
 *   - ./http       → api
 *   - @/types/api  → ApiResponse / Notification / QuestionDimensionDto
 *
 * [OUTPUT]
 *   - notificationService → getNotifications / markAsRead / getUnreadCount
 *   - configService       → getQuestionDimensions（只读，写操作在 adminService）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化）
 *   2. src/services/CLAUDE.md 的文件清单
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
