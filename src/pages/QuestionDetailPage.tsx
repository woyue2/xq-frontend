/**
 * [POS] src/pages/QuestionDetailPage.tsx
 *   所属：pages 层 | 角色：问题详情页，路由 `/question/:id`
 *   兄弟：HomePage.tsx / CreateQuestionPage.tsx / AnswerQuestionPage.tsx
 *
 * [INPUT]
 *   - react                          → useState
 *   - react-router-dom               → useParams / useNavigate
 *   - swr                            → useSWR
 *   - @/lib/swr-config               → fetcher
 *   - @/components/QuestionDetail    → QuestionDetail
 *   - @/types/dto                    → QuestionDTO / AnswerDTO / CommentDTO
 *
 * [OUTPUT]
 *   - QuestionDetailPage（页面组件，带 SWR 缓存）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/pages/CLAUDE.md 的文件清单
 */
import { useParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-config';
import { QuestionDetail } from '@/components/QuestionDetail';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { QuestionDTO, AnswerDTO, CommentDTO } from '@/types/dto';

export function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Check if user is logged in
  const token = localStorage.getItem('token');
  const isLoggedIn = !!token;

  // Fetch question data with SWR
  const { data: question, error: questionError, isLoading: isLoadingQuestion } = useSWR<QuestionDTO>(
    id ? `/api/questions?id=${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute deduplication
    }
  );

  // Fetch answers with SWR
  const { data: answers = [], error: answersError, isLoading: isLoadingAnswers } = useSWR<AnswerDTO[]>(
    id ? `/api/answers?questionId=${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds deduplication
    }
  );

  // Fetch comments with SWR
  const { data: comments = [], error: commentsError, isLoading: isLoadingComments } = useSWR<CommentDTO[]>(
    id ? `/api/comments?questionId=${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds deduplication
    }
  );

  // Handle answer button click
  const handleAnswer = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    navigate(`/answer/${id}`);
  };

  // Handle comment button click
  const handleComment = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    navigate(`/comment/${id}`);
  };

  // Loading state
  if (isLoadingQuestion) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">问题详情</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  // Error state
  if (questionError || !question) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">问题详情</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-gray-500">{questionError ? '加载失败' : '问题不存在'}</p>
          <Button onClick={() => navigate('/')}>返回首页</Button>
        </div>
      </div>
    );
  }

  const isLoading = isLoadingAnswers || isLoadingComments;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          data-testid="back-button"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">问题详情</h1>
      </div>

      {/* Question Detail Component */}
      <QuestionDetail
        question={question}
        answers={answers}
        comments={comments}
        isLoggedIn={isLoggedIn}
        onAnswer={handleAnswer}
        onComment={handleComment}
      />

      {/* Loading indicator for answers/comments */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}
