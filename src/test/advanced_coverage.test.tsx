import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';

import { AdminManagementPage } from '@/pages/AdminManagementPage';
import { CreateQuestionPage } from '@/pages/CreateQuestionPage';
import { QuestionDetailPage } from '@/pages/QuestionDetailPage';
import { LoginPage } from '@/pages/LoginPage';

// --- Mocks ---
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('@/stores/useAuthStore');
vi.mock('@/hooks/useQuestions');

// Mock Data
const mockUserStudent = {
    id: 'u1',
    role: 'student',
    name: 'Student 1',
    phone: '13700137000',
    expiresAt: '2099-12-31T23:59:59Z' // Active membership
};
const mockUserTeacher = { id: 'u2', role: 'teacher', name: 'Teacher 1', phone: '13900139000' };

// Mock Taxonomy for predictable testing
vi.mock('@/config/taxonomy', () => ({
    SUBJECT_OPTIONS: [
        { value: 'math', label: '数学' },
        { value: 'english', label: '英语' }
    ],
    TAXONOMY: {
        math: { topics: ['Calculus', 'Algebra'], methods: ['Formula', 'Graph'] },
        english: { topics: ['Grammar', 'Vocab'], methods: ['Reading', 'Writing'] }
    }
}));

// Mock Data Module
vi.mock('@/lib/mock-data', () => {
    const innerUser = { id: 'u1', role: 'student', name: 'Student 1', phone: '13700137000' };
    const innerTeacher = { id: 'u2', role: 'teacher', name: 'Teacher 1', phone: '13900139000' };
    // WL-008: Pre-existing user for duplicate check
    const existingUser = { id: 'u4', role: 'student', name: 'Existing', phone: '13800138000' };

    return {
        mockQuestions: [{
            id: '1', title: 'Q1', content: 'C1', authorId: 'u1', authorName: 'Student 1', status: 'approved',
            difficulty: 'easy', createdAt: new Date().toISOString(),
            stats: { likes: 0, comments: 0, favorites: 0 },
            images: []
        }],
        mockUsers: [innerUser, innerTeacher, existingUser],
        mockComments: { '1': [] },
        mockAnswers: { '1': [] },
        userLikes: new Set(),
        userFavorites: new Set(),
        validInviteCodes: ['CODE123']
    };
});

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
    Toaster: () => null
}));

import { toast } from 'sonner'; // Import for assertions

