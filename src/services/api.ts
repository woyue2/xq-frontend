import axios from 'axios';
import { toast } from 'sonner';
import { mockQuestions, mockUsers, mockAnswers, mockChildren } from '@/lib/mock-data';
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
    Notification,
    WhitelistUser,
    WhitelistParams,
    AddWhitelistPayload
} from '@/types/api';
import type { Question, User } from '@/types';

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
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // Add Request ID for tracing
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    // Add Client Version
    config.headers['X-Client-Version'] = import.meta.env.VITE_APP_VERSION || '1.0.0';
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
            // Extract childId from URL params if possible, but here it's likely a query param or path param
            // The service call uses `/parent/questions?childId=...` or `/parent/questions/:childId`
            // Looking at parentService.ts (inferred), it probably passes query params.

            // BUT, if the path is `/parent/questions/:childId`, we need to handle that.
            // Let's assume the service does `api.get('/parent/questions', { params: { childId, ... } })` 
            // OR `api.get('/parent/questions/' + childId, ...)`

            // If it's a GET with params:
            const params = config.params || {};
            const childId = params.childId; // Assuming passed as param

            // In mock data, we don't have explicit childId on questions yet.
            // Let's just return all questions for now, or filter if we add childId to questions.
            // To simulate "child's questions", we can just return a subset or all.

            let filtered = [...mockQuestions];

            // If we want to simulate filtering by child, we could assume some questions belong to the child.
            // For now, let's just return all questions to ensure data is shown.

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
            // Handle /parent/questions/:childId pattern
            // const childId = url.split('/').pop();
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
            // Parse params
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
                items,
                total: filtered.length,
                page,
                totalPages: Math.ceil(filtered.length / limit)
            });
        }
        else if (url.includes('/questions') && method === 'post') {
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
        else if (url.includes('/interactions/like') && method === 'post') {
            config.adapter = mockAdapter({ liked: true, likesCount: 43 });
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
            if (code !== 200) {
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

export const questionService = {
    getQuestions: async (params: QuestionListParams = {}) => {
        const { data } = await api.get<ApiResponse<PaginatedResponse<Question>>>('/questions', { params });
        return data.data; // Return the inner data (PaginatedResponse)
    },
    getQuestionById: async (id: string) => {
        const { data } = await api.get<ApiResponse<Question>>(`/questions/${id}`);
        return data.data;
    },
    createQuestion: async (payload: CreateQuestionPayload) => {
        const { data } = await api.post<ApiResponse<Question>>('/questions', payload);
        return data.data;
    },
    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await api.post<ApiResponse<{ imageUrl: string }>>('/questions/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return data.data;
    }
};

export const interactionService = {
    like: async (payload: LikePayload) => {
        const { data } = await api.post<ApiResponse<LikeResponse>>('/interactions/like', payload);
        return data.data;
    },
    favorite: async (payload: { questionId: string; action: 'favorite' | 'unfavorite' }) => {
        const { data } = await api.post<ApiResponse<{ favorited: boolean; favoritesCount: number }>>('/interactions/favorite', payload);
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
        const { data } = await api.post<ApiResponse<{ received: number; processed: number; failed: number }>>('/behavior/batch-log', { events });
        return data.data;
    }
};

export const notificationService = {
    getNotifications: async (params: { page?: number; limit?: number; unread?: boolean }) => {
        const { data } = await api.get<ApiResponse<PaginatedResponse<Notification>>>('/notifications', { params });
        return data.data;
    },
    markAsRead: async (ids: string[]) => {
        const { data } = await api.post<ApiResponse<null>>('/notifications/read', { ids });
        return data.data;
    },
    getUnreadCount: async () => {
        const { data } = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
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
        const { data } = await api.patch<ApiResponse<null>>(`/admin/whitelist/${id}/validity`, { validUntil });
        return data.data;
    }
};
