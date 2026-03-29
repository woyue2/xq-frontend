/**
 * http.ts — Axios 实例 + 拦截器
 *
 * 职责：
 *   - 创建并导出公共 axios 实例 `api`
 *   - Token 注入（三层兜底：Zustand Store → localStorage.token → auth-storage）
 *   - Mock 拦截器（仅在 test 模式下启用）
 *   - 统一响应错误处理
 */
import axios from 'axios';
import { toast } from 'sonner';
import { mockQuestions, mockUsers, mockChildren } from '@/lib/mock-data';
import { useAuthStore } from '@/stores/useAuthStore';
import { USE_MOCK } from '@/lib/mock-env';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export const api = axios.create({
    baseURL: API_BASE,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ─── Request Interceptor: Token Injection + Headers ──────────────────────────
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

    (config.headers as any)['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    (config.headers as any)['X-Client-Version'] = import.meta.env.VITE_APP_VERSION || '1.0.0';
    (config.headers as any)['X-Client-Mode'] = USE_MOCK ? 'mock' : 'normal';

    return config;
});

// ─── Mock 拦截器（仅 test 模式）─────────────────────────────────────────────
// 运行真实应用（VITE_USE_MOCK=false）时不会启用。
if (USE_MOCK && import.meta.env.MODE === 'test') {
    api.interceptors.request.use(async (config) => {
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
            const user = mockUsers.find(u => u.phone === phone) || mockUsers[0];
            config.adapter = mockAdapter({ token: 'mock-jwt-token-' + Date.now(), user });
        }
        else if (url.includes('/auth/password-login') && method === 'post') {
            const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            const { phone } = payload;
            const user = mockUsers.find(u => u.phone === phone) || mockUsers[0];
            config.adapter = mockAdapter({ token: 'mock-jwt-token-' + Date.now(), user });
        }

        // --- Parent Mocks ---
        if (url.includes('/parent/bind') && method === 'post') {
            const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            const { childName, phone, school } = payload;
            if (!childName || !phone) {
                throw { response: { status: 400, data: { message: '信息不完整' } } };
            }
            const newChild = {
                id: 'child_' + Date.now(),
                name: childName,
                grade: '三年级',
                age: 9,
                school: school || '实验小学',
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${childName}`,
                boundAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString(),
                parentId: '3'
            };
            const stored = localStorage.getItem('parent_children');
            const children = stored ? JSON.parse(stored) : [...mockChildren];
            children.push(newChild);
            localStorage.setItem('parent_children', JSON.stringify(children));
            config.adapter = mockAdapter(newChild);
        }
        else if (url.includes('/parent/children') && method === 'get') {
            const stored = localStorage.getItem('parent_children');
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
            children = children.filter((c: { id: string }) => c.id !== childId);
            localStorage.setItem('parent_children', JSON.stringify(children));
            config.adapter = mockAdapter(null);
        }
        else if (url.includes('/parent/questions') && method === 'get') {
            const params = config.params || {};
            let filtered = [...mockQuestions];
            if (params.subject) filtered = filtered.filter(q => q.subject === params.subject);
            if (params.tags) filtered = filtered.filter(q => q.tags?.some((tag: string) => params.tags?.includes(tag)));
            const page = Number(params.page) || 1;
            const pageSize = Number(params.pageSize) || Number(params.limit) || 10;
            const start = (page - 1) * pageSize;
            const items = filtered.slice(start, start + pageSize);
            config.adapter = mockAdapter({ items, total: filtered.length, page, totalPages: Math.ceil(filtered.length / pageSize) });
        }
        else if (url.match(/\/parent\/questions\/[^/]+$/) && method === 'get') {
            const params = config.params || {};
            let filtered = [...mockQuestions];
            if (params.subject) filtered = filtered.filter(q => q.subject === params.subject);
            if (params.tags) filtered = filtered.filter(q => q.tags?.some((tag: string) => params.tags?.includes(tag)));
            const page = Number(params.page) || 1;
            const pageSize = Number(params.pageSize) || Number(params.limit) || 10;
            const start = (page - 1) * pageSize;
            const items = filtered.slice(start, start + pageSize);
            config.adapter = mockAdapter({ items, total: filtered.length, page, totalPages: Math.ceil(filtered.length / pageSize) });
        }

        // --- Question Mocks ---
        else if (url.match(/\/questions\/[^/]+$/) && method === 'get') {
            const id = url.split('/').pop();
            const question = mockQuestions.find(q => q.id === id);
            if (question) config.adapter = mockAdapter(question);
        }
        else if (url.includes('/questions') && method === 'get' && !url.includes('upload')) {
            const params = config.params || {};
            const page = Number(params.page) || 1;
            const pageSize = Number(params.pageSize) || Number(params.limit) || 10;
            let filtered = [...mockQuestions];
            if (params.subject) filtered = filtered.filter(q => q.subject === params.subject);
            if (params.tags) filtered = filtered.filter(q => q.tags?.some((tag: string) => params.tags?.includes(tag)));
            const start = (page - 1) * pageSize;
            const items = filtered.slice(start, start + pageSize);
            config.adapter = mockAdapter({ list: items, pagination: { page, pageSize, total: filtered.length, totalPages: Math.ceil(filtered.length / pageSize) } });
        }
        else if (url.endsWith('/questions') && method === 'post') {
            const newQuestion = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            config.adapter = mockAdapter({ ...newQuestion, id: 'q_' + Date.now(), createdAt: new Date().toISOString(), status: 'pending', stats: { likes: 0, comments: 0, favorites: 0 } });
        }
        else if (url.includes('/questions/') && url.endsWith('/understanding') && method === 'post') {
            const match = url.match(/\/questions\/([^/]+)\/understanding/);
            const questionId = match?.[1] ?? 'q1';
            const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            const status = payload?.status === 'understood' ? 'understood' : 'not_understood';
            config.adapter = mockAdapter({ questionId, status, understoodCount: status === 'understood' ? 1 : 0, notUnderstoodCount: status === 'not_understood' ? 1 : 0 });
        }

        // --- Interaction Mocks ---
        else if (url.includes('/questions/') && url.endsWith('/like') && method === 'post') {
            const match = url.match(/\/questions\/([^/]+)\/like/);
            config.adapter = mockAdapter({ questionId: match?.[1] ?? 'q1', isLiked: true, likes: 43 });
        }
        else if (url.includes('/questions/') && url.endsWith('/favorite') && method === 'post') {
            const match = url.match(/\/questions\/([^/]+)\/favorite/);
            config.adapter = mockAdapter({ questionId: match?.[1] ?? 'q1', isFavorited: true, favorites: 10 });
        }
        else if (url.includes('/interactions/like') && method === 'post') {
            const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            config.adapter = mockAdapter({ liked: payload?.action !== 'unlike', likesCount: 1 });
        }
        else if (url.includes('/interactions/favorite') && method === 'post') {
            const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            const favorited = payload?.action !== 'unfavorite';
            config.adapter = mockAdapter({ favorited, favoritesCount: favorited ? 1 : 0 });
        }
        else if (url.includes('/upload/signature') && method === 'get') {
            const now = Date.now();
            const type = config.params?.type === 'audio' ? 'audio' : 'image';
            const ext = type === 'audio' ? 'mp3' : 'jpg';
            const key = `${type}/mock/${now}.${ext}`;
            config.adapter = mockAdapter({ uploadUrl: 'https://oss.mock.com/upload', key, policy: 'mock-policy', signature: 'mock-signature', expireAt: now + 5 * 60 * 1000 });
        }
        else if (url.includes('/behavior/log') && method === 'post') {
            config.adapter = mockAdapter(null);
        }

        return config;
    });
}

// ─── Response Interceptor: Error Handling ─────────────────────────────────────
api.interceptors.response.use(
    (response) => {
        if (response.data && typeof response.data.code === 'number') {
            const { code, message } = response.data;
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
