import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route, useNavigate, Outlet } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { MainLayout } from '@/layouts/MainLayout';
import { QuestionDetailPage } from '@/pages/QuestionDetailPage';
import { CreateQuestionPage } from '@/pages/CreateQuestionPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { useQuestions } from '@/hooks/useQuestions';

// Mock `useQuestions` hook to avoid actual API/React Query logic
vi.mock('@/hooks/useQuestions', () => ({
    useQuestions: vi.fn()
}));

// Mock `useAuthStore` to simulate a logged-in user
vi.mock('@/stores/useAuthStore', () => ({
    useAuthStore: () => ({
        user: { id: 'u1', nickname: 'Test User', role: 'student' },
        logout: vi.fn(),
    })
}));

// Mock `mockQuestions` used in QuestionDetailPage (since it imports directly)
vi.mock('@/lib/mock-data', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        mockQuestions: [
            {
                id: 'q1',
                title: 'Test Question 1',
                content: 'Content 1',
                authorId: 'u1',
                authorName: 'Author 1',
                createdAt: new Date().toISOString(),
                stats: { likes: 0, comments: 0, favorites: 0 },
                tags: ['Math'],
                topics: ['Algebra'],
                subject: 'math'
            }
        ],
        mockAnswers: {},
        mockComments: {},
        currentUser: { id: 'u1', nickname: 'Test User' }
    };
});

describe('Navigation Tests', () => {

    beforeEach(() => {
        // Reset mock return value for useQuestions
        (useQuestions as any).mockReturnValue({
            data: {
                pages: [{
                    items: [
                        {
                            id: 'q1',
                            title: 'Test Question 1',
                            authorName: 'User 1',
                            createdAt: new Date().toISOString(),
                            stats: { likes: 10, favorites: 5, comments: 2 },
                            tags: ['Math'],
                            topics: ['Algebra'],
                            subject: 'math',
                            difficulty: 'easy'
                        }
                    ]
                }]
            },
            fetchNextPage: vi.fn(),
            hasNextPage: false,
            isFetchingNextPage: false,
            isLoading: false,
            getQuestionById: (id: string) => ({
                id: 'q1',
                title: 'Test Question 1',
                content: 'Content 1',
                authorId: 'u1',
                authorName: 'Author 1',
                createdAt: new Date().toISOString(),
                stats: { likes: 0, comments: 0, favorites: 0 },
                tags: ['Math'],
                topics: ['Algebra'],
                subject: 'math'
            })
        });
    });

    it('navigates from HomePage to QuestionDetail when card is clicked', async () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/question/:id" element={<div data-testid="detail-page">Detail Page</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        // Wait for content to load
        await waitFor(() => {
            expect(screen.getByText('Test Question 1')).toBeDefined();
        });

        // Click the card
        const cardTitle = screen.getByText('Test Question 1');
        // The onClick is on the parent div, so clicking the title should bubble up
        fireEvent.click(cardTitle);

        // Check if we navigated
        await waitFor(() => {
            expect(screen.getByTestId('detail-page')).toBeDefined();
        });
    });

    it('navigates to Create page via Plus button', async () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<div>Home Page</div>} />
                        <Route path="/create" element={<div data-testid="create-page">Create Page</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        const createBtn = screen.getByTestId('nav-create');
        fireEvent.click(createBtn);

        await waitFor(() => {
            expect(screen.getByTestId('create-page')).toBeDefined();
        });
    });

    it('navigates back from QuestionDetail page', async () => {
        render(
            <MemoryRouter initialEntries={['/', '/question/q1']}>
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<div data-testid="home-page">Home Page</div>} />
                        <Route path="/question/:id" element={<QuestionDetailPage />} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        // We start at detail page. Find the back button.
        const backBtn = screen.getByTestId('back-button');

        fireEvent.click(backBtn);

        await waitFor(() => {
            expect(screen.getByTestId('home-page')).toBeDefined();
        });
    });
});
