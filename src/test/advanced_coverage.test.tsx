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
vi.mock('@/services/api', () => {
    const fn = () => Promise.resolve();
    return {
        authService: {
            sendCode: vi.fn(fn),
            login: vi.fn(() => Promise.resolve({ data: { data: { token: 'mock', user: { id: 'u1' } } } })),
            register: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, token: 'mock' })),
        },
        questionService: {
            getQuestions: vi.fn(),
            getQuestionById: vi.fn(),
            createQuestion: vi.fn(() => Promise.resolve({ id: 'q-mock' })),
            uploadImage: vi.fn(() => Promise.resolve({ imageUrl: 'https://example.com/mock.jpg' })),
        },
        answerService: {
            listByQuestion: vi.fn(() => Promise.resolve({ list: [] })),
        },
        interactionService: {
            like: vi.fn(() => Promise.resolve({ liked: true, likesCount: 1 })),
            favorite: vi.fn(() => Promise.resolve({ favorited: true, favoritesCount: 1 })),
        },
        behaviorService: {
            log: vi.fn(() => Promise.resolve({ logId: 'mock-log' })),
            batchLog: vi.fn(() => Promise.resolve({ received: 0, processed: 0, failed: 0 })),
        },
        notificationService: {
            getNotifications: vi.fn(),
            markAsRead: vi.fn(),
            getUnreadCount: vi.fn(),
        },
        adminService: {
            getWhitelist: vi.fn(),
            addToWhitelist: vi.fn(),
            removeFromWhitelist: vi.fn(),
            updateValidity: vi.fn(),
        },
    };
});

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
            render(<MemoryRouter><AdminManagementPage /></MemoryRouter>);

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

        it('STU-007: Max 3 Images', async () => {
            (useAuthStore as any).mockReturnValue({ user: mockUserStudent });
            render(<MemoryRouter><CreateQuestionPage /></MemoryRouter>);

            const uploadBtn = screen.getByText('上传图片');
            const fileInput = screen.getByTestId('create-question-image-input') as HTMLInputElement;

            const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });

            // 通过点击按钮触发文件选择，再模拟选择文件三次
            fireEvent.click(uploadBtn);
            fireEvent.change(fileInput, { target: { files: [file] } });

            fireEvent.click(uploadBtn);
            fireEvent.change(fileInput, { target: { files: [file] } });

            fireEvent.click(uploadBtn);
            fireEvent.change(fileInput, { target: { files: [file] } });

            await waitFor(() => {
                expect(screen.queryByText('上传图片')).toBeNull();
            });
        });
    });

    // 3. STU-010: Like/Unlike (QuestionDetail)
    describe('STU: Interaction', () => {
        it('STU-010: Like toggles state', async () => {
            (useAuthStore as any).mockReturnValue({ user: mockUserStudent });
            // Mock data for this specific test
            const qData = {
                id: '1',
                title: 'Q1',
                content: 'C1',
                authorId: 'u1',
                authorName: 'Student 1',
                status: 'approved',
                difficulty: 'easy',
                createdAt: new Date().toISOString(),
                stats: { likes: 0, comments: 0, favorites: 0 },
                images: []
            };
            (useQuestions as any).mockReturnValue({
                getQuestionById: () => qData,
                data: { pages: [] },
                isLoading: false,
                fetchNextPage: vi.fn(),
                hasNextPage: false
            });

            render(
                <MemoryRouter initialEntries={['/question/1']}>
                    <Routes>
                        <Route path="/question/:id" element={<QuestionDetailPage />} />
                    </Routes>
                </MemoryRouter>
            );

            // 使用 QuestionDetailPage 上暴露的 data-testid 精确选择点赞按钮
            const likeButton = await screen.findByTestId('like-btn');

            // 首次点击：应触发“点赞成功”类提示
            fireEvent.click(likeButton);
            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith(
                    expect.stringContaining('点赞成功')
                );
            });

            (toast.success as vi.Mock).mockClear();

            // 再次点击：应触发“已取消点赞”类提示
            fireEvent.click(likeButton);
            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith(
                    expect.stringContaining('已取消点赞')
                );
            });
        });
    });
});
