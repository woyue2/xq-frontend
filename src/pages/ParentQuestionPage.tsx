import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft } from '@phosphor-icons/react';
import { QuestionList } from '@/components/QuestionList';
import { QuestionFilter } from '@/components/QuestionFilter';
import { parentService } from '@/services/parentService';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';

export function ParentQuestionPage() {
  const { user } = useAuthStore();
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'parent') {
      toast.error('该功能仅对家长开放');
      navigate('/');
    }
  }, [user, navigate]);

   const {
     data,
     fetchNextPage,
     hasNextPage,
     isFetchingNextPage,
     isLoading
   } = useInfiniteQuery({
     queryKey: ['parent-questions', childId, selectedSubject, selectedTopic],
     queryFn: async ({ pageParam = 1 }) => {
       if (!childId) {
         throw new Error('Child ID is required');
       }
       const res = await parentService.getChildQuestions(childId, {
         page: pageParam,
         // 修改原因：后端接口使用 pageSize 语义；与其他列表页参数保持一致，避免筛选链路歧义。
         pageSize: 10,
         subject: selectedSubject,
         topic: selectedTopic
       });
       return res.data.data;
     },
     getNextPageParam: (lastPage) => {
       const { page, totalPages } = lastPage?.pagination || {};
       if (page === undefined || totalPages === undefined) return undefined;
       return page < totalPages ? page + 1 : undefined;
     },
     initialPageParam: 1,
     enabled: !!childId && !!user && user.role === 'parent'
   });

   const allQuestions = (data?.pages.flatMap(p => p.list) || []).filter(q => q && q.id);

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
        onDetailClick={(id) => navigate(`/question/${id}`)}
      />
    </div>
  );
}
