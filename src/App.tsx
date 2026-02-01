import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '@/layouts/MainLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { CreateQuestionPage } from '@/pages/CreateQuestionPage';
import { QuestionDetailPage } from '@/pages/QuestionDetailPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AuditPage } from '@/pages/AuditPage';
import { AdminManagementPage } from '@/pages/AdminManagementPage';
import { MyQuestionsPage } from '@/pages/MyQuestionsPage';
import { StatusListPage } from '@/pages/StatusListPage';
import { GoodQuestionsPage } from '@/pages/GoodQuestionsPage';
import { MyAnswersPage } from '@/pages/MyAnswersPage';
import { MyFavoritesPage } from '@/pages/MyFavoritesPage';
import { MyLikesPage } from '@/pages/MyLikesPage';
import { DiagnosticPage } from '@/pages/DiagnosticPage';
import { ParentQuestionPage } from '@/pages/ParentQuestionPage';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Toaster } from "@/components/ui/sonner";

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
    <ErrorBoundary fallback={<div className="flex items-center justify-center min-h-screen text-red-500">应用加载失败，请刷新页面</div>}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* Protected Routes (Main Layout) */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/create" element={<CreateQuestionPage />} />
              <Route path="/question/:id" element={<QuestionDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/parent/questions/:childId" element={<ParentQuestionPage />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/admin" element={<AdminManagementPage />} />
              <Route path="/my-questions" element={<MyQuestionsPage />} />
              <Route path="/my-questions/status/:status" element={<StatusListPage />} />
              <Route path="/good-questions" element={<GoodQuestionsPage />} />
              <Route path="/my-answers" element={<MyAnswersPage />} />
              <Route path="/my-favorites" element={<MyFavoritesPage />} />
              <Route path="/my-likes" element={<MyLikesPage />} />
              <Route path="/diagnostic" element={<DiagnosticPage />} />
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          <Toaster position="top-center" />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
