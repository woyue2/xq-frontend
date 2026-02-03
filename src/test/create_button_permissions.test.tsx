import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';

// Mock useAuthStore so we can control user/permission state per test
const useAuthStoreMock = vi.fn();

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => useAuthStoreMock(),
}));

// Mock notificationService to avoid real network calls in MainLayout header
vi.mock('@/services/api', () => ({
  notificationService: {
    getUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 0 }),
  },
}));

describe('MainLayout create button permissions', () => {
  beforeEach(() => {
    useAuthStoreMock.mockReset();
  });

  const renderWithUser = (user: any, isActiveMember: boolean | undefined = true) => {
    useAuthStoreMock.mockReturnValue({
      user,
      token: 'fake-token',
      isAuthenticated: !!user,
      isLoading: false,
      isActiveMember,
      permissions: [],
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    return render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<div>Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  it('hides create button for parent role', () => {
    renderWithUser({ id: 'p1', role: 'parent', nickname: '家长用户' }, false);

    const createBtn = screen.queryByTestId('nav-create');
    expect(createBtn).toBeNull();
  });

  it('hides create button for expired student', () => {
    renderWithUser(
      {
        id: 's1',
        role: 'student',
        nickname: '过期学生',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      false
    );

    const createBtn = screen.queryByTestId('nav-create');
    expect(createBtn).toBeNull();
  });

  it('shows create button for active student', () => {
    renderWithUser(
      {
        id: 's2',
        role: 'student',
        nickname: '正常学生',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      true
    );

    const createBtn = screen.queryByTestId('nav-create');
    expect(createBtn).not.toBeNull();
  });
});

