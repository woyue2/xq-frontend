/**
 * [POS] src/pages/QuestionDetailPage.tsx
 *   所属：pages 层 | 角色：问题详情页，路由 `/question/:id`
 *   兄弟：HomePage.tsx / CreateQuestionPage.tsx / AnswerQuestionPage.tsx
 *
 * [INPUT]
 *   - react                          → useState / useEffect
 *   - react-router-dom               → useParams / useNavigate
 *   - @/components/QuestionDetail    → QuestionDetail
 *   - @/types/dto                    → QuestionDTO / AnswerDTO / CommentDTO
 *
 * [OUTPUT]
 *   - QuestionDetailPage（页面组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/pages/CLAUDE.md 的文件清单
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QuestionDetail } from '@/components/QuestionDetail';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { QuestionDTO, AnswerDTO, CommentDTO } from '@/types/dto';

interface ApiResponse<T> {
  code: number;
  data: T;
  timestamp: number;
}

export function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [question, setQuestion] = useState<QuestionDTO | null>(null);
  const [answers, setAnswers] = useState<AnswerDTO[]>([]);
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in
  const token = localStorage.getItem('token');
  const isLoggedIn = !!token;

  // Fetch all data in parallel
  useEffect(() => {
    if (!id) return;

    const fetchAllData = async () => {
      setIsLoadingQuestion(true);
      setIsLoadingAnswers(true);
      setIsLoadingComments(true);
      setError(null);

      try {
        // Fetch all 3 requests in parallel
        const [questionRes, answersRes, commentsRes] = await Promise.all([
          fetch(`/api/questions?id=${id}`),
          fetch(`/api/answers?questionId=${id}`),
          fetch(`/api/comments?questionId=${id}`)
        ]);

        // Parse all responses in parallel
        const [questionResult, answersResult, commentsResult] = await Promise.all([
          questionRes.json() as Promise<ApiResponse<QuestionDTO>>,
          answersRes.json() as Promise<ApiResponse<AnswerDTO[]>>,
          commentsRes.json() as Promise<ApiResponse<CommentDTO[]>>
        ]);

        // Handle question result
        if (questionResult.code === 200) {
          setQuestion(questionResult.data);
        } else if (questionResult.code === 404) {
          setError('问题不存在');
        } else {
          setError('加载问题失败');
        }

        // Handle answers result
        if (answersResult.code === 200) {
          setAnswers(answersResult.data);
        }

        // Handle comments result
        if (commentsResult.code === 200) {
          setComments(commentsResult.data);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('加载数据失败');
      } finally {
        setIsLoadingQuestion(false);
        setIsLoadingAnswers(false);
        setIsLoadingComments(false);
      }
    };

    fetchAllData();
  }, [id]);

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
    // Scroll to comment section or show comment input
    // For now, just a placeholder
    console.log('Comment button clicked');
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
  if (error || !question) {
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
          <p className="text-gray-500">{error || '问题不存在'}</p>
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
        answers={isLoadingAnswers ? [] : answers}
        comments={isLoadingComments ? [] : comments}
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
