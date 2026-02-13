import axios from 'axios';
import { toast } from 'sonner';
import { mockQuestions, mockUsers, mockChildren, mockNotifications } from '@/lib/mock-data';
import { compressImage } from '@/lib/image-compress';
import { useAuthStore } from '@/stores/useAuthStore';
import { USE_MOCK } from '@/lib/mock-env';
import type {
    ApiResponse,
    PaginatedResponse,
    LoginPayload,
    LoginResponse,
    PasswordLoginPayload,
    SendCodePayload,
    SendCodeResponse,
    CreateQuestionPayload,
    CreateCommentPayload,
    CommentListResponse,
    QuestionListParams,
    MyQuestionStatusStats,
    LikePayload,
    LikeResponse,
    FavoritePayload,
    FavoriteResponse,
    Notification,
    MarkAsReadPayload,
    MarkAsReadResponse,
    WhitelistUser,
    WhitelistParams,
    WhitelistResponse,
    AddWhitelistPayload,
    MyLikedQuestion,
    MyFavoritedQuestion,
    MyAnswerSummary,
    UpdateProfilePayload,
    RegisterPayload,
    QuestionDimensionDto,
    QuestionDimensionOptionDto,
    UserClassHours,
    BatchUpdateClassHoursResult,
    BatchUpdateClassHoursResponse,
    // 审核管理相关类型
    PendingQuestion,
    PendingComment,
    PendingAnswer,
    AuditStatistics,
    ApproveQuestionResponse,
    RejectQuestionResponse,
    ApproveCommentResponse,
    ApproveAnswerResponse,
    RejectAnswerResponse,
    BanCommentResponse,
    TogglePinQuestionResponse,
    // 用户行为日志相关类型
    BehaviorLogParams,
    BehaviorLogResult,
    BehaviorBatchResult
} from '@/types/api';
import type { Question, User, SubjectType, DifficultyLevel, AuditStatus, Answer, Comment } from '@/types';

// Configuration
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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
        config.headers = {} as any;
    }

    if (authToken) {
        (config.headers as any).Authorization = `Bearer ${authToken}`;
    }

    // Add Request ID for tracing
    (config.headers as any)['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    // Add Client Version
    (config.headers as any)['X-Client-Version'] = import.meta.env.VITE_APP_VERSION || '1.0.0';
    // Add Client Mode (mock | normal) for backend structured logs
    (config.headers as any)['X-Client-Mode'] = USE_MOCK ? 'mock' : 'normal';

    return config;
});

