import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { currentUser } from '@/lib/mock-data'; // Only for legacy check, should use store ideally
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { useQuestions } from '@/hooks/useQuestions';
import { TAXONOMY, SUBJECT_OPTIONS } from '@/config/taxonomy';
import { UI_CONFIG } from '@/config/ui-config';
import { TOAST_MESSAGES } from '@/config/app-constants';
import { cn } from '@/lib/utils';
import type { Question, DifficultyLevel } from '@/types';

import { QuestionCard } from '@/components/QuestionCard';

// Swipeable Image Carousel Component moved to @/components/ui/swipeable-image-carousel.tsx

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Filter States
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  // Data Fetching
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useQuestions({
    subject: selectedSubject,
    topic: selectedTopic
  });

  // Infinite Scroll Observer
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  // Local Interaction States (Optimistic UI handled locally for demo)
  const [likedQuestions, setLikedQuestions] = useState(new Set<string>());
  const [favoritedQuestions, setFavoritedQuestions] = useState(new Set<string>());
  const [pinnedStates, setPinnedStates] = useState<Record<string, boolean>>({});

  const handleLike = (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newLikes = new Set(likedQuestions);
    if (newLikes.has(questionId)) {
      newLikes.delete(questionId);
      toast.success(TOAST_MESSAGES.unliked);
    } else {
      newLikes.add(questionId);
      toast.success(TOAST_MESSAGES.liked);
    }
    setLikedQuestions(newLikes);
  };

  const handleFavorite = (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = new Set(favoritedQuestions);
    if (newFavorites.has(questionId)) {
      newFavorites.delete(questionId);
      toast.success(TOAST_MESSAGES.unfavorited);
    } else {
      newFavorites.add(questionId);
      toast.success(TOAST_MESSAGES.favorited);
    }
    setFavoritedQuestions(newFavorites);
  };

  const getEffectivePinned = (question: Question) => {
    return pinnedStates[question.id] ?? question.isPinned;
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
    
    const isPinned = getEffectivePinned(question);
    
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

  // Flatten pages
  const allQuestions = data?.pages.flatMap(p => p.items) || [];
  
  // Sort questions: Pinned first, then by original order (assuming date desc)
  const sortedQuestions = [...allQuestions].sort((a, b) => {
    const aPinned = getEffectivePinned(a);
    const bPinned = getEffectivePinned(b);
    
    if (aPinned === bPinned) return 0;
    return aPinned ? -1 : 1;
  });

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* 1. Taxonomy Filters */}
      <div className="sticky top-[3.5rem] z-40 bg-gray-50/95 backdrop-blur py-2 -mx-4 px-4 space-y-2 transition-all">
        {/* Subject Filter (Capsules) */}
        <div className="flex overflow-x-auto gap-2 scrollbar-hide pb-1">
          <button
            onClick={() => { setSelectedSubject(''); setSelectedTopic(''); }}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
              !selectedSubject
                ? "bg-gray-800 text-white border-gray-800 shadow-md"
                : "bg-white text-gray-600 border-gray-200"
            )}
          >
            全部
          </button>
          {SUBJECT_OPTIONS.map((sub) => (
            <button
              key={sub.value}
              onClick={() => { setSelectedSubject(sub.value); setSelectedTopic(''); }}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                selectedSubject === sub.value
                  ? "bg-morandi-5 text-white border-morandi-5 shadow-md transform scale-105"
                  : "bg-white text-gray-600 border-gray-200 hover:border-morandi-2"
              )}
            >
              {sub.label}
            </button>
          ))}
        </div>

        {/* Topic Filter (Only if subject selected) */}
        {selectedSubject && TAXONOMY[selectedSubject] && (
          <div className="flex overflow-x-auto gap-2 scrollbar-hide animate-in slide-in-from-top-1 fade-in duration-300 border-t border-gray-200 pt-2">
            <div className="flex items-center text-xs text-gray-400 px-1">
              <Filter className="w-3 h-3 mr-1" />
              考点:
            </div>
            {TAXONOMY[selectedSubject].topics.map((topic) => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(selectedTopic === topic ? '' : topic)}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] whitespace-nowrap transition-colors",
                  selectedTopic === topic
                    ? "bg-morandi-3 text-morandi-5 font-bold"
                    : "bg-white text-gray-500 hover:bg-gray-100"
                )}
              >
                {topic}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Question List */}
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
          <div className="text-center py-20 text-gray-400">
            <p>暂无相关问题</p>
          </div>
        ) : (
          sortedQuestions.map((question) => {
            const isPinned = getEffectivePinned(question);
            const questionWithPinned = { ...question, isPinned };
            
            return (
              <QuestionCard
                key={question.id}
                question={questionWithPinned}
                isLiked={likedQuestions.has(question.id)}
                isFavorited={favoritedQuestions.has(question.id)}
                onLike={(e) => handleLike(question.id, e)}
                onFavorite={(e) => handleFavorite(question.id, e)}
                showSubject={!selectedSubject}
                isAdmin={user?.role === 'teacher'}
                onTogglePin={(e) => handleTogglePin(question, e)}
              />
            );
          })
        )}

        {/* Loading Indicator for Infinite Scroll */}
        <div ref={observerTarget} className="h-10 flex items-center justify-center w-full">
          {isFetchingNextPage && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
          {!hasNextPage && !isLoading && allQuestions.length > 0 && (
            <span className="text-[10px] text-gray-300">没有更多内容了</span>
          )}
        </div>
      </div>
    </div>
  );
}