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
import { Toaster } from '@/app/components/ui/sonner';

// Initialize QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  return (
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
            <Route path="/audit" element={<AuditPage />} />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        <Toaster position="top-center" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}