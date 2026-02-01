import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MyQuestionsPage } from '@/pages/MyQuestionsPage';
import { StatusListPage } from '@/pages/StatusListPage';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';

// Mock hooks
vi.mock('@/hooks/useQuestions', () => ({
    useQuestions: vi.fn()
}));

vi.mock('@/stores/useAuthStore', () => ({
    useAuthStore: vi.fn()
}));

describe('Status Navigation Tests', () => {
    beforeEach(() => {
        // Mock User
        (useAuthStore as any).mockReturnValue({
            user: { id: 'u1', nickname: 'Test User', role: 'student' }
        });

        // Mock Questions Data
        (useQuestions as any).mockReturnValue({
            data: {
                pages: [{
                    items: [
                        {
                            id: 'q1',
                            title: 'Approved Question',
                            content: 'Content 1',
                            status: 'approved',
                            createdAt: new Date().toISOString(),
                            stats: { likes: 0, comments: 0 },
                            isGoodQuestion: true
                        },
                        {
                            id: 'q2',
                            title: 'Pending Question',
                            content: 'Content 2',
                            status: 'pending',
                            createdAt: new Date().toISOString(),
                            stats: { likes: 0, comments: 0 },
                            isGoodQuestion: false
                        }
                    ]
                }]
            },
            isLoading: false
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
});
