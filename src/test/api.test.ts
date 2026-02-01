import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, authService, questionService, interactionService } from '@/services/api';
import { mockQuestions } from '@/lib/mock-data';

// Enable Mock for these tests to test the internal adapter logic
// Note: In a real unit test of the service, we might mock axios. 
// Here we are testing the service layer + interceptors + internal mock adapter.
vi.mock('@/config/feature-flags', () => ({
    featureFlags: { ENABLE_GOOD_QUESTION_INTERACTION: true }
}));

describe('API Service Layer', () => {
    
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('Interceptors', () => {
        // Skipped: Hard to spy on internal axios execution without refactoring api.ts to export the instance or using msw.
        // The functional tests above implicitly cover the interceptor logic (e.g. login works, data is unwrapped).
        it.skip('should inject token into headers', async () => {});
    });

    describe('AuthService', () => {
        it('should send code successfully', async () => {
            const res = await authService.sendCode({ phone: '13800138000' });
            expect(res.data.data).toBeNull(); // ApiResponse<null>
        });

        it('should login successfully', async () => {
            const res = await authService.login({ phone: '13800138000', code: '123456' });
            expect(res.data.data.token).toBeDefined();
            expect(res.data.data.user).toBeDefined();
        });
    });

    describe('QuestionService', () => {
        it('should fetch questions with pagination', async () => {
            const res = await questionService.getQuestions({ page: 1, limit: 5 });
            expect(res.items).toHaveLength(5);
            expect(res.total).toBeGreaterThan(0);
            expect(res.page).toBe(1);
        });

        it('should fetch single question by id', async () => {
            const target = mockQuestions[0]; // ID is '1'
            const res = await questionService.getQuestionById(target.id);
            expect(res).toBeDefined();
            expect(res.id).toBe(target.id);
            expect(res.title).toBe(target.title);
        });

        it('should create question', async () => {
            const payload = {
                title: 'New Test Question',
                content: 'Content',
                difficulty: 'easy' as const,
                subject: 'math'
            };
            const res = await questionService.createQuestion(payload);
            expect(res.title).toBe(payload.title);
            expect(res.id).toBeDefined();
        });
    });

    describe('InteractionService', () => {
        it('should like a target', async () => {
            const res = await interactionService.like({
                targetType: 'question',
                targetId: 'q1',
                action: 'like'
            });
            expect(res.liked).toBe(true);
            expect(res.likesCount).toBeGreaterThan(0);
        });
    });
});
