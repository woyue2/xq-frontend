/**
 * [POS] src/services/interaction.service.ts
 *   所属：services 层 | 角色：用户互动 + 行为埋点
 *   兄弟：http.ts（依赖）/ question.service.ts（同问题域）
 *
 * [INPUT]
 *   - ./http       → api
 *   - @/types/api  → ApiResponse / LikePayload / LikeResponse / FavoritePayload / FavoriteResponse
 *
 * [OUTPUT]
 *   - interactionService → like / favorite
 *   - behaviorService    → log / batchLog
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化）
 *   2. src/services/CLAUDE.md 的文件清单
 */
import { api } from './http';
import type {
    ApiResponse,
    LikePayload,
    LikeResponse,
    FavoritePayload,
    FavoriteResponse,
} from '@/types/api';

export const interactionService = {
    like: async (payload: LikePayload) => {
        if (payload.targetType !== 'question') {
            throw new Error('Only question like is supported in current implementation');
        }
        const { targetId, action } = payload;
        const { data } = await api.post<ApiResponse<LikeResponse>>('/interactions/like', {
            targetType: 'question',
            targetId,
            action,
        });
        return data.data;
    },
    favorite: async (payload: FavoritePayload) => {
        if (payload.targetType !== 'question') {
            throw new Error('Only question favorite is supported in current implementation');
        }
        const { targetId, action } = payload;
        const { data } = await api.post<ApiResponse<FavoriteResponse>>('/interactions/favorite', {
            targetType: 'question',
            targetId,
            action,
        });
        return data.data;
    },
};

export const behaviorService = {
    log: async (type: string, metadata?: Record<string, unknown>) => {
        const { data } = await api.post<ApiResponse<{ logId: string }>>('/behavior/log', {
            type,
            timestamp: Date.now(),
            metadata,
        });
        return data.data;
    },
    batchLog: async (events: Array<{ type: string; timestamp: number; metadata?: Record<string, unknown> }>) => {
        let processed = 0;
        let failed = 0;
        for (const event of events) {
            try {
                await api.post<ApiResponse<unknown>>('/behavior/log', {
                    type: event.type,
                    timestamp: event.timestamp,
                    metadata: event.metadata,
                });
                processed += 1;
            } catch {
                failed += 1;
            }
        }
        return { received: events.length, processed, failed };
    },
};