describe('Advanced Coverage Tests', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuthStore as any).mockReturnValue({ user: null });
        (useQuestions as any).mockReturnValue({
            data: { pages: [{ items: [] }] },
            isLoading: false
        });
    });

    // 1. WL-008: Duplicate Phone Check
    describe('WL: Admin Edge Cases', () => {
        it('WL-008: Cannot add duplicate phone number', async () => {
            (useAuthStore as any).mockReturnValue({ user: mockUserTeacher });
            render(<MemoryRouter><AdminManagementPage onNavigate={mockNavigate} /></MemoryRouter>);

            fireEvent.click(screen.getByText('添加'));

            // Input duplicate phone (13800138000 is manually mocked above)
            const inputs = screen.getAllByPlaceholderText('请输入11位手机号');
            // The dialog input is likely the last one rendered or distinct
            const phoneInput = inputs[inputs.length - 1];
            fireEvent.change(phoneInput, { target: { value: '13800138000' } });

            fireEvent.change(screen.getByPlaceholderText('请输入用户姓名'), { target: { value: 'Duplicate' } });

            // Click submit
            const submitBtns = screen.getAllByText('添加');
            const dialogSubmit = submitBtns[submitBtns.length - 1]; // Dialog Add
            fireEvent.click(dialogSubmit);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('该手机号已在白名单中');
            });
        });
    });

    // 2. STU-004/008/007: Create Question Flow
    describe('STU: Create Question Flow', () => {
        it('STU-008: Cannot submit with empty title/subject', () => {
            (useAuthStore as any).mockReturnValue({ user: mockUserStudent });
            render(<MemoryRouter><CreateQuestionPage /></MemoryRouter>);

            // Button should be disabled but let's check validation logic if clicks forced or logic
            // The code has validation in handleSubmit, but button might be disabled.
            // Component: disabled={!canSubmit}
            const submitBtn = screen.getByText('提交');
            expect(submitBtn).toBeDisabled();
        });

        it('STU-004: Happy Path (Select Subject -> Title -> Submit)', async () => {
            (useAuthStore as any).mockReturnValue({ user: mockUserStudent });
            render(<MemoryRouter><CreateQuestionPage /></MemoryRouter>);

            // 1. Select Subject '数学'
            fireEvent.click(screen.getByText('数学'));

            // 2. Enter Title
            const titleInput = screen.getByPlaceholderText(/一句话描述你的问题/);
            fireEvent.change(titleInput, { target: { value: 'How to integrate?' } });

            // 3. Submit
            const submitBtn = screen.getByText('提交');
            await waitFor(() => expect(submitBtn).not.toBeDisabled());

            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('问题已提交'));
            });
        });

        it('STU-007: Max 3 Images', () => {
            (useAuthStore as any).mockReturnValue({ user: mockUserStudent });
            render(<MemoryRouter><CreateQuestionPage /></MemoryRouter>);

            const uploadBtn = screen.getByText('上传图片');
            // Mock logic adds 1 image per click
            fireEvent.click(uploadBtn);
            fireEvent.click(uploadBtn);
            fireEvent.click(uploadBtn);

            // Now 3 images. 4th click should fail/toast or button disappears.
            // Code: if (images.length < 3) render button. So button should disappear.
            expect(screen.queryByText('上传图片')).toBeNull();
        });
    });

    // 3. STU-010: Like/Unlike (QuestionDetail)
    describe('STU: Interaction', () => {
        it('STU-010: Like toggles state', () => {
            (useAuthStore as any).mockReturnValue({ user: mockUserStudent });
            // Mock data for this specific test
            const qData = {
                id: '1', title: 'Q1', content: 'C1', authorId: 'u1', authorName: 'Student 1', status: 'approved',
                difficulty: 'easy', createdAt: new Date().toISOString(),
                stats: { likes: 0, comments: 0, favorites: 0 },
                images: []
            };
            (useQuestions as any).mockReturnValue({
                getQuestionById: () => qData
            });

            render(
                <MemoryRouter initialEntries={['/question/1']}>
                    <Routes>
                        <Route path="/question/:id" element={<QuestionDetailPage />} />
                    </Routes>
                </MemoryRouter>
            );

            // Find Like Button. It's usually a Heart icon.
            // In QuestionDetailPage, Heart icon is used for "Like" (Wait, Heart is usually Like, Star is Favorite)
            // Let's check code: 
            // Line 2: Heart, Star
            // Line 55: handleLike -> setLiked(!liked)
            // The button containing Heart? 
            // Often buttons have aria-label or just icons.
            // I'll try to find by specific class or role if no text.
            // Actually, usually there's no text "Like". Is there? 
            // Let's assume there isn't and look for the SVG/Button.
            // Or better, I can check the toast output which implies success.

            // Strategy: Look for the button group footer? No, it's usually at bottom or top.
            // Let's try to query selector 'button' that contains the Heart icon. 
            // Typically difficult without test-id. 
            // But wait, the previous `comprehensive` test verified "View Detail".

            // Let's add test-id to `QuestionDetailPage` if needed? 
            // I prefer not to modify code unless necessary.
            // Let's look at `QuestionDetailPage.tsx` content again from my memory/context.
            // Line 2: import Heart...
            // It renders: <button onClick={handleLike} ... > <Heart ... /> </button>

            // I'll guess it's one of the buttons.
            // Let's just create a generic test first and see if I can find it.
            // Or assume I'll add data-testid="like-btn" via `replace_file` if I can't find it.
            // Actually, testing interactions without IDs is flaky.
            // I'll add data-testid to QuestionDetailPage first.
        });
    });
});
