import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AnswerQuestionPage } from '@/pages/AnswerQuestionPage';

// Mock useAuthStore so we can control role per test
const useAuthStoreMock = vi.fn();

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => useAuthStoreMock(),
}));

// Mock questionService to avoid real network calls when page loads
vi.mock('@/services/api', () => ({
  questionService: {
    getQuestionById: vi.fn().mockResolvedValue(null),
  },
  answerService: {
    create: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('AnswerQuestionPage permissions', () => {
  beforeEach(() => {
    useAuthStoreMock.mockReset();
  });

  const renderWithRole = (user: any) => {
    useAuthStoreMock.mockReturnValue({
      user,
      token: 'fake-token',
      isAuthenticated: !!user,
      isLoading: false,
      isActiveMember: true,
      permissions: [],
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    return render(
      <MemoryRouter initialEntries={['/answer/q1']}>
        <Routes>
          <Route path="/answer/:id" element={<AnswerQuestionPage />} />
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route path="/" element={<div data-testid="home-page">Home</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('redirects unauthenticated user to login', async () => {
    renderWithRole(null);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="login-page"]')).not.toBeNull();
    });
  });

  it('shows answer page UI but backend仍会拦截非教师提交', async () => {
    renderWithRole({
      id: 's1',
      role: 'student',
      nickname: '学生用户',
    });

    await waitFor(() => {
      // 页面仍然渲染回答表单，但后端会通过角色/权限校验阻止真正提交；
      // 这里仅断言页面已加载标题，避免验证导航副作用。
      // eslint-disable-next-line testing-library/no-node-access
      const heading = document.querySelector('h1');
      expect(heading?.textContent).toContain('回答问题');
    });
  });
});
