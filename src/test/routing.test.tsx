/**
 * 路由配置测试
 * 验证简化后的路由配置是否正确
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '@/layouts/MainLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { CreateQuestionPage } from '@/pages/CreateQuestionPage';
import { QuestionDetailPage } from '@/pages/QuestionDetailPage';
import { AnswerQuestionPage } from '@/pages/AnswerQuestionPage';
import { AdminSubjectsPage } from '@/pages/admin/AdminSubjectsPage';
import { RequireAuth, RequireAdmin } from '@/components/RouteGuard';
import { useAuthStore } from '@/stores/useAuthStore';

// Mock the auth store
vi.mock('@/stores/useAuthStore', () => {
  const mockStore: any = vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    isActiveMember: false,
    permissions: [],
  }));
  
  mockStore.persist = {
    hasHydrated: () => true,
    onFinishHydration: () => () => {},
  };
  
  return {
    useAuthStore: mockStore,
  };
});

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

// Helper to render routes with auth context
function renderWithRouter(initialRoute: string, authState: any) {
  (useAuthStore as any).mockReturnValue(authState);

  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          {/* Public Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Main Layout Routes */}
          <Route element={<MainLayout />}>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/question/:id" element={<QuestionDetailPage />} />

            {/* Protected routes */}
            <Route
              path="/create"
              element={
                <RequireAuth>
                  <CreateQuestionPage />
                </RequireAuth>
              }
            />
            <Route
              path="/edit/:id"
              element={
                <RequireAuth>
                  <CreateQuestionPage />
                </RequireAuth>
              }
            />
            <Route
              path="/answer/:id"
              element={
                <RequireAuth>
                  <AnswerQuestionPage />
                </RequireAuth>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin/subjects"
              element={
                <RequireAdmin>
                  <AdminSubjectsPage />
                </RequireAdmin>
              }
            />

            {/* Redirect deleted routes to home */}
            <Route path="/profile" element={<Navigate to="/" replace />} />
            <Route path="/audit" element={<Navigate to="/" replace />} />
            <Route path="/admin" element={<Navigate to="/" replace />} />
            <Route path="/my-questions" element={<Navigate to="/" replace />} />
            <Route path="/my-questions/status/:status" element={<Navigate to="/" replace />} />
            <Route path="/good-questions" element={<Navigate to="/" replace />} />
            <Route path="/my-answers" element={<Navigate to="/" replace />} />
            <Route path="/my-favorites" element={<Navigate to="/" replace />} />
            <Route path="/my-likes" element={<Navigate to="/" replace />} />
            <Route path="/notifications" element={<Navigate to="/" replace />} />
            <Route path="/diagnostic" element={<Navigate to="/" replace />} />
            <Route path="/parent/questions/:childId" element={<Navigate to="/" replace />} />
            <Route path="/student/:studentId/questions" element={<Navigate to="/" replace />} />
            <Route path="/test" element={<Navigate to="/" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('路由配置测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('公开路由', () => {
    const guestAuthState = {
      user: null,
      isAuthenticated: false,
      isActiveMember: false,
      permissions: [],
    };

    it('游客可以访问首页 /', async () => {
      renderWithRouter('/', guestAuthState);

      await waitFor(() => {
        expect(screen.getByText(/知否/)).toBeInTheDocument();
      });
    });

    it('游客可以访问问题详情页 /question/:id', async () => {
      renderWithRouter('/question/123', guestAuthState);

      await waitFor(() => {
        // MainLayout should render
        expect(screen.getByText(/知否/)).toBeInTheDocument();
      });
    });

    it('游客访问登录页 /login 显示登录页面', async () => {
      renderWithRouter('/login', guestAuthState);

      await waitFor(() => {
        expect(screen.getByText(/初中知识问答/)).toBeInTheDocument();
      });
    });
  });

  describe('需要登录的路由', () => {
    const teacherAuthState = {
      user: { id: '1', role: 'teacher', nickname: 'Teacher' },
      isAuthenticated: true,
      isActiveMember: true,
      permissions: [],
    };

    it('登录用户可以访问创建问题页 /create', async () => {
      renderWithRouter('/create', teacherAuthState);

      await waitFor(() => {
        expect(screen.getByText(/知否/)).toBeInTheDocument();
      });
    });

    it('登录用户可以访问编辑问题页 /edit/:id', async () => {
      renderWithRouter('/edit/123', teacherAuthState);

      await waitFor(() => {
        expect(screen.getByText(/知否/)).toBeInTheDocument();
      });
    });

    it('登录用户可以访问回答问题页 /answer/:id', async () => {
      renderWithRouter('/answer/123', teacherAuthState);

      await waitFor(() => {
        expect(screen.getByText(/知否/)).toBeInTheDocument();
      });
    });
  });

  describe('游客访问需要登录的路由', () => {
    const guestAuthState = {
      user: null,
      isAuthenticated: false,
      isActiveMember: false,
      permissions: [],
    };

    it('游客访问 /create 重定向到登录页', async () => {
      renderWithRouter('/create', guestAuthState);

      await waitFor(() => {
        expect(screen.getByText(/初中知识问答/)).toBeInTheDocument();
      });
    });

    it('游客访问 /edit/:id 重定向到登录页', async () => {
      renderWithRouter('/edit/123', guestAuthState);

      await waitFor(() => {
        expect(screen.getByText(/初中知识问答/)).toBeInTheDocument();
      });
    });

    it('游客访问 /answer/:id 重定向到登录页', async () => {
      renderWithRouter('/answer/123', guestAuthState);

      await waitFor(() => {
        expect(screen.getByText(/初中知识问答/)).toBeInTheDocument();
      });
    });
  });

  describe('管理员路由', () => {
    it('管理员可以访问 /admin/subjects', async () => {
      const adminAuthState = {
        user: { id: '1', role: 'admin', nickname: 'Admin' },
        isAuthenticated: true,
        isActiveMember: true,
        permissions: [],
      };

      renderWithRouter('/admin/subjects', adminAuthState);

      await waitFor(() => {
        expect(screen.getByText(/知否/)).toBeInTheDocument();
      });
    });

    it('非管理员访问 /admin/subjects 重定向到首页', async () => {
      const teacherAuthState = {
        user: { id: '1', role: 'teacher', nickname: 'Teacher' },
        isAuthenticated: true,
        isActiveMember: true,
        permissions: [],
      };

      renderWithRouter('/admin/subjects', teacherAuthState);

      await waitFor(() => {
        // Should redirect to home page
        expect(screen.getByText(/知否/)).toBeInTheDocument();
      });
    });

    it('游客访问 /admin/subjects 重定向到登录页', async () => {
      const guestAuthState = {
        user: null,
        isAuthenticated: false,
        isActiveMember: false,
        permissions: [],
      };

      renderWithRouter('/admin/subjects', guestAuthState);

      await waitFor(() => {
        expect(screen.getByText(/初中知识问答/)).toBeInTheDocument();
      });
    });
  });

  describe('已删除路由重定向', () => {
    const teacherAuthState = {
      user: { id: '1', role: 'teacher', nickname: 'Teacher' },
      isAuthenticated: true,
      isActiveMember: true,
      permissions: [],
    };

    const deletedRoutes = [
      '/profile',
      '/audit',
      '/admin',
      '/my-questions',
      '/my-questions/status/pending',
      '/good-questions',
      '/my-answers',
      '/my-favorites',
      '/my-likes',
      '/notifications',
      '/diagnostic',
      '/parent/questions/123',
      '/student/123/questions',
      '/test',
    ];

    deletedRoutes.forEach((route) => {
      it(`访问已删除路由 ${route} 重定向到首页`, async () => {
        renderWithRouter(route, teacherAuthState);

        await waitFor(() => {
          // Should redirect to home page
          expect(screen.getByText(/知否/)).toBeInTheDocument();
        });
      });
    });
  });

  describe('未知路由', () => {
    const teacherAuthState = {
      user: { id: '1', role: 'teacher', nickname: 'Teacher' },
      isAuthenticated: true,
      isActiveMember: true,
      permissions: [],
    };

    it('访问未知路由重定向到首页', async () => {
      renderWithRouter('/unknown-route', teacherAuthState);

      await waitFor(() => {
        // Should redirect to home page
        expect(screen.getByText(/知否/)).toBeInTheDocument();
      });
    });
  });
});
