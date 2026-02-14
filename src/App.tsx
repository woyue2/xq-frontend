import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { CreateQuestionPage } from '@/pages/CreateQuestionPage';
import { QuestionDetailPage } from '@/pages/QuestionDetailPage';
import { AnswerQuestionPage } from '@/pages/AnswerQuestionPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AuditPage } from '@/pages/AuditPage';
import { AdminManagementPage } from '@/pages/AdminManagementPage';
import { MyQuestionsPage } from '@/pages/MyQuestionsPage';
import { StatusListPage } from '@/pages/StatusListPage';
import { GoodQuestionsPage } from '@/pages/GoodQuestionsPage';
import { MyAnswersPage } from '@/pages/MyAnswersPage';
import { MyFavoritesPage } from '@/pages/MyFavoritesPage';
import { MyLikesPage } from '@/pages/MyLikesPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { DiagnosticPage } from '@/pages/DiagnosticPage';
import { ParentQuestionPage } from '@/pages/ParentQuestionPage';
import { StudentHistoryPage } from '@/pages/StudentHistoryPage';
import { TestApiPage } from '@/pages/TestApiPage';
import { PrintQuestionSelectPage } from '@/pages/PrintQuestionSelectPage';
import { PrintQuestionViewPage } from '@/pages/PrintQuestionViewPage';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from '@/stores/useAuthStore';
import { userService } from '@/services/api';

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
  const { isAuthenticated, token, updateUser } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    let cancelled = false;

    // 修改原因：应用启动时同步 /users/me（含 classHours），避免登录快照与服务端课时状态不一致。
    userService
      .getUserInfo()
      .then((latestUser) => {
        if (!cancelled) {
          updateUser(latestUser);
        }
      })
      .catch(() => {
        // ⚠️ 不确定因素：网络抖动或后端短暂异常时可能拉取失败；此处保持静默降级，不阻断页面渲染。
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, updateUser]);

  return (
    <ErrorBoundary fallback={<div className="flex items-center justify-center min-h-screen text-red-500">应用加载失败，请刷新页面</div>}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* 修改原因：打印流程使用独立页面，避免主布局头尾在打印时进入纸面。 */}
            <Route path="/print/questions/select" element={<PrintQuestionSelectPage />} />
            <Route path="/print/questions/view" element={<PrintQuestionViewPage />} />

            {/* Protected Routes (Main Layout) */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/create" element={<CreateQuestionPage />} />
              <Route path="/question/:id" element={<QuestionDetailPage />} />
              <Route path="/answer/:id" element={<AnswerQuestionPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/parent/questions/:childId" element={<ParentQuestionPage />} />
              <Route path="/student/:studentId/questions" element={<StudentHistoryPage />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/admin" element={<AdminManagementPage />} />
              <Route path="/my-questions" element={<MyQuestionsPage />} />
              <Route path="/my-questions/status/:status" element={<StatusListPage />} />
              <Route path="/good-questions" element={<GoodQuestionsPage />} />
              {/* 修改原因：老师“我的回答”拆分为两个页面，并保留旧路由兼容。 */}
              <Route path="/my-answers" element={<Navigate to="/my-answers/pending" replace />} />
              <Route path="/my-answers/pending" element={<MyAnswersPage view="pending" />} />
              <Route path="/my-answers/answered" element={<MyAnswersPage view="answered" />} />
              <Route path="/my-favorites" element={<MyFavoritesPage />} />
              <Route path="/my-likes" element={<MyLikesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/diagnostic" element={<DiagnosticPage />} />
              <Route path="/test" element={<TestApiPage />} />
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          <Toaster
            position="bottom-center"
            richColors
            duration={2000}
            offset={56}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
