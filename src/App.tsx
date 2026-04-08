/**
 * [POS] src/App.tsx
 *   所属：入口层 | 角色：路由根组件，定义全局路由树 + Provider 组合
 *   兄弟：main.tsx
 *
 * [INPUT]
 *   - react-router-dom       → BrowserRouter / Routes / Route / Navigate
 *   - @tanstack/react-query  → QueryClient / QueryClientProvider
 *   - @/layouts/*            → MainLayout / AuthLayout
 *   - @/pages/*              → 简化后的页面组件
 *   - @/components/RouteGuard → RequireAuth / RequireAdmin
 *
 * [OUTPUT]
 *   - App（路由根组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/CLAUDE.md
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SWRConfig } from 'swr';
import { swrConfig } from '@/lib/swr-config';
import { MainLayout } from '@/layouts/MainLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { CreateQuestionPage } from '@/pages/CreateQuestionPage';
import { QuestionDetailPage } from '@/pages/QuestionDetailPage';
import { AnswerQuestionPage } from '@/pages/AnswerQuestionPage';
import { CommentQuestionPage } from '@/pages/CommentQuestionPage';
import { AdminSubjectsPage } from '@/pages/admin/AdminSubjectsPage';
import { RequireAuth, RequireAdmin } from '@/components/RouteGuard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Toaster } from '@/components/ui/sonner';

// Initialize QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export function App() {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center min-h-screen text-red-500">
          应用加载失败，请刷新页面
        </div>
      }
    >
      <QueryClientProvider client={queryClient}>
        <SWRConfig value={swrConfig}>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>

              {/* Main Layout Routes */}
              <Route element={<MainLayout />}>
                {/* Public routes - accessible to guests */}
                <Route path="/" element={<HomePage />} />
                <Route path="/question/:id" element={<QuestionDetailPage />} />

                {/* Protected routes - require authentication */}
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
                <Route
                  path="/comment/:id"
                  element={
                    <RequireAuth>
                      <CommentQuestionPage />
                    </RequireAuth>
                  }
                />

                {/* Admin routes - require admin role */}
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

                {/* Fallback - catch all other routes */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
            <Toaster position="bottom-center" richColors duration={2000} offset={56} />
          </BrowserRouter>
        </SWRConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
