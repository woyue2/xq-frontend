import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminManagementPage } from '@/pages/AdminManagementPage';

// Mock useAuthStore so we can control current user role
const useAuthStoreMock = vi.fn();

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => useAuthStoreMock(),
}));

// Mock adminService to avoid real network calls from AdminManagementPage
vi.mock('@/services/api', () => ({
  adminService: {
    getWhitelist: vi.fn().mockResolvedValue({ items: [] }),
    addToWhitelist: vi.fn(),
    removeFromWhitelist: vi.fn(),
    updateValidity: vi.fn(),
    getQuestionDimensions: vi.fn().mockResolvedValue([]),
    updateQuestionDimension: vi.fn(),
    createQuestionDimensionOption: vi.fn().mockResolvedValue({
      id: 'opt-1',
      value: 'test',
      label: '测试选项',
      order: 10,
      enabled: true,
    }),
    updateQuestionDimensionOption: vi.fn(),
  },
}));

// Mock sonner toast to avoid noisy console output in tests
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('AdminManagementPage permissions guard', () => {
  beforeEach(() => {
    useAuthStoreMock.mockReset();
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
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminManagementPage />} />
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route path="/" element={<div data-testid="home-page">Home</div>} />
          <Route path="/profile" element={<div data-testid="profile-page">Profile</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('redirects unauthenticated user to login page', async () => {
    renderWithUser(null);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="login-page"]')).not.toBeNull();
    });
  });

  it('redirects non-teacher user away from admin page', async () => {
    renderWithUser({
      id: 's1',
      role: 'student',
      nickname: '学生用户',
    });

    await waitFor(() => {
      // 非教师用户会被导航离开 /admin 页面
      expect(document.querySelector('[data-testid="profile-page"]') || document.querySelector('[data-testid="home-page"]')).not.toBeNull();
    });
  });
});

