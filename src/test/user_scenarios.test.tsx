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

// Mocks
vi.mock('@/stores/useAuthStore');
vi.mock('@/hooks/useQuestions');

describe('User Scenarios (Based on 测试用例文档.md)', () => {

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
            data: { pages: [{ items: [] }] },
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

        render(
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

    // P0: STU-001 Student Browse Questions
    it('STU-001: Student can browse question list', async () => {
        // Mock Student
        (useAuthStore as any).mockReturnValue({
            user: { role: 'student', nickname: 'Student' },
        });

        // Mock Data
        const mockQuestions = [
            {
                id: '1',
                title: 'Math Question',
                subject: 'math',
                difficulty: 'easy',
                stats: { likes: 10, comments: 2 },
                authorName: 'Teacher' // Added missing field
            }
        ];
        (useQuestions as any).mockReturnValue({
            data: { pages: [{ items: mockQuestions }] },
            isLoading: false,
        });

        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<HomePage />} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Math Question')).toBeDefined();
            expect(screen.getByText('10')).toBeDefined(); // Likes
        });
    });

    // P0: STU-004 Student Ask Question
    it('STU-004: Student can access create page', async () => {
        (useAuthStore as any).mockReturnValue({
            user: { role: 'student', nickname: 'Student' },
        });

        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/create" element={<div data-testid="create-page">Create Question</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        // Click Plus Button
        const fab = screen.getByTestId('nav-create');
        fireEvent.click(fab);

        await waitFor(() => {
            expect(screen.getByTestId('create-page')).toBeDefined();
        });
    });
});
