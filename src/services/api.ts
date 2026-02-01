import axios from 'axios';
import { mockQuestions } from '@/lib/mock-data';
import type { Question } from '@/types';

// Create axios instance
const api = axios.create({
    baseURL: '/api', // Proxy will handle this later
    timeout: 10000,
});

// Mock Interceptor for behavior logging
api.interceptors.request.use(async (config) => {
    if (config.url === '/behavior/log' && config.method === 'post') {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Log to console for debugging as per user requirement
        try {
            const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            console.log('[Mock API] Behavior Logged:', payload);
        } catch (e) {
            console.log('[Mock API] Behavior Logged (Raw):', config.data);
        }
        
        // Return a mock response adapter
        config.adapter = async () => {
            return {
                data: { success: true, message: 'Logged successfully' },
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
            };
        };
    }
    return config;
});

export interface QuestionParams {
    page?: number;
    limit?: number;
    subject?: string;
    topic?: string;
    method?: string;
    search?: string;
    authorId?: string;
}

export const questionService = {
    // Get list of questions (Mocked for now)
    getQuestions: async (params: QuestionParams = {}) => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const {
            page = 1,
            limit = 10,
            subject,
            topic,
            method
        } = params;

        // Filter mock data
        let filtered = [...mockQuestions];

        if (subject) {
            filtered = filtered.filter(q => q.subject === subject);
        }

        if (topic) {
            filtered = filtered.filter(q => q.topics?.includes(topic));
        }

        // Sort: Pinned first, then Newest
        filtered.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Pagination
        const start = (page - 1) * limit;
        const end = start + limit;
        const items = filtered.slice(start, end);
        const hasNextPage = end < filtered.length;

        return {
            items,
            nextPage: hasNextPage ? page + 1 : undefined,
            total: filtered.length
        };
    },

    // Get single question
    getQuestionById: async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const question = mockQuestions.find(q => q.id === id);
        if (!question) throw new Error('Question not found');
        return question;
    },

    // Like a question
    likeQuestion: async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return { success: true };
    }
};

export { api };
export default api;