// Mock 拦截器仅用于单元测试或特殊诊断场景。
// 运行真实应用（VITE_USE_MOCK=false）时不会启用。
if (USE_MOCK && import.meta.env.MODE === 'test') {
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
        else if (url.includes('/auth/password-login') && method === 'post') {
            const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            const { phone } = payload;
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
            if (params.tags) filtered = filtered.filter(q => q.tags?.some((tag: string) => params.tags?.includes(tag)));

            const page = Number(params.page) || 1;
            const pageSize = Number(params.pageSize) || Number(params.limit) || 10;
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            const items = filtered.slice(start, end);

            config.adapter = mockAdapter({
                list: items,
                pagination: {
                    page,
                    pageSize,
                    total: filtered.length,
                    totalPages: Math.ceil(filtered.length / pageSize)
                }
            });
        }
        else if (url.match(/\/parent\/questions\/[^/]+$/) && method === 'get') {
            // /parent/questions/:childId 也复用 PaginatedResponse<Question> 结构
            const params = config.params || {};

            let filtered = [...mockQuestions];
            if (params.subject) filtered = filtered.filter(q => q.subject === params.subject);
            if (params.tags) filtered = filtered.filter(q => q.tags?.some((tag: string) => params.tags?.includes(tag)));

            const page = Number(params.page) || 1;
            const pageSize = Number(params.pageSize) || Number(params.limit) || 10;
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            const items = filtered.slice(start, end);

            config.adapter = mockAdapter({
                list: items,
                pagination: {
                    page,
                    pageSize,
                    total: filtered.length,
                    totalPages: Math.ceil(filtered.length / pageSize)
                }
            });
        }

        // --- Notification Mocks ---
        else if (url.includes('/notifications') && method === 'get' && !url.includes('unread-count')) {
            // GET /notifications 列表接口
            const params = config.params || {};
            const page = Number(params.page) || 1;
            const pageSize = Number(params.pageSize) || Number(params.limit) || 20;

            let filtered = [...mockNotifications];
            if (params.unread === 'true' || params.unread === true) {
                filtered = filtered.filter(n => !n.isRead);
            }

            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            const items = filtered.slice(start, end);

            config.adapter = mockAdapter({
                list: items,
                pagination: {
                    page,
                    pageSize,
                    total: filtered.length,
                    totalPages: Math.ceil(filtered.length / pageSize)
                },
                unreadCount: filtered.filter(n => !n.isRead).length
            });
        }
        else if (url.match(/\/notifications\/[^/]+$/) && method === 'get') {
            // GET /notifications/:id 详情接口
            const id = url.split('/').pop();
            const notification = mockNotifications.find(n => n.id === id);
            if (notification) {
                config.adapter = mockAdapter(notification);
            }
        }
        else if (url.includes('/notifications/read-all') && method === 'post') {
            // POST /notifications/read-all 标记所有已读
            const unreadCount = mockNotifications.filter(n => !n.isRead).length;
            mockNotifications.forEach(n => {
                n.isRead = true;
                n.readAt = new Date().toISOString();
            });
            config.adapter = mockAdapter({
                success: true,
                updatedCount: unreadCount
            });
        }
        else if (url.includes('/notifications/') && url.match(/\/notifications\/[^/]+$/) && method === 'delete') {
            // DELETE /notifications/:id 删除通知
            const id = url.split('/').pop();
            const index = mockNotifications.findIndex(n => n.id === id);
            if (index !== -1) {
                mockNotifications.splice(index, 1);
            }
            config.adapter = mockAdapter({ success: true });
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
            const pageSize = Number(params.pageSize) || Number(params.limit) || 10;

            let filtered = [...mockQuestions];
            if (params.subject) filtered = filtered.filter(q => q.subject === params.subject);
            if (params.tags) filtered = filtered.filter(q => q.tags?.some((tag: string) => params.tags?.includes(tag)));

            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            const items = filtered.slice(start, end);

            config.adapter = mockAdapter({
                list: items,
                pagination: {
                    page,
                    pageSize,
                    total: filtered.length,
                    totalPages: Math.ceil(filtered.length / pageSize)
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
        else if (url.includes('/questions/') && url.endsWith('/understanding') && method === 'post') {
            const match = url.match(/\/questions\/([^/]+)\/understanding/);
            const questionId = match?.[1] ?? 'q1';
            const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            const status = payload?.status === 'understood' ? 'understood' : 'not_understood';
            config.adapter = mockAdapter({
                questionId,
                status,
                understoodCount: status === 'understood' ? 1 : 0,
                notUnderstoodCount: status === 'not_understood' ? 1 : 0
            });
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
            const type = (config.params && typeof config.params.type === 'string')
                ? config.params.type
                : 'image';
            const safeType = type === 'audio' ? 'audio' : 'image';
            const ext = safeType === 'audio' ? 'mp3' : 'jpg';
            const key = `${safeType}/mock/${now}.${ext}`;
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
        return api.post<ApiResponse<SendCodeResponse>>('/auth/send-code', payload);
    },
    login: async (payload: LoginPayload) => {
        return api.post<ApiResponse<LoginResponse>>('/auth/login', payload);
    },
    passwordLogin: async (payload: PasswordLoginPayload) => {
        return api.post<ApiResponse<LoginResponse>>('/auth/password-login', payload);
    },
    register: async (payload: RegisterPayload) => {
        const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/register', payload);
        return data.data;
    },
    setPassword: async (newPassword: string) => {
        return api.post<ApiResponse<null>>('/auth/set-password', { newPassword });
    }
};

export const userService = {
    getUserInfo: async () => {
        const { data: res } = await api.get<ApiResponse<User>>('/users/me');
        return res.data;
    },
    updateProfile: async (data: UpdateProfilePayload) => {
        const { data: res } = await api.patch<ApiResponse<User>>('/users/me', data);
        return res.data;
    }
};

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
        
        // 参数转换：将前端参数名转换为后端期望的参数名
        const backendParams: any = {};
        if (params.page !== undefined) backendParams.page = params.page;
        if (params.pageSize !== undefined) backendParams.pageSize = params.pageSize;
        if (params.subject !== undefined) backendParams.subject = params.subject;
        if (params.status !== undefined) backendParams.status = params.status;
        if (params.isGoodQuestion !== undefined) backendParams.isGoodQuestion = params.isGoodQuestion;
        if (params.tags !== undefined) backendParams.tags = params.tags.join(',');
        if (params.search !== undefined) backendParams.search = params.search;
        if (params.authorId !== undefined) backendParams.authorId = params.authorId;
        
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
        >('/questions', { params: backendParams });

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
                subject: (q.subject as SubjectType) ?? 'math',
                tags: q.tags ?? [],
                topics: [], // 列表接口不返回 topics，可从 tags 推导
                images: q.images ?? [],
                audioUrl: undefined,
                status: q.status as AuditStatus,
                isPinned: q.isPinned,
                isGoodQuestion: q.isGoodQuestion,
                difficulty: (q.difficulty as DifficultyLevel) ?? undefined,
                score: undefined, // 列表接口不返回 score
                aiResult: undefined, // 列表接口不返回 aiResult
                understoodCount: typeof q.understoodCount === 'number' ? q.understoodCount : undefined,
                notUnderstoodCount: typeof q.notUnderstoodCount === 'number' ? q.notUnderstoodCount : undefined,
                understandingStatus: q.understandingStatus ?? null,
                likes,
                favorites,
                comments,
                answers,
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
                authorAvatar: q.authorAvatar ?? undefined,
                authorRole: undefined,
                createdAt: q.createdAt,
                isLiked: false,
                isFavorited: false
            };
        });

        const paginated: PaginatedResponse<Question> = {
            list: items,
            pagination: {
                page: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                totalPages: pagination.totalPages
            }
        };

        // eslint-disable-next-line no-console
        console.debug(
            '[questionService.getQuestions] result',
            { page: paginated.pagination.page, total: paginated.pagination.total, items: paginated.list.length }
        );

        return paginated;
    },
    getMyStatusCounts: async () => {
        // 修改原因：提供“我的提问”独立统计口径，避免前端仅基于当前分页列表统计造成偏差。
        const { data } = await api.get<ApiResponse<MyQuestionStatusStats>>('/questions/my-status-counts');
        return data.data;
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
        // 真实环境下：音频直接上传到后端本地存储，由后端返回 /static/audio/... 可播放 URL
        const file = blob instanceof File
            ? blob
            : new File([blob], `answer-audio-${Date.now()}.webm`, {
                type: blob.type || 'audio/webm'
            });

        const formData = new FormData();
        formData.append('file', file);

        // 使用带有 Authorization 注入的 axios 实例，避免 401 问题
        const { data } = await api.post<
            ApiResponse<{
                audioUrl: string;
            }>
        >('/upload/audio', formData);

        const audioUrl =
            (data.data && typeof data.data.audioUrl === 'string'
                ? data.data.audioUrl
                : undefined) ?? undefined;

        if (!audioUrl) {
            throw new Error('音频上传失败，请稍后重试');
        }

        return { audioUrl };
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

        const { uploadUrl, key } = data.data;

        // 在 MOCK 模式下，仅基于签名构造稳定的图片 URL，避免真实网络请求
        if (USE_MOCK) {
            const base = uploadUrl.split('?')[0].replace(/\/upload$/, '');
            const imageUrl = `${base}/${key}`;
            return { imageUrl };
        }

        // 3. 使用表单直传到 ImgURL 图床（或兼容的直传服务）
        //    - 后端通过 OSS_UPLOAD_BASE_URL 提供 uploadUrl（可能附带 ?token=sk-xxx）
        //    - 这里解析出基础地址与 token，并按官方文档使用 Authorization 头上传
        let targetUrl = uploadUrl;
        let authHeader: string | undefined;
        try {
            const parsed = new URL(uploadUrl);
            targetUrl = `${parsed.origin}${parsed.pathname}`;
            const tokenFromQuery = parsed.searchParams.get('token');
            if (tokenFromQuery) {
                authHeader = tokenFromQuery.toLowerCase().startsWith('bearer ')
                    ? tokenFromQuery
                    : `Bearer ${tokenFromQuery}`;
            }
        } catch {
            // 如果 URL 解析失败，则直接使用原始 uploadUrl，并不附加 Authorization 头
        }

        const formData = new FormData();
        formData.append('file', finalFile);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: authHeader ? { Authorization: authHeader } : undefined,
            body: formData,
        });

        if (!response.ok) {
            throw new Error('图片上传失败，请稍后重试');
        }

        // 4. 优先使用图床返回的真实 URL（兼容多种字段与结构）
        let imageUrl: string | undefined;
        try {
            const json: any = await response.json();
            if (json && typeof json === 'object') {
                // 常见字段约定：data.url 或顶层 url
                if (json.data && typeof json.data.url === 'string') {
                    imageUrl = json.data.url;
                } else if (typeof json.url === 'string') {
                    imageUrl = json.url;
                } else {
                    // 兼容 ImgURL 等第三方：在响应体中递归查找第一个看起来像图片地址的字段
                    const collectFirstUrl = (value: any): string | undefined => {
                        if (!value) return undefined;
                        if (typeof value === 'string') {
                            const str = value.trim();
                            if (/^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(str)) {
                                return str;
                            }
                            return undefined;
                        }
                        if (Array.isArray(value)) {
                            for (const item of value) {
                                const found = collectFirstUrl(item);
                                if (found) return found;
                            }
                            return undefined;
                        }
                        if (typeof value === 'object') {
                            for (const key of Object.keys(value)) {
                                const found = collectFirstUrl((value as any)[key]);
                                if (found) return found;
                            }
                        }
                        return undefined;
                    };
                    imageUrl = collectFirstUrl(json);
                }
            }
        } catch {
            // 忽略 JSON 解析失败，走后备方案
        }

        // 5. 如果图床未返回任何可用 URL，则视为上传失败，避免构造错误地址
        if (!imageUrl) {
            throw new Error('图床未返回图片 URL，请联系管理员检查配置');
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
    log: async (params: BehaviorLogParams) => {
        const { type, timestamp = Date.now(), metadata, sessionId } = params;
        const { data } = await api.post<ApiResponse<BehaviorLogResult>>('/behavior/log', {
            type,
            timestamp,
            metadata,
            sessionId
        });
        return data.data;
    },
    batchLog: async (events: BehaviorLogParams[]): Promise<BehaviorBatchResult> => {
        const { data } = await api.post<ApiResponse<BehaviorBatchResult>>('/behavior/log/batch', {
            events
        });
        return data.data;
    }
};

