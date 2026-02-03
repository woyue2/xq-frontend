import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MyAnswersPage } from '@/pages/MyAnswersPage';

// Mock useAuthStore 以便精确控制当前登录用户
const useAuthStoreMock = vi.fn();

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => useAuthStoreMock(),
}));

// Mock profileService，避免真实网络请求
const getMyAnswersMock = vi.fn();

vi.mock('@/services/api', () => ({
  profileService: {
    getMyAnswers: (...args: any[]) => getMyAnswersMock(...args),
  },
}));

// Mock sonner toast，便于断言错误提示
const toastErrorMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    error: (...args: any[]) => toastErrorMock(...args),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('MyAnswersPage permissions & boundaries', () => {
  beforeEach(() => {
    useAuthStoreMock.mockReset();
    getMyAnswersMock.mockReset();
    toastErrorMock.mockReset();
  });

  const renderWithUser = (user: any) => {
    useAuthStoreMock.mockReturnValue({
      user,
      token: user ? 'fake-token' : null,
      isAuthenticated: !!user,
      isLoading: false,
      isActiveMember: true,
      permissions: [],
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    return render(
      <MemoryRouter initialEntries={['/my-answers']}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route path="/profile" element={<div data-testid="profile-page">Profile</div>} />
          <Route path="/my-answers" element={<MyAnswersPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('redirects unauthenticated user to login and does not call API', async () => {
    renderWithUser(null);

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    expect(getMyAnswersMock).not.toHaveBeenCalled();
  });

  it('blocks non-teacher users and navigates back to profile', async () => {
    renderWithUser({
      id: 'u-student',
      role: 'student',
      nickname: '学生用户',
    });

    await waitFor(() => {
      expect(screen.getByTestId('profile-page')).toBeInTheDocument();
    });

    expect(getMyAnswersMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith('只有老师可以查看我的回答');
  });

  it('loads answers list for teacher user', async () => {
    const now = new Date().toISOString();
    getMyAnswersMock.mockResolvedValue({
      items: [
        {
          id: 'a1',
          questionId: 'q1',
          questionTitle: '示例问题标题',
          content: '示例回答内容',
          likes: 3,
          status: 'approved',
          createdAt: now,
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    renderWithUser({
      id: 'u-teacher',
      role: 'teacher',
      nickname: '老师用户',
    });

    await waitFor(() => {
      expect(screen.getByText('我的回答')).toBeInTheDocument();
      expect(screen.getByText('示例问题标题')).toBeInTheDocument();
      expect(screen.getByText('示例回答内容')).toBeInTheDocument();
    });

    expect(getMyAnswersMock).toHaveBeenCalled();
  });
});

