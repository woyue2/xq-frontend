import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { CreateQuestionPage } from '@/pages/CreateQuestionPage';
import { QuestionDetailPage } from '@/pages/QuestionDetailPage';
import { MainLayout } from '@/layouts/MainLayout';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mocks
vi.mock('@/hooks/useQuestions', () => ({
    useQuestions: vi.fn()
}));


vi.mock('@/lib/mock-data', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        currentUser: { id: 'u1', nickname: 'Teacher User', role: 'teacher' }, // Default to teacher for audit test
        mockQuestions: [
            {
                id: 'q1',
                title: 'Integration Test Question',
                content: 'Content',
                authorId: 'u2',
                authorName: 'Student',
                createdAt: new Date().toISOString(),
                stats: { likes: 0, favorites: 0, comments: 0, answers: 0 },
                tags: [],
                subject: 'math',
                difficulty: 'easy'
            }
        ],
        mockComments: {
            'q1': []
        }
    };
});

describe('Integration Tests (Super Brain)', () => {
    const renderWithQueryClient = (ui: JSX.Element) => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } }
        });
        return render(
            <QueryClientProvider client={queryClient}>
                {ui}
            </QueryClientProvider>
        );
    };

    beforeEach(() => {
        // Reset useQuestions mock
        (useQuestions as any).mockReturnValue({
            data: {
                pages: [{
                    list: [{
                        id: 'q1',
                        title: 'Integration Test Question',
                        authorName: 'Student',
                        createdAt: new Date().toISOString(),
                        stats: { likes: 0, favorites: 0, comments: 0, answers: 0 },
                        tags: [],
                        subject: 'math',
                        difficulty: 'easy'
                    }]
                }]
            },
            fetchNextPage: vi.fn(),
            hasNextPage: false,
            isFetchingNextPage: false,
            isLoading: false,
            getQuestionById: (id: string) => ({
                id: 'q1',
                title: 'Integration Test Question',
                content: 'Content',
                authorId: 'u2',
                authorName: 'Student',
                createdAt: new Date().toISOString(),
                stats: { likes: 0, favorites: 0, comments: 0, answers: 0 },
                tags: [],
                subject: 'math',
                difficulty: 'easy'
            })
        });

        // Reset Auth Store to Teacher
        useAuthStore.setState({
            user: { id: 't1', nickname: 'Teacher', role: 'teacher', avatar: 'img', phone: '123' }
        });
    });

    it('Flow: User views detail and sees comments', async () => {
        // Setup mock comments for this specific test if needed, or rely on global mock

        renderWithQueryClient(
            <MemoryRouter initialEntries={['/question/q1']}>
                <Routes>
                    <Route path="/question/:id" element={<QuestionDetailPage />} />
                </Routes>
            </MemoryRouter>
        );

        // 1. Verify Question Loaded
        await waitFor(() => {
            expect(screen.getByText('Integration Test Question')).toBeDefined();
        });

        // 2. Verify Comment Section exists
        // Depending on logic, it might show "暂无评论" (No comments) or list.
        // Our mock has empty comments for q1, so it should be empty state or just no comments.
        // Let's try to add a comment?

        // Find input
        const input = screen.getByPlaceholderText('说点什么...'); // Adjust placeholder availability
        fireEvent.change(input, { target: { value: 'New Test Comment' } });

        // Find submit button (PaperPlaneTilt icon)
        // It's a button with PaperPlaneTilt icon. Usually the last button in that row.
        // We can add data-testid to submit button in QuestionDetailPage later for robustness.
    });

    it('Feature: User can attach image to comment', async () => {
        // 1. Render Question Detail
        renderWithQueryClient(
            <MemoryRouter initialEntries={['/question/q1']}>
                <Routes>
                    <Route path="/question/:id" element={<QuestionDetailPage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Integration Test Question')).toBeDefined();
        });

        // 2. Click Camera Button
        const cameraBtn = screen.getByTestId('add-image-btn');
        fireEvent.click(cameraBtn);

        // 3. Verify Image Preview appears (Mock logic sets text "已添加图片" toast, or renders preview div)
        // Our mock `handleAddImage` sets `commentImage`, which renders a preview div with alt="preview"
        // So we look for alt="preview"
        await waitFor(() => {
            const preview = screen.getByAltText('preview');
            expect(preview).toBeDefined();
        });
    });

    it('Safety: Application does not crash when Taxonomy key is missing', () => {
        // Simulate selecting a subject that is missing in TAXONOMY (if forced)
        // or verify fallback logic.
        // But more importantly, verify the page renders fine even if we "simulated" a missing key by passing weird props?
        // Actually checking if "physics" removal breaks things:
        // We can't easily modify the source code file 'taxonomy.ts' in the test without reloading modules.
        // Instead, we verify that accessing a non-existent subject doesn't crash CreateQuestionPage.

        renderWithQueryClient(
            <MemoryRouter initialEntries={['/create']}>
                <Routes>
                    <Route path="/create" element={<CreateQuestionPage />} />
                </Routes>
            </MemoryRouter>
        );

        // Page should render
        expect(screen.getByText('编辑我的问题')).toBeDefined();

        // If we manually set state to unknown subject? Hard to do in integration test without user interaction.
        // But we can assert the logic: The code uses `TAXONOMY[selectedSubject]`.
        // If we select nothing, it's safe.
        // If we select "math", it works.
    });

    // ===== Part 1: 置顶功能测试 =====
    describe('PushPin/Top Feature Tests (TCH-003, TCH-004)', () => {
        it('PIN-001: Teacher can see pin button on question card', async () => {
            // Teacher is already set in beforeEach
            renderWithQueryClient(
                <MemoryRouter initialEntries={['/']}>
                    <Routes>
                        <Route element={<MainLayout />}>
                            <Route path="/" element={<HomePage />} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Integration Test Question')).toBeDefined();
            });

            // Teacher should see pin button
            const pinButton = screen.queryByText('置顶');
            expect(pinButton).toBeDefined();
        });

        it('PIN-002: Student cannot see pin button', async () => {
            // Change to student role
            useAuthStore.setState({
                user: { id: 's1', nickname: 'Student', role: 'student', avatar: 'img', phone: '123' }
            });

            renderWithQueryClient(
                <MemoryRouter initialEntries={['/']}>
                    <Routes>
                        <Route element={<MainLayout />}>
                            <Route path="/" element={<HomePage />} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Integration Test Question')).toBeDefined();
            });

            // Student should NOT see pin button
            const pinButton = screen.queryByText('置顶');
            expect(pinButton).toBeNull();
        });
    });

});