export const notificationService = {
    getNotifications: async (params: { page?: number; limit?: number; unread?: boolean }) => {
        // 将 boolean 类型的 unread 转换为后端期望的字符串格式
        const queryParams: any = { ...params };
        if (typeof queryParams.unread === 'boolean') {
            queryParams.unread = queryParams.unread ? 'true' : 'false';
        }
        const { data } = await api.get<
            ApiResponse<{
                list: Notification[];
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    totalPages: number;
                };
                unreadCount: number;
            }>
        >('/notifications', { params: queryParams });
        return data.data;
    },
    getNotificationById: async (id: string) => {
        // 新增：获取通知详情（问题76）
        const { data } = await api.get<ApiResponse<Notification>>(
            `/notifications/${id}`
        );
        return data.data;
    },
    markAsRead: async (payload: MarkAsReadPayload) => {
        const { data } = await api.post<ApiResponse<MarkAsReadResponse>>(
            '/notifications/read',
            payload
        );
        return data.data;
    },
    markAllAsRead: async () => {
        // 新增：标记所有通知为已读（问题77）
        const { data } = await api.post<ApiResponse<{ success: boolean; updatedCount: number }>>(
            '/notifications/read-all'
        );
        return data.data;
    },
    deleteNotification: async (id: string) => {
        // 新增：删除通知（问题78）
        const { data } = await api.delete<ApiResponse<{ success: boolean }>>(
            `/notifications/${id}`
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

export const configService = {
    getQuestionDimensions: async (): Promise<QuestionDimensionDto[]> => {
        const { data } = await api.get<
            ApiResponse<{
                dimensions: QuestionDimensionDto[];
            }>
        >('/config/question-dimensions');

        return data.data.dimensions;
    }
};

export const adminService = {
    getWhitelist: async (params: WhitelistParams) => {
        const { data } = await api.get<ApiResponse<WhitelistResponse>>('/admin/whitelist', { params });
        const { list, pagination, statistics } = data.data || {};
        
        if (!list || !pagination) {
            throw new Error('白名单数据格式异常');
        }
        
        return {
            items: list,
            total: pagination.total,
            page: pagination.page,
            totalPages: pagination.totalPages,
            statistics: statistics || {
                total: 0,
                registered: 0,
                pending: 0,
                students: 0,
                parents: 0,
                teachers: 0
            }
        };
    },
    addToWhitelist: async (payload: AddWhitelistPayload) => {
        const { data } = await api.post<ApiResponse<WhitelistUser>>('/admin/whitelist', payload);
        return data.data;
    },
    removeFromWhitelist: async (id: string) => {
        const { data } = await api.delete<ApiResponse<{ warning?: string }>>(`/admin/whitelist/${id}`);
        return data.data;
    },
    updateValidity: async (id: string, validUntil: string) => {
        const { data } = await api.patch<ApiResponse<WhitelistUser>>(`/admin/whitelist/${id}`, { validUntil });
        return data.data;
    },
    getQuestionDimensions: async (): Promise<QuestionDimensionDto[]> => {
        const { data } = await api.get<
            ApiResponse<{
                dimensions: QuestionDimensionDto[];
            }>
        >('/admin/question-dimensions');
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
        const { data } = await api.post<
            ApiResponse<QuestionDimensionOptionDto>
        >(`/admin/question-dimensions/${encodeURIComponent(key)}/options`, payload);
        return data.data;
    },
    updateQuestionDimensionOption: async (
        key: string,
        optionId: string,
        payload: { label?: string; order?: number; enabled?: boolean }
    ) => {
        const { data } = await api.put<
            ApiResponse<QuestionDimensionOptionDto>
        >(
            `/admin/question-dimensions/${encodeURIComponent(
                key
            )}/options/${encodeURIComponent(optionId)}`,
            payload
        );
        return data.data;
    },

    // 审核相关函数已移动到 auditService
};

export const auditService = {
    getPendingQuestions: async (params?: { page?: number; pageSize?: number }) => {
        const { data } = await api.get<
            ApiResponse<{
                type: 'question';
                list: PendingQuestion[];
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    totalPages: number;
                };
                statistics: AuditStatistics;
            }>
        >('/admin/audit/pending', {
            params: { ...(params || {}), type: 'question' }
        });
        return data.data;
    },

    getPendingComments: async (params?: { page?: number; pageSize?: number }) => {
        const { data } = await api.get<
            ApiResponse<{
                type: 'comment';
                list: PendingComment[];
                pagination?: {
                    page: number;
                    pageSize: number;
                    total: number;
                    totalPages: number;
                };
            }>
        >('/admin/audit/pending', {
            params: { ...(params || {}), type: 'comment' }
        });
        return data.data;
    },

    getPendingAnswers: async (params?: { page?: number; pageSize?: number }) => {
        const { data } = await api.get<
            ApiResponse<{
                type: 'answer';
                list: PendingAnswer[];
                pagination?: {
                    page: number;
                    pageSize: number;
                    total: number;
                    totalPages: number;
                };
            }>
        >('/admin/audit/pending', {
            // 修改原因：审核页需要单独拉取待审核回答列表，避免回答 pending 丢失在后台视图之外。
            params: { ...(params || {}), type: 'answer' }
        });
        return data.data;
    },

    approveQuestion: async (
        contentId: string,
        payload: {
            isGoodQuestion?: boolean;
            score?: number;
            tags?: string[];
            difficulty?: string;
        }
    ): Promise<ApproveQuestionResponse> => {
        const { data } = await api.post<
            ApiResponse<ApproveQuestionResponse>
        >(`/admin/audit/${encodeURIComponent(contentId)}/approve`, {
            type: 'question',
            ...payload
        });
        return data.data;
    },

    rejectQuestion: async (
        contentId: string,
        reason: string
    ): Promise<RejectQuestionResponse> => {
        const { data } = await api.post<
            ApiResponse<RejectQuestionResponse>
        >(`/admin/audit/${encodeURIComponent(contentId)}/reject`, {
            type: 'question',
            reason
        });
        return data.data;
    },

    approveComment: async (contentId: string): Promise<ApproveCommentResponse> => {
        const { data } = await api.post<
            ApiResponse<ApproveCommentResponse>
        >(`/admin/audit/${encodeURIComponent(contentId)}/approve`, {
            type: 'comment'
        });
        return data.data;
    },

    approveAnswer: async (contentId: string): Promise<ApproveAnswerResponse> => {
        const { data } = await api.post<
            ApiResponse<ApproveAnswerResponse>
        >(`/admin/audit/${encodeURIComponent(contentId)}/approve`, {
            // 修改原因：复用现有审核通过接口，新增 answer 类型分发。
            type: 'answer'
        });
        return data.data;
    },

    rejectAnswer: async (
        contentId: string,
        reason: string
    ): Promise<RejectAnswerResponse> => {
        const { data } = await api.post<
            ApiResponse<RejectAnswerResponse>
        >(`/admin/audit/${encodeURIComponent(contentId)}/reject`, {
            // 修改原因：回答待审需要驳回能力，与问题驳回保持统一入口。
            type: 'answer',
            reason
        });
        return data.data;
    },

    banComment: async (
        contentId: string,
        reason: string
    ): Promise<BanCommentResponse> => {
        const { data } = await api.post<
            ApiResponse<BanCommentResponse>
        >(`/admin/audit/${encodeURIComponent(contentId)}/ban`, {
            type: 'comment',
            reason
        });
        return data.data;
    },

    togglePinQuestion: async (
        questionId: string
    ): Promise<TogglePinQuestionResponse> => {
        const { data } = await api.post<
            ApiResponse<TogglePinQuestionResponse>
        >(`/admin/audit/questions/${encodeURIComponent(questionId)}/pin`);
        return data.data;
    }
};

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
    }
};

