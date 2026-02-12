import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MyLikesPage } from '@/pages/MyLikesPage';
import { MyFavoritesPage } from '@/pages/MyFavoritesPage';

// Mock useAuthStore so we can control login状态
const useAuthStoreMock = vi.fn();

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => useAuthStoreMock(),
}));

// Mock profileService 以避免真实网络请求
const getMyLikesMock = vi.fn();
const getMyFavoritesMock = vi.fn();

vi.mock('@/services/api', () => ({
  profileService: {
    getMyLikes: (...args: any[]) => getMyLikesMock(...args),
    getMyFavorites: (...args: any[]) => getMyFavoritesMock(...args),
  },
}));

describe('MyLikesPage & MyFavoritesPage permissions', () => {
  beforeEach(() => {
    useAuthStoreMock.mockReset();
    getMyLikesMock.mockReset();
    getMyFavoritesMock.mockReset();
  });

  const renderLikesWithUser = (user: any) => {
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
      <MemoryRouter initialEntries={['/my-likes']}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route path="/my-likes" element={<MyLikesPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  const renderFavoritesWithUser = (user: any) => {
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
      <MemoryRouter initialEntries={['/my-favorites']}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route path="/my-favorites" element={<MyFavoritesPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('redirects unauthenticated user to login on MyLikesPage', async () => {
    renderLikesWithUser(null);

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    expect(getMyLikesMock).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated user to login on MyFavoritesPage', async () => {
    renderFavoritesWithUser(null);

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    expect(getMyFavoritesMock).not.toHaveBeenCalled();
  });

  it('loads likes list for authenticated user', async () => {
    getMyLikesMock.mockResolvedValue({
      list: [
        {
          id: 'q1',
          title: '已点赞的问题',
          content: '内容',
          authorName: '作者',
          likes: 1,
          favorites: 0,
          answers: 0,
          createdAt: new Date().toISOString(),
          likedAt: new Date().toISOString(),
        },
      ],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
      },
    });

    renderLikesWithUser({
      id: 'u1',
      role: 'student',
      nickname: '学生',
    });

    await waitFor(() => {
      expect(screen.getByText('点赞的问题')).toBeInTheDocument();
      expect(screen.getByText('已点赞的问题')).toBeInTheDocument();
    });
  });

  it('loads favorites list for authenticated user', async () => {
    getMyFavoritesMock.mockResolvedValue({
      list: [
        {
          id: 'q2',
          title: '已收藏的问题',
          content: '内容',
          authorName: '作者',
          likes: 0,
          favorites: 1,
          answers: 0,
          createdAt: new Date().toISOString(),
          favoritedAt: new Date().toISOString(),
        },
      ],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
      },
    });

    renderFavoritesWithUser({
      id: 'u1',
      role: 'student',
      nickname: '学生',
    });

    await waitFor(() => {
      expect(screen.getByText('收藏的问题')).toBeInTheDocument();
      expect(screen.getByText('已收藏的问题')).toBeInTheDocument();
    });
  });
});

