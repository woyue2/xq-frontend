/**
 * [POS] src/pages/HomePage.tsx
 *   所属：pages 层 | 角色：首页（问题列表 + 筛选 + 发布入口），路由 `/`
 *   兄弟：所有其他 pages
 *
 * [INPUT]
 *   - react                  → useState / useRef / useCallback
 *   - react-router-dom       → useSearchParams / useNavigate
 *   - sonner                 → toast
 *   - @/stores/useAuthStore  → useAuthStore
 *   - @/hooks/useQuestions   → useQuestions
 *   - @/services/api         → questionService
 *   - @/config/app-constants → TOAST_MESSAGES / ROUTES
 *   - @/components/ui/alert-dialog → AlertDialog（游客登录引导）
 *
 * [OUTPUT]
 *   - HomePage（页面组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/pages/CLAUDE.md 的文件清单
 */
import { useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';
import { questionService, interactionService } from '@/services/api';
import { TOAST_MESSAGES, ROUTES } from '@/config/app-constants';
import type { Question } from '@/types';
import { QuestionList } from '@/components/QuestionList';
import { QuestionFilter } from '@/components/QuestionFilter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function HomePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchKeyword = searchParams.get('search') || undefined;

  // Filter States
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  // Data Fetching
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useQuestions({
    subject: selectedSubject,
    topic: selectedTopic,
    search: searchKeyword,
  });

  // Local Interaction States (Optimistic UI handled locally for demo)
  const [likedQuestions, setLikedQuestions] = useState(new Set<string>());
  const [favoritedQuestions, setFavoritedQuestions] = useState(new Set<string>());
  const [pinnedStates, setPinnedStates] = useState<Record<string, boolean>>({});
  const [understandingStates, setUnderstandingStates] = useState<
    Record<string, 'understood' | 'not_understood' | null>
  >({});

  // 游客登录引导 dialog
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  const requireLogin = () => {
    setShowLoginDialog(true);
  };

  const handleLike = async (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // [IMPL] 原因：游客点击互动按钮时提示登录，而非静默操作
    if (!user) {
      requireLogin();
      return;
    }
    const isCurrentlyLiked = likedQuestions.has(questionId);
    const newLikes = new Set(likedQuestions);
    if (isCurrentlyLiked) {
      newLikes.delete(questionId);
    } else {
      newLikes.add(questionId);
    }
    setLikedQuestions(newLikes);
    
    try {
      await interactionService.like({
        targetType: 'question',
        targetId: questionId,
        action: isCurrentlyLiked ? 'unlike' : 'like',
      });
      toast.success(isCurrentlyLiked ? TOAST_MESSAGES.unliked : TOAST_MESSAGES.liked);
    } catch (error: any) {
      // Revert on error
      setLikedQuestions(likedQuestions);
      console.error('[handleLike] Error:', error);
      toast.error(error.response?.data?.message || '操作失败，请稍后重试');
    }
  };

  const handleFavorite = async (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // [IMPL] 原因：游客点击互动按钮时提示登录
    if (!user) {
      requireLogin();
      return;
    }
    const isCurrentlyFavorited = favoritedQuestions.has(questionId);
    const newFavorites = new Set(favoritedQuestions);
    if (isCurrentlyFavorited) {
      newFavorites.delete(questionId);
    } else {
      newFavorites.add(questionId);
    }
    setFavoritedQuestions(newFavorites);
    
    try {
      await interactionService.favorite({
        questionId,
        action: isCurrentlyFavorited ? 'unfavorite' : 'favorite',
      } as any);
      toast.success(isCurrentlyFavorited ? TOAST_MESSAGES.unfavorited : TOAST_MESSAGES.favorited);
    } catch (error: any) {
      // Revert on error
      setFavoritedQuestions(favoritedQuestions);
      console.error('[handleFavorite] Error:', error);
      toast.error(error.response?.data?.message || '操作失败，请稍后重试');
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

    setPinnedStates((prev) => ({
      ...prev,
      [question.id]: !isPinned,
    }));
  };

  const handleToggleUnderstanding = async (question: Question, e: React.MouseEvent) => {
    e.stopPropagation();

    // 仅提问学生本人可以标记理解状态
    if (!user || user.id !== question.authorId) {
      return;
    }

    const current = understandingStates[question.id] ?? question.understandingStatus ?? null;
    const next: 'understood' | 'not_understood' =
      current === 'understood' ? 'not_understood' : 'understood';

    try {
      await questionService.setUnderstandingStatus(question.id, next);
      setUnderstandingStates((prev) => ({
        ...prev,
        [question.id]: next,
      }));
    } catch {
      toast.error('更新理解状态失败，请稍后重试');
    }
  };

  // Flatten pages
  const allQuestions = data?.pages.flatMap((p) => p.items) || [];

  const handleAuthorClick = (question: Question, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      toast.error('请先登录');
      return;
    }

    if (user.role === 'teacher' || user.role === 'admin') {
      navigate(ROUTES.studentHistory(question.authorId));
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
        questions={allQuestions}
        isLoading={isLoading}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        onLike={handleLike}
        onFavorite={handleFavorite}
        onPin={user?.role === 'teacher' || user?.role === 'admin' ? handleTogglePin : undefined}
        pinnedStates={pinnedStates}
        likedQuestions={likedQuestions}
        favoritedQuestions={favoritedQuestions}
        understandingStates={understandingStates}
        onToggleUnderstanding={handleToggleUnderstanding}
        onAuthorClick={handleAuthorClick}
      />

      {/* 游客登录引导 */}
      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>需要登录</AlertDialogTitle>
            <AlertDialogDescription>
              该功能需要登录后使用，请登录或注册账号。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/login')}>去登录 / 注册</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
