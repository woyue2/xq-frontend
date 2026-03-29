/**
 * [POS] src/pages/StudentHistoryPage.tsx
 *   所属：pages 层 | 角色：学生历史提问记录页，路由 `/student/:id/questions`，教师可见
 *   兄弟：AuditPage.tsx / AdminManagementPage.tsx
 *
 * [INPUT]
 *   - react              → useEffect / useState
 *   - react-router-dom   → useParams / useNavigate
 *   - lucide-react       → ArrowLeft
 *
 * [OUTPUT]
 *   - StudentHistoryPage（页面组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/pages/CLAUDE.md 的文件清单
 */
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';
import { QuestionFilter } from '@/components/QuestionFilter';
import { QuestionList } from '@/components/QuestionList';
import { toast } from 'sonner';
import { ROUTES } from '@/config/app-constants';

export function StudentHistoryPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  useEffect(() => {
    if (!user) {
      toast.error('请先登录');
      navigate(ROUTES.login);
    }
  }, [user, navigate]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useQuestions({
    authorId: studentId,
    subject: selectedSubject,
    topic: selectedTopic,
  });

  const allQuestions = data?.pages.flatMap((p) => p.items) || [];

  return (
    <div className="flex flex-col gap-4 pb-4 px-4 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold">学生历史提问</h1>
      </div>

      <QuestionFilter
        selectedSubject={selectedSubject}
        setSelectedSubject={setSelectedSubject}
        selectedTopic={selectedTopic}
        setSelectedTopic={setSelectedTopic}
      />

      <QuestionList
        questions={allQuestions}
        isLoading={isLoading}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </div>
  );
}
