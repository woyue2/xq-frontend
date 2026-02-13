import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MyQuestionsPage } from '@/pages/MyQuestionsPage';
import { StatusListPage } from '@/pages/StatusListPage';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';
import { questionService } from '@/services/api';
import { toast } from 'sonner';

// Mock hooks & toast
vi.mock('@/hooks/useQuestions', () => ({
    useQuestions: vi.fn()
}));

vi.mock('@/stores/useAuthStore', () => ({
    useAuthStore: vi.fn()
}));

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
        info: vi.fn()
    }
}));

vi.mock('@/services/api', async (orig) => {
    const actual = await orig();
    return {
        ...actual,
        questionService: {
            ...actual.questionService,
            getMyStatusCounts: vi.fn()
        }
    };
});

describe('Status Navigation Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock User（默认学生）
        (useAuthStore as any).mockReturnValue({
            user: { id: 'u1', nickname: 'Test User', role: 'student' }
        });
        (questionService.getMyStatusCounts as any).mockResolvedValue({
            total: 2,
            pending: 1,
            approved: 1,
            rejected: 0,
            banned: 0,
            other: 0
        });

        const allQuestions = [
            {
                id: 'q1',
                title: 'Approved Question',
                content: 'Content 1',
                status: 'approved',
                createdAt: new Date().toISOString(),
                stats: { likes: 0, comments: 0, answers: 0 },
                isGoodQuestion: true,
                answerCount: 0,
                subject: 'math',
                likeCount: 0,
                collectionCount: 0,
                authorId: 'u1'
            },
            {
                id: 'q2',
                title: 'Pending Question',
                content: 'Content 2',
                status: 'pending',
                createdAt: new Date().toISOString(),
                stats: { likes: 0, comments: 0, answers: 0 },
                isGoodQuestion: false,
                answerCount: 0,
                subject: 'math',
                likeCount: 0,
                collectionCount: 0,
                authorId: 'u1'
            }
        ];

        // 修改原因：状态页改为后端按 status 过滤，测试需模拟“带 status 请求返回对应数据”。
        (useQuestions as any).mockImplementation((params: any = {}) => {
            const scoped = typeof params.status === 'string'
                ? allQuestions.filter((q) => q.status === params.status)
                : allQuestions;

            return {
                data: {
                    pages: [{ list: scoped }]
                },
                isLoading: false,
                refetch: vi.fn()
            };
        });
    });

    it('navigates to pending list when clicking pending stats', async () => {
        render(
            <MemoryRouter initialEntries={['/my-questions']}>
                <Routes>
                    <Route path="/my-questions" element={<MyQuestionsPage />} />
                    <Route path="/my-questions/status/:status" element={<StatusListPage />} />
                </Routes>
            </MemoryRouter>
        );

        // Verify stats are visible
        expect(screen.getByTestId('stat-pending')).toBeDefined();
        // Click the pending stats card
        fireEvent.click(screen.getByTestId('stat-pending'));

        // Verify navigation and new page content
        await waitFor(() => {
            expect(screen.getByText('待审核提问')).toBeDefined(); // Title of StatusListPage
            expect(screen.getByText('Pending Question')).toBeDefined();
            expect(screen.queryByText('Approved Question')).toBeNull(); // Should be filtered out
        });

        expect(useQuestions).toHaveBeenCalledWith(
            expect.objectContaining({
                authorId: 'u1',
                status: 'pending'
            })
        );
    });

    it('uses server status counts for stat cards instead of current page list only', async () => {
        (questionService.getMyStatusCounts as any).mockResolvedValueOnce({
            total: 12,
            pending: 3,
            approved: 9,
            rejected: 0,
            banned: 0,
            other: 0
        });

        // 修改原因：模拟“当前页数据不足以代表总数”的场景，验证统计卡片使用后端聚合值。
        (useQuestions as any).mockReturnValue({
            data: {
                pages: [{
                    list: [{
                        id: 'q-only-1',
                        title: 'Only One In Page',
                        content: 'C',
                        status: 'approved',
                        createdAt: new Date().toISOString(),
                        stats: { likes: 0, comments: 0, answers: 0 },
                        isGoodQuestion: false,
                        answerCount: 0,
                        subject: 'math',
                        likeCount: 0,
                        collectionCount: 0,
                        authorId: 'u1'
                    }]
                }]
            },
            isLoading: false,
            refetch: vi.fn()
        });

        render(
            <MemoryRouter initialEntries={['/my-questions']}>
                <Routes>
                    <Route path="/my-questions" element={<MyQuestionsPage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('12')).toBeDefined();
            expect(screen.getByText('3')).toBeDefined();
            expect(screen.getByText('9')).toBeDefined();
        });
    });

    it('navigates to approved list when clicking approved stats', async () => {
        render(
            <MemoryRouter initialEntries={['/my-questions']}>
                <Routes>
                    <Route path="/my-questions" element={<MyQuestionsPage />} />
                    <Route path="/my-questions/status/:status" element={<StatusListPage />} />
                </Routes>
            </MemoryRouter>
        );

        // Click the approved stats card
        fireEvent.click(screen.getByTestId('stat-approved'));

        // Verify navigation and new page content
        await waitFor(() => {
            expect(screen.getByText('已通过提问')).toBeDefined(); // Title of StatusListPage
            expect(screen.getByText('Approved Question')).toBeDefined();
            expect(screen.queryByText('Pending Question')).toBeNull(); // Should be filtered out
        });
    });

    it('redirects unauthenticated user to login when accessing status list directly', async () => {
        // 模拟未登录用户
        (useAuthStore as any).mockReturnValue({
            user: null
        });

        render(
            <MemoryRouter initialEntries={['/my-questions/status/pending']}>
                <Routes>
                    <Route path="/my-questions/status/:status" element={<StatusListPage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalled();
        });
    });

    it('blocks parent user from accessing status list', async () => {
        // 模拟家长用户
        (useAuthStore as any).mockReturnValue({
            user: { id: 'p1', nickname: 'Parent', role: 'parent' }
        });

        render(
            <MemoryRouter initialEntries={['/my-questions/status/pending']}>
                <Routes>
                    <Route path="/my-questions/status/:status" element={<StatusListPage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('家长账号无法查看提问状态列表');
        });
    });
});
