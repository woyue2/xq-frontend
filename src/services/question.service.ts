/**
 * question.service.ts — 问题 CRUD + 图片/音频上传
 *
 * 职责：questionService（含 uploadImage / uploadAudio）
 */
import { api } from './http';
import { compressImage } from '@/lib/image-compress';
import { USE_MOCK } from '@/lib/mock-env';
import type {
    ApiResponse,
    PaginatedResponse,
    CreateQuestionPayload,
    QuestionListParams,
} from '@/types/api';
import type { Question, SubjectType, DifficultyLevel, AuditStatus } from '@/types';

// ─── Internal Types ──────────────────────────────────────────────────────────
type BackendQuestionListItem = {
    id: string;
    title: string;
    content?: string | null;
    images?: string[] | null;
    tags?: string[] | null;
    difficulty?: string | null;
    authorId: string;
    authorName: string;
    authorAvatar?: string | null;
    isGoodQuestion: boolean;
    isPinned: boolean;
    likes?: number | null;
    favorites?: number | null;
    comments?: number | null;
    answers?: number | null;
    status: string;
    createdAt: string;
    subject?: string | null;
    understoodCount?: number | null;
    notUnderstoodCount?: number | null;
    understandingStatus?: 'understood' | 'not_understood' | null;
};

type UploadImageContext = {
    /** 功能用途：如 "提问" | "回答问题" | "评论" 等 */
    purpose?: string;
    /** 发送方，例如当前登录用户昵称 */
    senderName?: string;
    /** 接收方，例如问题作者 / 老师 */
    receiverName?: string;
};

// ─── Helpers（领域工具）──────────────────────────────────────────────────────
function buildUploadFileName(ctx?: UploadImageContext): string | undefined {
    try {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const datePart = [
            now.getFullYear(),
            pad(now.getMonth() + 1),
            pad(now.getDate()),
            pad(now.getHours()),
            pad(now.getMinutes()),
            pad(now.getSeconds()),
        ].join('');

        const sanitize = (value: string | undefined, fallback: string) => {
            const raw = (value ?? fallback).trim();
            if (!raw) return fallback;
            return raw
                .replace(/\s+/g, '-')
                .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '-')
                .replace(/-+/g, '-');
        };

        const purpose  = sanitize(ctx?.purpose, '图片');
        const sender   = sanitize(ctx?.senderName, '用户A');
        const receiver = sanitize(ctx?.receiverName, '用户B');
        return `${purpose}-${sender}-${receiver}-${datePart}.jpg`;
    } catch {
        return undefined;
    }
}

function normalizeListItem(q: BackendQuestionListItem): Question {
    const likes     = q.likes     ?? 0;
    const favorites = q.favorites ?? 0;
    const comments  = q.comments  ?? 0;
    const answers   = q.answers   ?? 0;

    return {
        id: q.id,
        title: q.title,
        content: q.content ?? '',
        subject: (q.subject as SubjectType) ?? 'math',
        tags: q.tags ?? [],
        topics: [],
        images: q.images ?? [],
        audioUrl: undefined,
        status: q.status as AuditStatus,
        isPinned: q.isPinned,
        isGoodQuestion: q.isGoodQuestion,
        difficulty: (q.difficulty as DifficultyLevel) ?? undefined,
        score: undefined,
        aiResult: undefined,
        understoodCount: typeof q.understoodCount === 'number' ? q.understoodCount : undefined,
        notUnderstoodCount: typeof q.notUnderstoodCount === 'number' ? q.notUnderstoodCount : undefined,
        understandingStatus: q.understandingStatus ?? null,
        likes,
        favorites,
        comments,
        answers,
        stats: { likes, favorites, comments, answers, views: undefined },
        answerCount: answers,
        viewCount: undefined,
        likeCount: likes,
        collectionCount: favorites,
        authorId: q.authorId,
        authorName: q.authorName,
        authorAvatar: q.authorAvatar ?? undefined,
        authorRole: undefined,
        createdAt: q.createdAt,
        isLiked: false,
        isFavorited: false,
    };
}

/** 解析图片上传目标 URL 和 Auth Header（消除 uploadImage 内嵌的 URL 解析逻辑）*/
function resolveUploadTarget(uploadUrl: string): { targetUrl: string; authHeader?: string } {
    try {
        const parsed = new URL(uploadUrl);
        const targetUrl = `${parsed.origin}${parsed.pathname}`;
        const tokenFromQuery = parsed.searchParams.get('token');
        if (!tokenFromQuery) return { targetUrl };
        const authHeader = tokenFromQuery.toLowerCase().startsWith('bearer ')
            ? tokenFromQuery
            : `Bearer ${tokenFromQuery}`;
        return { targetUrl, authHeader };
    } catch {
        return { targetUrl: uploadUrl };
    }
}

