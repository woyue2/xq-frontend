import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout'; // Assuming this exists
import { HomePage } from '@/pages/HomePage';
import { QuestionDetailPage } from '@/pages/QuestionDetailPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AuditPage } from '@/pages/AuditPage';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mocks
vi.mock('@/stores/useAuthStore');
vi.mock('@/hooks/useQuestions');

describe('User Scenarios (Based on 测试用例文档.md)', () => {

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
        vi.clearAllMocks();
        // Default Mock: Logged out
        (useAuthStore as any).mockReturnValue({
            user: null,
            login: vi.fn(),
            logout: vi.fn(),
        });
        // Default Mock: Questions
        (useQuestions as any).mockReturnValue({
            data: { pages: [{ list: [] }] },
            isLoading: false,
            fetchNextPage: vi.fn(),
            hasNextPage: false,
        });
    });

    // P0: WL-001
    // Since we don't have a full admin page implemented yet (it redirects to Audit), 
    // we test the navigation to Audit which currently serves as the "Whitelist Management" for teachers.
    it('WL-001 (Audit): Teacher can access audit/whitelist page', async () => {
        // Mock Teacher Login
        (useAuthStore as any).mockReturnValue({
            user: { role: 'teacher', nickname: 'Teacher' },
            login: vi.fn(),
        });

        renderWithQueryClient(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/admin" element={<div data-testid="admin-page">Admin Page</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        // Click "User Whitelist" (now goes to /admin)
        const link = screen.getByTestId('menu-item-用户白名单');
        fireEvent.click(link);

        await waitFor(() => {
            expect(screen.getByTestId('admin-page')).toBeDefined();
        });
    });

});
