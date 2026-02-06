import { useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { QuestionCard } from '@/components/QuestionCard';
import type { Question } from '@/types';

interface QuestionListProps {
  questions: Question[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  // Interaction handlers (optional)
  onLike?: (id: string, e: React.MouseEvent) => void;
  onFavorite?: (id: string, e: React.MouseEvent) => void;
  onPin?: (question: Question, e: React.MouseEvent) => void;
  pinnedStates?: Record<string, boolean>;
  likedQuestions?: Set<string>;
  favoritedQuestions?: Set<string>;
  showDetailButton?: boolean;
  onDetailClick?: (id: string) => void;
  understandingStates?: Record<string, 'understood' | 'not_understood' | null>;
  onToggleUnderstanding?: (question: Question, e: React.MouseEvent) => void;
  onAuthorClick?: (question: Question, e: React.MouseEvent) => void;
}

export function QuestionList({
  questions,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onLike,
  onFavorite,
  onPin,
  pinnedStates = {},
  likedQuestions = new Set(),
  favoritedQuestions = new Set(),
  showDetailButton = false,
  onDetailClick,
  understandingStates = {},
  onToggleUnderstanding,
  onAuthorClick
}: QuestionListProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 某些旧环境或非浏览器环境可能不存在 IntersectionObserver，
    // 此处做一次能力检测，避免直接抛错导致 ErrorBoundary 触发。
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Sort questions: Pinned first (if handled here, or expect sorted input)
  // Assuming input is sorted or we sort here based on pinnedStates.
  // For simplicity, let's assume parent sorts it, OR we sort here.
  // HomePage sorts it. Let's sort here too if pinnedStates provided.
  
  const getEffectivePinned = (question: Question) => {
    return pinnedStates[question.id] ?? question.isPinned;
  };

  const sortedQuestions = [...questions].sort((a, b) => {
    const aPinned = getEffectivePinned(a);
    const bPinned = getEffectivePinned(b);
    if (aPinned === bPinned) return 0;
    return aPinned ? -1 : 1;
  });

  return (
    <div className="space-y-4 min-h-[50vh]">
      {isLoading ? (
        // Skeleton Loader
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 space-y-3 animate-pulse">
            <div className="h-40 bg-gray-200 rounded-lg w-full" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        ))
      ) : sortedQuestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 text-gray-300" />
          </div>
          <p>暂无相关提问</p>
        </div>
      ) : (
        <>
          {sortedQuestions.map((question) => (
            <div
              key={question.id}
              className="relative"
              data-testid="question-card"
            >
              <QuestionCard
                question={question}
                // onClick prop removed as it is not part of QuestionCardProps
                isLiked={likedQuestions.has(question.id)}
                isFavorited={favoritedQuestions.has(question.id)}
                isPinned={getEffectivePinned(question)}
                onLike={onLike ? (e: React.MouseEvent) => onLike(question.id, e) : undefined}
                onFavorite={onFavorite ? (e: React.MouseEvent) => onFavorite(question.id, e) : undefined}
                onPin={onPin ? (e: React.MouseEvent) => onPin(question, e) : undefined}
                understandingStatus={
                  understandingStates[question.id] ?? question.understandingStatus ?? null
                }
                onToggleUnderstanding={
                  onToggleUnderstanding
                    ? (e: React.MouseEvent) => onToggleUnderstanding(question, e)
                    : undefined
                }
                onAuthorClick={
                  onAuthorClick
                    ? (e: React.MouseEvent) => onAuthorClick(question, e)
                    : undefined
                }
              />
              {showDetailButton && (
                <div className="absolute top-4 right-4 z-10">
                   <button 
                     className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors"
                     onClick={(e) => {
                       e.stopPropagation();
                       onDetailClick?.(question.id);
                     }}
                   >
                     查看详情
                   </button>
                </div>
              )}
            </div>
          ))}
          
          {/* Loading Indicator for Infinite Scroll */}
          <div ref={observerTarget} className="h-10 flex items-center justify-center">
            {isFetchingNextPage && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
            {!hasNextPage && sortedQuestions.length > 0 && (
              <p className="text-xs text-gray-400">没有更多了</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
