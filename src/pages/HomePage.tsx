import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';
import { interactionService, questionService } from '@/services/api';
import { TOAST_MESSAGES } from '@/config/app-constants';
import type { Question } from '@/types';
import { QuestionList } from '@/components/QuestionList';
import { QuestionFilter } from '@/components/QuestionFilter';

export function HomePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchKeyword = searchParams.get('search') || undefined;

  // Funnel States
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  // Data Fetching
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useQuestions({
    subject: selectedSubject,
    topic: selectedTopic,
    search: searchKeyword
  });

  // Local Interaction States (Optimistic UI handled locally for demo)
  const [likedQuestions, setLikedQuestions] = useState(new Set<string>());
  const [favoritedQuestions, setFavoritedQuestions] = useState(new Set<string>());
  const [interactionStats, setInteractionStats] = useState<
    Record<string, { likes?: number; favorites?: number }>
  >({});
  const [pinnedStates, setPinnedStates] = useState<Record<string, boolean>>({});
  const [understandingStates, setUnderstandingStates] = useState<
    Record<string, 'understood' | 'not_understood' | null>
  >({});

  useEffect(() => {
    try {
      const needRefresh = window.sessionStorage.getItem('questions_need_refresh');
      if (needRefresh === '1') {
        window.sessionStorage.removeItem('questions_need_refresh');
        // 修改原因：详情页点赞/收藏后返回首页时，主动刷新问题列表，避免 staleTime 缓存导致计数延迟更新。
        void refetch();
      }
    } catch {
      // ⚠️ 不确定因素：极少数环境 sessionStorage 不可用，降级为不主动刷新，仍可依赖下次自然刷新。
    }
  }, [refetch]);

  const handleLike = async (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }

    const nextLiked = !likedQuestions.has(questionId);

    try {
      // 修改原因：首页点赞改为真实调用后端，避免仅本地状态切换导致刷新后归零。
      const result = await interactionService.like({
        targetType: 'question',
        targetId: questionId,
        action: nextLiked ? 'like' : 'unlike'
      });

      setLikedQuestions((prev) => {
        const next = new Set(prev);
        if (result.liked) {
          next.add(questionId);
        } else {
          next.delete(questionId);
        }
        return next;
      });

      setInteractionStats((prev) => ({
        ...prev,
        [questionId]: {
          ...(prev[questionId] ?? {}),
          likes: result.likesCount
        }
      }));

      toast.success(result.liked ? TOAST_MESSAGES.liked : TOAST_MESSAGES.unliked);
      try {
        window.sessionStorage.setItem('questions_need_refresh', '1');
      } catch {
        // ignore
      }
    } catch {
      toast.error('点赞操作失败，请稍后重试');
    }
  };

  const handleFavorite = async (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }

    const nextFavorited = !favoritedQuestions.has(questionId);

    try {
      // 修改原因：首页收藏改为真实调用后端，避免仅本地状态切换导致刷新后归零。
      const result = await interactionService.favorite({
        questionId,
        action: nextFavorited ? 'favorite' : 'unfavorite'
      });

      setFavoritedQuestions((prev) => {
        const next = new Set(prev);
        if (result.favorited) {
          next.add(questionId);
        } else {
          next.delete(questionId);
        }
        return next;
      });

      setInteractionStats((prev) => ({
        ...prev,
        [questionId]: {
          ...(prev[questionId] ?? {}),
          favorites: result.favoritesCount
        }
      }));

      toast.success(
        result.favorited ? TOAST_MESSAGES.favorited : TOAST_MESSAGES.unfavorited
      );
      try {
        window.sessionStorage.setItem('questions_need_refresh', '1');
      } catch {
        // ignore
      }
    } catch {
      toast.error('收藏操作失败，请稍后重试');
    }
  };

  const handleTogglePin = (question: Question, e: React.MouseEvent) => {
    e.stopPropagation();
    if (user?.role !== 'teacher') {
      toast.error(TOAST_MESSAGES.onlyTeacherCanPin);
      return;
    }
    
    // Note: Backend integration required
    // See FRONTEND-CODING_STANDARDS.md Section 3.3 for PWA/Optimistic update protocol
    // Currently implementing optimistic UI update only.
    // In production, this should make a POST request to /api/questions/:id/pin
    
    const isPinned = pinnedStates[question.id] ?? question.isPinned;
    
    if (isPinned) {
      toast.success(TOAST_MESSAGES.unpinned);
    } else {
      toast.success(TOAST_MESSAGES.pinned);
    }
    
    setPinnedStates(prev => ({
      ...prev,
      [question.id]: !isPinned
    }));
  };

  const handleToggleUnderstanding = async (
    question: Question,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    // 仅提问学生本人可以标记理解状态
    if (!user || user.id !== question.authorId) {
      return;
    }

    const current =
      understandingStates[question.id] ?? question.understandingStatus ?? null;
    const next: 'understood' | 'not_understood' =
      current === 'understood' ? 'not_understood' : 'understood';

    try {
      await questionService.setUnderstandingStatus(question.id, next);
      setUnderstandingStates((prev) => ({
        ...prev,
        [question.id]: next
      }));
    } catch {
      toast.error('更新理解状态失败，请稍后重试');
    }
  };

  // Flatten pages
  const allQuestions = data?.pages.flatMap(p => p.list) || [];
  const mergedQuestions = allQuestions.map((q) => {
    const localStats = interactionStats[q.id];
    if (!localStats) return q;

    // 修改原因：点赞/收藏成功后在首页就地回写计数，避免等待下一次列表请求才看到变化。
    return {
      ...q,
      stats: {
        ...(q.stats ?? {}),
        likes:
          typeof localStats.likes === 'number'
            ? localStats.likes
            : q.stats?.likes ?? 0,
        favorites:
          typeof localStats.favorites === 'number'
            ? localStats.favorites
            : q.stats?.favorites ?? 0,
        comments: q.stats?.comments ?? 0,
        answers: q.stats?.answers ?? 0
      }
    };
  });

  const handleAuthorClick = (question: Question, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      toast.error('请先登录');
      return;
    }

    if (user.role === 'teacher') {
      navigate(`/student/${question.authorId}/questions`);
      return;
    }

    if (user.role === 'parent') {
      // 家长首页暂不直接跳转，避免越权，提示从“孩子提问列表”入口查看
      toast.error('请在“孩子提问列表”页查看孩子的历史提问');
    }
  };
  
  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* 1. Taxonomy Filters */}
      <QuestionFilter
        selectedSubject={selectedSubject}
        setSelectedSubject={setSelectedSubject}
        selectedTopic={selectedTopic}
        setSelectedTopic={setSelectedTopic}
      />

      {/* 2. Question List */}
      <QuestionList
        questions={mergedQuestions}
        isLoading={isLoading}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        onLike={handleLike}
        onFavorite={handleFavorite}
        onPin={user?.role === 'teacher' ? handleTogglePin : undefined}
        pinnedStates={pinnedStates}
        likedQuestions={likedQuestions}
        favoritedQuestions={favoritedQuestions}
        understandingStates={understandingStates}
        onToggleUnderstanding={handleToggleUnderstanding}
        onAuthorClick={handleAuthorClick}
      />
    </div>
  );
}