export const commentService = {
    create: async (
        questionId: string,
        payload: CreateCommentPayload
    ) => {
        const { data } = await api.post<ApiResponse<Comment>>(
            `/questions/${questionId}/comments`,
            payload
        );
        return data.data;
    },
    listByQuestion: async (questionId: string) => {
        const { data } = await api.get<
            ApiResponse<CommentListResponse>
        >(`/questions/${questionId}/comments`);
        return data.data;
    }
};

export const profileService = {
    getMyLikes: async (params?: { page?: number; pageSize?: number }) => {
        const { data } = await api.get<
            ApiResponse<PaginatedResponse<MyLikedQuestion>>
        >('/users/me/likes', { params });
        return data.data;
    },
    getMyFavorites: async (params?: { page?: number; pageSize?: number }) => {
        const { data } = await api.get<
            ApiResponse<PaginatedResponse<MyFavoritedQuestion>>
        >('/users/me/favorites', { params });
        return data.data;
    },
    getMyAnswers: async (params?: { page?: number; pageSize?: number }) => {
        const { data } = await api.get<
            ApiResponse<PaginatedResponse<MyAnswerSummary>>
        >('/profile/my-answers', { params });
        return data.data;
    }
};

export const classHoursService = {
    batchUpdate: async (
        userIds: string[],
        action: 'extend' | 'reduce',
        months: number
    ): Promise<BatchUpdateClassHoursResponse> => {
        const { data } = await api.patch<
            ApiResponse<BatchUpdateClassHoursResponse>
        >('/admin/class-hours/batch-update', { userIds, action, months });
        return data.data;
    }
};
