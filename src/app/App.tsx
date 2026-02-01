import { useEffect, useState } from 'react';
import { Toaster } from '@/app/components/ui/sonner';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { CreateQuestionPage } from '@/pages/CreateQuestionPage';
import { QuestionDetailPage } from '@/pages/QuestionDetailPage';
import { AnswerQuestionPage } from '@/pages/AnswerQuestionPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AuditPage } from '@/pages/AuditPage';
import { AdminManagementPage } from '@/pages/AdminManagementPage';
import { currentUser, restoreUser } from '@/lib/mock-data';

type PageType = 'login' | 'home' | 'create' | 'detail' | 'answer' | 'profile' | 'audit' | 'admin';

interface PageData {
  questionId?: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('login');
  const [pageData, setPageData] = useState<PageData>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // 尝试从本地存储恢复用户登录状态
    restoreUser();
    if (currentUser) {
      setIsLoggedIn(true);
      setCurrentPage('home');
    }
  }, []);

  const handleNavigate = (page: string, data?: any) => {
    setCurrentPage(page as PageType);
    if (data) {
      setPageData(data);
    }
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentPage('home');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage('login');
  };

  return (
    <div className="min-h-screen">
      {currentPage === 'login' && <LoginPage onLogin={handleLogin} />}
      {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
      {currentPage === 'create' && <CreateQuestionPage onNavigate={handleNavigate} />}
      {currentPage === 'detail' && pageData.questionId && (
        <QuestionDetailPage questionId={pageData.questionId} onNavigate={handleNavigate} />
      )}
      {currentPage === 'answer' && pageData.questionId && (
        <AnswerQuestionPage questionId={pageData.questionId} onNavigate={handleNavigate} />
      )}
      {currentPage === 'profile' && (
        <ProfilePage onNavigate={handleNavigate} onLogout={handleLogout} />
      )}
      {currentPage === 'audit' && (
        <AuditPage onNavigate={handleNavigate} />
      )}
      {currentPage === 'admin' && (
        <AdminManagementPage onNavigate={handleNavigate} />
      )}
      <Toaster position="top-center" />
    </div>
  );
}