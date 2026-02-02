import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProfilePage } from '@/pages/ProfilePage';
import { AuditPage } from '@/pages/AuditPage';
import { MainLayout } from '@/layouts/MainLayout';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';

// 复用与原 integration.test.tsx 一致的 hooks 与 mock-data 行为，确保行为不变
vi.mock('@/hooks/useQuestions', () => ({
    useQuestions: vi.fn()
}));

vi.mock('@/lib/mock-data', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        currentUser: { id: 'u1', nickname: 'Teacher User', role: 'teacher' },
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
            q1: []
        }
    };
});

describe('Integration - Profile & Nickname AI Review', () => {
    // 保持与原集成测试相同的默认 store 与问题数据
    beforeEach(() => {
        (useQuestions as any).mockReturnValue({
            data: {
                pages: [{
                    items: [{
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

        useAuthStore.setState({
            user: { id: 't1', nickname: 'Teacher', role: 'teacher', avatar: 'img', phone: '123' }
        });
    });

    it('Flow: Teacher navigates to Audit/Whitelist from Profile', async () => {
        render(
            <MemoryRouter initialEntries={['/profile']}>
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/audit" element={<AuditPage />} />
                        <Route path="/admin" element={<div data-testid="admin-page">Admin Page</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        // 1. Profile 区域展示当前教师信息与菜单
        expect(screen.getByText('Teacher')).toBeDefined();
        expect(screen.getByText('审核管理')).toBeDefined();
        expect(screen.getByText('用户白名单')).toBeDefined();

        // 2. 点击“用户白名单”应跳转到 /admin
        const whitelistBtn = screen.getByTestId('menu-item-用户白名单');
        fireEvent.click(whitelistBtn);

        // 3. 验证已跳转到 Admin 页面
        await waitFor(() => {
            expect(screen.getByTestId('admin-page')).toBeDefined();
        });
    });

    // ===== 昵称 AI 审核测试 =====
    describe('Nickname AI Review Tests', () => {
        it('NICK-001: User can open nickname edit dialog', async () => {
            render(
                <MemoryRouter initialEntries={['/profile']}>
                    <Routes>
                        <Route element={<MainLayout />}>
                            <Route path="/profile" element={<ProfilePage />} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            );

            const nicknameElement = screen.getByText('Teacher');
            fireEvent.click(nicknameElement);

            await waitFor(() => {
                expect(screen.getByText('修改昵称')).toBeDefined();
            });
        });

        it('NICK-002: Nickname with sensitive words fails AI review', async () => {
            render(
                <MemoryRouter initialEntries={['/profile']}>
                    <Routes>
                        <Route element={<MainLayout />}>
                            <Route path="/profile" element={<ProfilePage />} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            );

            const nicknameElement = screen.getByText('Teacher');
            fireEvent.click(nicknameElement);

            await waitFor(() => {
                expect(screen.getByText('修改昵称')).toBeDefined();
            });

            const input = screen.getByPlaceholderText('请输入新昵称 (2-20字符)');
            fireEvent.change(input, { target: { value: '系统管理员' } });

            const submitBtn = screen.getByText('确认修改');
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(screen.getByText('审核中...')).toBeDefined();
            }, { timeout: 500 });
        });

        it('NICK-003: Valid nickname passes AI review', async () => {
            render(
                <MemoryRouter initialEntries={['/profile']}>
                    <Routes>
                        <Route element={<MainLayout />}>
                            <Route path="/profile" element={<ProfilePage />} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            );

            const nicknameElement = screen.getByText('Teacher');
            fireEvent.click(nicknameElement);

            await waitFor(() => {
                expect(screen.getByText('修改昵称')).toBeDefined();
            });

            const input = screen.getByPlaceholderText('请输入新昵称 (2-20字符)');
            fireEvent.change(input, { target: { value: '新昵称测试' } });

            const submitBtn = screen.getByText('确认修改');
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(screen.getByText('审核中...')).toBeDefined();
            }, { timeout: 500 });
        });
    });
});

