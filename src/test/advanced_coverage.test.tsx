import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';

import { AdminManagementPage } from '@/pages/AdminManagementPage';
import { CreateQuestionPage } from '@/pages/CreateQuestionPage';
import { LoginPage } from '@/pages/LoginPage';
import { TestApiPage } from '@/pages/TestApiPage';
import { adminService } from '@/services/api';

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
            login: vi.fn(() =>
                Promise.resolve({
                    data: { data: { token: 'mock', user: { id: 'u1' } } }
                })
            ),
            register: vi.fn(() =>
                Promise.resolve({ user: { id: 'u1' }, token: 'mock' })
            ),
        },
        questionService: {
            getQuestions: vi.fn(),
            getQuestionById: vi.fn(),
            createQuestion: vi.fn(() => Promise.resolve({ id: 'q-mock' })),
            uploadImage: vi.fn(() =>
                Promise.resolve({ imageUrl: 'https://example.com/mock.jpg' })
            ),
        },
        answerService: {
            listByQuestion: vi.fn(() => Promise.resolve({ list: [] })),
        },
        commentService: {
            listByQuestion: vi.fn(() => Promise.resolve({ list: [] })),
            create: vi.fn(() =>
                Promise.resolve({
                    id: 'c1',
                    questionId: '1',
                    questionTitle: 'Q1',
                    content: 'mock comment',
                    image: undefined,
                    authorId: 'u1',
                    authorName: 'Student 1',
                    authorAvatar: undefined,
                    status: 'approved',
                    aiResult: '无违规',
                    createdAt: new Date().toISOString()
                })
            )
        },
        interactionService: {
            like: vi.fn(() => Promise.resolve({ liked: true, likesCount: 1 })),
            favorite: vi.fn(() =>
                Promise.resolve({ favorited: true, favoritesCount: 1 })
            ),
        },
        behaviorService: {
            log: vi.fn(() => Promise.resolve({ logId: 'mock-log' })),
            batchLog: vi.fn(() =>
                Promise.resolve({ received: 0, processed: 0, failed: 0 })
            ),
        },
        notificationService: {
            getNotifications: vi.fn(),
            markAsRead: vi.fn(),
            getUnreadCount: vi.fn(),
        },
        configService: {
            getQuestionDimensions: vi.fn(() => Promise.resolve([])),
        },
        adminService: {
            getWhitelist: vi.fn(),
            addToWhitelist: vi.fn(),
            removeFromWhitelist: vi.fn(),
            updateValidity: vi.fn(),
            getQuestionDimensions: vi.fn(() => Promise.resolve([])),
            updateQuestionDimension: vi.fn(() => Promise.resolve()),
            createQuestionDimensionOption: vi.fn(() => Promise.resolve()),
            updateQuestionDimensionOption: vi.fn(() => Promise.resolve()),
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
            data: { pages: [{ list: [] }] },
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

        it('WL-010: Registered student whitelist row shows history entry and navigates to student history page', async () => {
            const mockStudentWhitelist = {
                id: 'wl-stu-1',
                userId: 'stu-1',
                phone: '13700000000',
                name: '学生A',
                role: 'student',
                isRegistered: true,
                createdAt: '2024-01-01 10:00:00',
                registeredAt: '2024-01-01 10:10:00',
                validUntil: '2099-12-31T00:00:00.000Z'
            };

            (adminService.getWhitelist as any).mockResolvedValue({
                items: [mockStudentWhitelist],
                pagination: {
                    page: 1,
                    pageSize: 20,
                    total: 1,
                    totalPages: 1
                },
                statistics: {
                    total: 1,
                    registered: 1,
                    pending: 0,
                    students: 1,
                    parents: 0,
                    teachers: 0
                }
            });

            (useAuthStore as any).mockReturnValue({ user: mockUserTeacher });

            render(<MemoryRouter><AdminManagementPage /></MemoryRouter>);

            // 等待白名单列表渲染出学生A
            await waitFor(() => {
                expect(screen.getByText('学生A')).toBeDefined();
            });

            const historyBtn = screen.getByTestId('whitelist-student-history');
            expect(historyBtn).toBeDefined();

            // 点击后应导航到学生历史提问页
            fireEvent.click(historyBtn);

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/student/stu-1/questions');
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
            const submitBtn = screen.getByTestId('create-question-submit-top');
            expect(submitBtn).toBeDisabled();
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

        it('WL-000: Unauthenticated user is redirected away from admin page', async () => {
            // 未登录用户访问 /admin
            (useAuthStore as any).mockReturnValue({ user: null });

            render(<MemoryRouter><AdminManagementPage /></MemoryRouter>);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('请先登录');
                expect(mockNavigate).toHaveBeenCalledWith('/login');
            });
        });

        it('WL-000b: Non-teacher user cannot access admin page', async () => {
            // 学生或家长访问 /admin
            (useAuthStore as any).mockReturnValue({ user: mockUserStudent });

            render(<MemoryRouter><AdminManagementPage /></MemoryRouter>);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('只有老师可以访问管理后台');
                expect(mockNavigate).toHaveBeenCalledWith('/profile');
            });
        });
    });

    // 3. TEST: TestApiPage access control
    describe('TEST: TestApiPage Access Control', () => {
        it('TEST-001: Unauthenticated user is redirected to login', async () => {
            (useAuthStore as any).mockReturnValue({ user: null });

            render(
                <MemoryRouter>
                    <TestApiPage />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/login');
            });
        });

        it('TEST-002: Non-teacher user cannot access TestApiPage', async () => {
            (useAuthStore as any).mockReturnValue({ user: mockUserStudent });

            render(
                <MemoryRouter>
                    <TestApiPage />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('只有老师可以访问测试页面');
                expect(mockNavigate).toHaveBeenCalledWith('/');
            });
        });

        it('TEST-003: Teacher can see TestApiPage content', async () => {
            (useAuthStore as any).mockReturnValue({ user: mockUserTeacher });

            render(
                <MemoryRouter>
                    <TestApiPage />
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(
                    screen.getByText('系统配置中心（教师专用）')
                ).toBeDefined();
            });
        });
    });

    // 4. DIM: Question Dimension Config (Admin UI glue only)
    describe('DIM: Question Dimension Config', () => {
        it('DIM-001: Admin can see dimension config card', async () => {
            (useAuthStore as any).mockReturnValue({ user: mockUserTeacher });
            render(<MemoryRouter><AdminManagementPage /></MemoryRouter>);

            expect(
                screen.getByText('题目维度配置（解题方法/办法）')
            ).toBeDefined();
        });

        it('DIM-002: Refresh button triggers adminService.getQuestionDimensions', async () => {
            (useAuthStore as any).mockReturnValue({ user: mockUserTeacher });
            const spy = vi.spyOn(adminService, 'getQuestionDimensions');

            render(<MemoryRouter><AdminManagementPage /></MemoryRouter>);

            const refreshBtn = screen.getByText('刷新配置');
            fireEvent.click(refreshBtn);

            await waitFor(() => {
                expect(spy).toHaveBeenCalled();
            });
        });
    });
});
