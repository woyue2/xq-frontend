/**
 * [POS] src/pages/ParentQuestionPage.tsx
 *   所属：pages 层 | 角色：家长查看子女问题列表页，路由 `/parent/questions`，家长可见
 *   兄弟：StudentHistoryPage.tsx / HomePage.tsx
 *
 * [INPUT]
 *   - react                   → useEffect / useState
 *   - react-router-dom        → useParams / useNavigate
 *   - @tanstack/react-query   → useInfiniteQuery
 *   - @/services/api          → parentService
 *
 * [OUTPUT]
 *   - ParentQuestionPage（页面组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/pages/CLAUDE.md 的文件清单
 */
import { useEffect, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { QuestionList } from '@/components/QuestionList';
import { QuestionFilter } from '@/components/QuestionFilter';
import { parentService } from '@/services/parentService';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { ROUTES } from '@/config/app-constants';

export function ParentQuestionPage() {
  const { user } = useAuthStore();
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');

  useEffect(() => {
    if (!user) {
      navigate(ROUTES.login);
      return;
    }
    if (user.role !== 'parent') {
      toast.error('只有家长可以查看孩子问题');
      navigate(ROUTES.home);
    }
  }, [user, navigate]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['parent-questions', childId, selectedSubject, selectedTopic],
    queryFn: async ({ pageParam = 1 }) => {
      if (!childId) {
        throw new Error('Child ID is required');
      }
      const res = await parentService.getChildQuestions(childId, {
        page: pageParam,
        limit: 10,
        subject: selectedSubject,
        topic: selectedTopic,
      });
      return res.data.data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!childId && !!user && user.role === 'parent',
  });

  const allQuestions = data?.pages.flatMap((p) => p.items) || [];

  return (
    <div className="flex flex-col gap-4 pb-4 px-4 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold">孩子提问列表</h1>
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
        showDetailButton={true}
        onDetailClick={(id) => navigate(ROUTES.question(id))}
      />
    </div>
  );
}