/** 从上传响应 JSON 中提取图片 URL（递归兜底）*/
function parseImageUrlFromResponse(json: Record<string, unknown>): string | undefined {
    if (json.data && typeof (json.data as any).url === 'string') return (json.data as any).url;
    if (typeof json.url === 'string') return json.url;

    const collectFirstUrl = (value: unknown): string | undefined => {
        if (!value) return undefined;
        if (typeof value === 'string') {
            const str = value.trim();
            return /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(str) ? str : undefined;
        }
        if (Array.isArray(value)) {
            for (const item of value) { const found = collectFirstUrl(item); if (found) return found; }
        }
        if (typeof value === 'object') {
            for (const k of Object.keys(value as object)) {
                const found = collectFirstUrl((value as Record<string, unknown>)[k]);
                if (found) return found;
            }
        }
        return undefined;
    };
    return collectFirstUrl(json);
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const questionService = {
    getQuestions: async (params: QuestionListParams = {}): Promise<PaginatedResponse<Question>> => {
        const backendParams: Record<string, string | number | boolean | undefined> = {};
        if (params.page !== undefined)           backendParams.page = params.page;
        if (params.pageSize !== undefined)       backendParams.pageSize = params.pageSize;
        if (params.subject !== undefined)        backendParams.subject = params.subject;
        if (params.status !== undefined)         backendParams.status = params.status;
        if (params.isGoodQuestion !== undefined) backendParams.isGoodQuestion = params.isGoodQuestion;
        if (params.tags !== undefined)           backendParams.tags = params.tags.join(',');
        if (params.search !== undefined)         backendParams.search = params.search;
        if (params.authorId !== undefined)       backendParams.authorId = params.authorId;

        const { data } = await api.get<
            ApiResponse<{
                list: BackendQuestionListItem[];
                pagination: { page: number; pageSize: number; total: number; totalPages: number };
            }>
        >('/questions', { params: backendParams });

        const { list, pagination } = data.data;
        return {
            items: list.map(normalizeListItem),
            total: pagination.total,
            page: pagination.page,
            totalPages: pagination.totalPages,
        };
    },

    getQuestionById: async (id: string) => {
        const { data } = await api.get<ApiResponse<Question>>(`/questions/${id}`);
        return data.data;
    },

    createQuestion: async (payload: CreateQuestionPayload) => {
        const { data } = await api.post<ApiResponse<Question>>('/questions', payload);
        return data.data;
    },

    setUnderstandingStatus: async (questionId: string, status: 'understood' | 'not_understood') => {
        const { data } = await api.post<
            ApiResponse<{
                questionId: string;
                status: 'understood' | 'not_understood';
                understoodCount: number;
                notUnderstoodCount: number;
            }>
        >(`/questions/${questionId}/understanding`, { status });
        return data.data;
    },

    delete: async (id: string) => {
        const { data } = await api.delete<ApiResponse<void>>(`/questions/${id}`);
        return data.data;
    },

    uploadAudio: async (blob: Blob) => {
        const file = blob instanceof File
            ? blob
            : new File([blob], `answer-audio-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });

        const formData = new FormData();
        formData.append('file', file);

        const { data } = await api.post<ApiResponse<{ audioUrl: string }>>('/upload/audio', formData);
        const audioUrl = data.data?.audioUrl ?? undefined;
        if (!audioUrl) throw new Error('音频上传失败，请稍后重试');
        return { audioUrl };
    },

    /**
     * 上传图片
     * 流程：压缩 → 获取签名 → 直传图床 → 解析返回 URL
     */
    uploadImage: async (file: File, context?: UploadImageContext) => {
        // 1. 压缩
        const compressed = await compressImage(file, {
            maxWidth: 1600, maxHeight: 1600, maxSizeKB: 1024,
            initialQuality: 0.85, minQuality: 0.6,
        });

        // 2. 构造自定义文件名（可选）
        const customName = buildUploadFileName(context);
        const finalFile = customName
            ? new File([compressed], customName, { type: compressed.type })
            : compressed;

        // 3. 获取上传签名
        const { data } = await api.get<
            ApiResponse<{ uploadUrl: string; key: string; policy: string; signature: string; expireAt: number }>
        >('/upload/signature', { params: { type: 'image' } });

        const { uploadUrl, key } = data.data;

        // 4. Mock 模式直接返回
        if (USE_MOCK) {
            const base = uploadUrl.split('?')[0].replace(/\/upload$/, '');
            return { imageUrl: `${base}/${key}` };
        }

        // 5. 直传图床
        const { targetUrl, authHeader } = resolveUploadTarget(uploadUrl);
        const formData = new FormData();
        formData.append('file', finalFile);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: authHeader ? { Authorization: authHeader } : undefined,
            body: formData,
        });

        if (!response.ok) throw new Error('图片上传失败，请稍后重试');

        // 6. 解析返回 URL
        let imageUrl: string | undefined;
        try {
            const json: Record<string, unknown> = await response.json();
            imageUrl = parseImageUrlFromResponse(json);
        } catch {
            // 忽略 JSON 解析失败
        }

        if (!imageUrl) throw new Error('图床未返回图片 URL，请联系管理员检查配置');
        return { imageUrl };
    },
};
