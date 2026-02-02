import axios from 'axios';
import { toast } from 'sonner';
import { mockQuestions, mockUsers, mockAnswers, mockChildren } from '@/lib/mock-data';
import { compressImage } from '@/lib/image-compress';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  ApiResponse,
  PaginatedResponse,
  LoginPayload,
  LoginResponse,
  SendCodePayload,
  CreateQuestionPayload,
  QuestionListParams,
  LikePayload,
  LikeResponse,
  FavoritePayload,
  FavoriteResponse,
  Notification,
  WhitelistUser,
  WhitelistParams,
  AddWhitelistPayload
} from '@/types/api';
import type { Question, User, SubjectType, DifficultyLevel, AuditStatus, Answer } from '@/types';

// Configuration
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// Create Axios instance
export const api = axios.create({
    baseURL: API_BASE,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Token Injection + Headers
api.interceptors.request.use((config) => {
    // 1) 首选：直接从 Zustand Store 取
    const { token } = useAuthStore.getState();
    let authToken: string | null = token ?? null;

    // 2) 兜底：独立的 token 键
    if (!authToken) {
        try {
            authToken = localStorage.getItem('token');
        } catch {
            authToken = null;
        }
    }

    // 3) 兜底：从 auth-storage 持久化状态中恢复
    if (!authToken) {
        try {
            const raw = localStorage.getItem('auth-storage');
            if (raw) {
                const parsed = JSON.parse(raw);
                authToken = parsed?.state?.token ?? null;
            }
        } catch {
            authToken = null;
        }
    }

    if (!config.headers) {
        config.headers = {};
    }

    if (authToken) {
        (config.headers as any).Authorization = `Bearer ${authToken}`;
    }

    // Add Request ID for tracing
    (config.headers as any)['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    // Add Client Version
    (config.headers as any)['X-Client-Version'] = import.meta.env.VITE_APP_VERSION || '1.0.0';

    return config;
});

// Mock Interceptor (Development Only)
if (USE_MOCK) {
    api.interceptors.request.use(async (config) => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const mockAdapter = (data: any) => async () => ({
            data: { code: 200, message: 'success', data },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
        });

        const url = config.url || '';
        const method = config.method?.toLowerCase();

        // --- Auth Mocks ---
        if (url.includes('/auth/send-code') && method === 'post') {
            config.adapter = mockAdapter(null);
        }
        else if (url.includes('/auth/login') && method === 'post') {
            const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            const { phone } = payload;

            // Find user by phone, default to first user if not found or no phone provided
            const user = mockUsers.find(u => u.phone === phone) || mockUsers[0];

            config.adapter = mockAdapter({
                token: 'mock-jwt-token-' + Date.now(),
                user
            });
        }

        // --- Parent Mocks ---
        if (url.includes('/parent/bind') && method === 'post') {
            const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            const { childName, phone, school } = payload;

            // Mock validation
            if (!childName || !phone) {
                throw { response: { status: 400, data: { message: '信息不完整' } } };
            }

            // Create mock child
            const newChild = {
                id: 'child_' + Date.now(),
                name: childName,
                grade: '三年级', // Mock default
                age: 9, // Mock default
                school: school || '实验小学',
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${childName}`,
                boundAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString(),
                parentId: '3' // Default to mock parent
            };

            // Save to localStorage
            const stored = localStorage.getItem('parent_children');
            const children = stored ? JSON.parse(stored) : [...mockChildren]; // Initialize with mockChildren if empty
            children.push(newChild);
            localStorage.setItem('parent_children', JSON.stringify(children));

            config.adapter = mockAdapter(newChild);
        }
        else if (url.includes('/parent/children') && method === 'get') {
            const stored = localStorage.getItem('parent_children');
            // If local storage is empty, return mockChildren and save them to local storage for persistence
            let children = stored ? JSON.parse(stored) : null;

            if (!children) {
                children = [...mockChildren];
                localStorage.setItem('parent_children', JSON.stringify(children));
            }

            config.adapter = mockAdapter(children);
        }
        else if (url.includes('/parent/unbind') && method === 'post') {
            const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            const { childId } = payload;

            const stored = localStorage.getItem('parent_children');
            let children = stored ? JSON.parse(stored) : [];
            children = children.filter((c: any) => c.id !== childId);
            localStorage.setItem('parent_children', JSON.stringify(children));

            config.adapter = mockAdapter(null);
        }
        else if (url.includes('/parent/questions') && method === 'get') {
            // Parent view for child questions uses PaginatedResponse<Question> 结构。
            const params = config.params || {};

            let filtered = [...mockQuestions];
            if (params.subject) filtered = filtered.filter(q => q.subject === params.subject);
            if (params.topic) filtered = filtered.filter(q => q.topics?.includes(params.topic));

            const page = Number(params.page) || 1;
            const limit = Number(params.limit) || 10;
            const start = (page - 1) * limit;
            const end = start + limit;
            const items = filtered.slice(start, end);

            config.adapter = mockAdapter({
                items,
                total: filtered.length,
                page,
                totalPages: Math.ceil(filtered.length / limit)
            });
        }
        else if (url.match(/\/parent\/questions\/[^/]+$/) && method === 'get') {
            // /parent/questions/:childId 也复用 PaginatedResponse<Question> 结构
            const params = config.params || {};

            let filtered = [...mockQuestions];
            if (params.subject) filtered = filtered.filter(q => q.subject === params.subject);
            if (params.topic) filtered = filtered.filter(q => q.topics?.includes(params.topic));

            const page = Number(params.page) || 1;
            const limit = Number(params.limit) || 10;
            const start = (page - 1) * limit;
            const end = start + limit;
            const items = filtered.slice(start, end);

            config.adapter = mockAdapter({
                items,
                total: filtered.length,
                page,
                totalPages: Math.ceil(filtered.length / limit)
            });
        }

        // --- Question Mocks ---
        else if (url.match(/\/questions\/[^/]+$/) && method === 'get') {
            const id = url.split('/').pop();
            // console.log('[Mock API] Get Question:', url, id);
            const question = mockQuestions.find(q => q.id === id);
            if (question) {
                config.adapter = mockAdapter(question);
            } else {
                // console.log('[Mock API] Question not found for id:', id);
            }
        }
        else if (url.includes('/questions') && method === 'get' && !url.includes('upload')) {
            // 问题列表在真实后端返回 { list, pagination }，
            // 此处在 Mock 模式下对齐同样的数据结构，便于前端 QuestionService 统一处理。
            const params = config.params || {};
            const page = Number(params.page) || 1;
            const limit = Number(params.limit) || 10;

            let filtered = [...mockQuestions];
            if (params.subject) filtered = filtered.filter(q => q.subject === params.subject);
            if (params.topic) filtered = filtered.filter(q => q.topics?.includes(params.topic));

            const start = (page - 1) * limit;
            const end = start + limit;
            const items = filtered.slice(start, end);

            config.adapter = mockAdapter({
                list: items,
                pagination: {
                    page,
                    pageSize: limit,
                    total: filtered.length,
                    totalPages: Math.ceil(filtered.length / limit)
                }
            });
        }
        else if (url.endsWith('/questions') && method === 'post') {
            const newQuestion = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            const question = {
                ...newQuestion,
                id: 'q_' + Date.now(),
                createdAt: new Date().toISOString(),
                status: 'pending',
                stats: { likes: 0, comments: 0, favorites: 0 }
            };
            config.adapter = mockAdapter(question);
        }

        // --- Interaction Mocks ---
        else if (url.includes('/questions/') && url.endsWith('/like') && method === 'post') {
            const match = url.match(/\/questions\/([^/]+)\/like/);
            const questionId = match?.[1] ?? 'q1';
            config.adapter = mockAdapter({
                questionId,
                isLiked: true,
                likes: 43
            });
        }
        else if (url.includes('/questions/') && url.endsWith('/favorite') && method === 'post') {
            const match = url.match(/\/questions\/([^/]+)\/favorite/);
            const questionId = match?.[1] ?? 'q1';
            config.adapter = mockAdapter({
                questionId,
                isFavorited: true,
                favorites: 10
            });
        }
        // 新版交互接口 /interactions/like|favorite 在测试环境下也需要走 Mock，避免依赖真实后端。
        else if (url.includes('/interactions/like') && method === 'post') {
            const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            const targetId = payload?.targetId ?? 'q1';
            config.adapter = mockAdapter({
                liked: payload?.action !== 'unlike',
                likesCount: 1
            });
        }
        else if (url.includes('/interactions/favorite') && method === 'post') {
            const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            const favorited = payload?.action !== 'unfavorite';
            config.adapter = mockAdapter({
                favorited,
                favoritesCount: favorited ? 1 : 0
            });
        }
        else if (url.includes('/upload/signature') && method === 'get') {
            const now = Date.now();
            const key = `image/mock/${now}.jpg`;
            config.adapter = mockAdapter({
                uploadUrl: 'https://oss.mock.com/upload',
                key,
                policy: 'mock-policy',
                signature: 'mock-signature',
                expireAt: now + 5 * 60 * 1000
            });
        }
        else if (url.includes('/behavior/log') && method === 'post') {
            try {
                const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
                console.log('[Mock API] Behavior Logged:', payload);
            } catch (e) {
                console.log('[Mock API] Behavior Logged (Raw):', config.data);
            }
            config.adapter = mockAdapter(null);
        }

        return config;
    });
}

// Response Interceptor: Error Handling
api.interceptors.response.use(
    (response) => {
        // If it's a mock response or standard API response, check code
        if (response.data && typeof response.data.code === 'number') {
            const { code, message } = response.data;
            // 后端约定：200 = 成功，201 = 创建成功（如注册）
            if (code !== 200 && code !== 201) {
                toast.error(message || '请求失败');
                return Promise.reject(new Error(message || 'Request failed'));
            }
        }
        return response;
    },
    (error) => {
        const { status, data } = error.response || {};
        switch (status) {
            case 401:
                localStorage.removeItem('token');
                window.location.href = '/login';
                break;
            case 403:
                toast.error('无权限访问');
                break;
            case 429:
                toast.error('请求过于频繁，请稍后再试');
                break;
            case 500:
                toast.error('服务器繁忙，请稍后再试');
                break;
            default:
                toast.error(data?.message || '网络错误');
        }
        return Promise.reject(error);
    }
);

// --- Service Implementations ---

export const authService = {
    sendCode: async (payload: SendCodePayload) => {
        return api.post<ApiResponse<null>>('/auth/send-code', payload);
    },
    login: async (payload: LoginPayload) => {
        return api.post<ApiResponse<LoginResponse>>('/auth/login', payload);
    },
    register: async (payload: LoginPayload & { nickname?: string; role?: string; grade?: string; age?: number; school?: string }) => {
        const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/register', payload);
        return data.data;
    }
};

type BackendQuestionListItem = {
    id: string;
    title: string;
    content?: string | null;
    tags?: string[] | null;
    difficulty?: string | null;
    authorId: string;
    authorName: string;
    isGoodQuestion: boolean;
    isPinned: boolean;
    likes?: number | null;
    favorites?: number | null;
    comments?: number | null;
    answers?: number | null;
    status: string;
    createdAt: string;
    subject?: string | null;
};

type UploadImageContext = {
    /**
     * 功能用途：如 "提问" | "回答问题" | "评论" 等
     */
    purpose?: string;
    /**
     * 发送方（用户A），例如当前登录用户昵称
     */
    senderName?: string;
    /**
     * 接收方（用户B），例如问题作者 / 老师
     */
    receiverName?: string;
};

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
            pad(now.getSeconds())
        ].join('');

        const sanitize = (value: string | undefined, fallback: string) => {
            const raw = (value ?? fallback).trim();
            if (!raw) return fallback;
            // 允许中文、字母、数字、下划线和中划线，其余转为中划线
            return raw
                .replace(/\s+/g, '-') // 空白转为 -
                .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '-')
                .replace(/-+/g, '-');
        };

        const purpose = sanitize(ctx?.purpose, '图片');
        const sender = sanitize(ctx?.senderName, '用户A');
        const receiver = sanitize(ctx?.receiverName, '用户B');

        return `${purpose}-${sender}-${receiver}-${datePart}.jpg`;
    } catch {
        // 任何异常下退回 undefined，使用默认文件名
        return undefined;
    }
}

export const questionService = {
    getQuestions: async (params: QuestionListParams = {}) => {
        // 诊断用日志：观察前端实际传入的问题列表查询参数
        // eslint-disable-next-line no-console
        console.debug('[questionService.getQuestions] params', params);
        const { data } = await api.get<
          ApiResponse<{
            list: BackendQuestionListItem[];
            pagination: {
              page: number;
              pageSize: number;
              total: number;
              totalPages: number;
            };
          }>
        >('/questions', { params });

        const { list, pagination } = data.data;

        const items: Question[] = list.map((q) => {
            const likes = q.likes ?? 0;
            const favorites = q.favorites ?? 0;
            const comments = q.comments ?? 0;
            const answers = q.answers ?? 0;

            return {
                id: q.id,
                title: q.title,
                content: q.content ?? '',
                // 后端当前列表未返回 subject，尝试兜底为 'math'
                subject: (q.subject as SubjectType) ?? 'math',
                topics: [],
                methods: [],
                images: [],
                audioUrl: undefined,
                status: q.status as AuditStatus,
                isPinned: q.isPinned,
                isGoodQuestion: q.isGoodQuestion,
                difficulty: (q.difficulty as DifficultyLevel) ?? undefined,
                tags: q.tags ?? [],
                score: undefined,
                aiResult: undefined,
                rejectReason: undefined,
                stats: {
                    likes,
                    favorites,
                    comments,
                    answers,
                    views: undefined
                },
                answerCount: answers,
                viewCount: undefined,
                likeCount: likes,
                collectionCount: favorites,
                authorId: q.authorId,
                authorName: q.authorName,
                authorAvatar: undefined,
                createdAt: q.createdAt
            };
        });

        const paginated: PaginatedResponse<Question> = {
            items,
            total: pagination.total,
            page: pagination.page,
            totalPages: pagination.totalPages
        };

        // eslint-disable-next-line no-console
        console.debug(
          '[questionService.getQuestions] result',
          { page: paginated.page, total: paginated.total, items: paginated.items.length }
        );

        return paginated;
    },
    getQuestionById: async (id: string) => {
        const { data } = await api.get<ApiResponse<Question>>(`/questions/${id}`);
        return data.data;
    },
    createQuestion: async (payload: CreateQuestionPayload) => {
        // eslint-disable-next-line no-console
        console.debug('[questionService.createQuestion] payload', {
          title: payload.title,
          subject: payload.subject,
          tags: payload.tags
        });
        const { data } = await api.post<ApiResponse<Question>>('/questions', payload);
        // eslint-disable-next-line no-console
        console.debug('[questionService.createQuestion] response.status', data.code);
        return data.data;
    },
    uploadImage: async (file: File, context?: UploadImageContext) => {
        // 1. 前置：压缩图片并统一转为 JPG，控制在 1MB 以内
        const compressed = await compressImage(file, {
            maxWidth: 1600,
            maxHeight: 1600,
            maxSizeKB: 1024,
            initialQuality: 0.85,
            minQuality: 0.6,
        });

        // 基于业务上下文重命名文件，以便在图床或日志中更好识别
        let finalFile: File = compressed;
        const customName = buildUploadFileName(context);
        if (customName) {
            finalFile = new File([compressed], customName, { type: compressed.type });
        }

        // 2. 向后端请求上传签名
        const { data } = await api.get<
          ApiResponse<{
            uploadUrl: string;
            key: string;
            policy: string;
            signature: string;
            expireAt: number;
          }>
        >('/upload/signature', { params: { type: 'image' } });

        const { uploadUrl, key, policy, signature } = data.data;

        // 在 MOCK 模式下，仅基于签名构造稳定的图片 URL，避免真实网络请求
        if (USE_MOCK) {
            const base = uploadUrl.split('?')[0].replace(/\/upload$/, '');
            const imageUrl = `${base}/${key}`;
            return { imageUrl };
        }

        // 3. 使用表单直传到存储服务
        const formData = new FormData();
        formData.append('key', key);
        formData.append('policy', policy);
        formData.append('signature', signature);
        formData.append('file', finalFile);

        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('图片上传失败，请稍后重试');
        }

        // 4. 优先使用图床返回的真实 URL（兼容 ImgURL V3）
        let imageUrl: string | undefined;
        try {
            const json: any = await response.json();
            if (json && typeof json === 'object') {
                if (json.data && typeof json.data.url === 'string') {
                    imageUrl = json.data.url;
                } else if (typeof json.url === 'string') {
                    imageUrl = json.url;
                }
            }
        } catch {
            // 忽略 JSON 解析失败，走后备方案
        }

        // 5. 后备方案：按原有规则基于 uploadUrl + key 拼接
        if (!imageUrl) {
            const base = uploadUrl.split('?')[0].replace(/\/upload$/, '');
            imageUrl = `${base}/${key}`;
        }

        return { imageUrl };
    }
};

export const interactionService = {
    like: async (payload: LikePayload) => {
        if (payload.targetType !== 'question') {
            throw new Error('Only question like is supported in current implementation');
        }

        const { targetId, action } = payload;
        const { data } = await api.post<ApiResponse<LikeResponse>>('/interactions/like', {
            targetType: 'question',
            targetId,
            action
        });
        return data.data;
    },
    favorite: async (payload: FavoritePayload) => {
        const { questionId, action } = payload;
        const { data } = await api.post<ApiResponse<FavoriteResponse>>('/interactions/favorite', {
            questionId,
            action
        });
        return data.data;
    }
};

export const behaviorService = {
    log: async (type: string, metadata?: Record<string, any>) => {
        const { data } = await api.post<ApiResponse<{ logId: string }>>('/behavior/log', {
            type,
            timestamp: Date.now(),
            metadata
        });
        return data.data;
    },
    batchLog: async (events: Array<{ type: string; timestamp: number; metadata?: any }>) => {
        let processed = 0;
        let failed = 0;

        for (const event of events) {
            try {
                await api.post<ApiResponse<unknown>>('/behavior/log', {
                    type: event.type,
                    timestamp: event.timestamp,
                    metadata: event.metadata
                });
                processed += 1;
            } catch {
                failed += 1;
            }
        }

        return {
            received: events.length,
            processed,
            failed
        };
    }
};

export const notificationService = {
    getNotifications: async (params: { page?: number; limit?: number; unread?: boolean }) => {
        const { data } = await api.get<
          ApiResponse<{
            notifications: Notification[];
            unreadCount: number;
            total: number;
          }>
        >('/notifications', { params });
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
    }
};

export const adminService = {
    getWhitelist: async (params: WhitelistParams) => {
        const { data } = await api.get<ApiResponse<PaginatedResponse<WhitelistUser>>>('/admin/whitelist', { params });
        return data.data;
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
    }
};

export const answerService = {
    create: async (
        questionId: string,
        payload: { content?: string; images?: string[]; audioUrl?: string }
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
    }
};
