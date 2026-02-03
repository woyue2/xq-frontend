import { useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';
import { TOAST_MESSAGES } from '@/config/app-constants';
import type { Question } from '@/types';
import { QuestionList } from '@/components/QuestionList';
import { QuestionFilter } from '@/components/QuestionFilter';

export function HomePage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const searchKeyword = searchParams.get('search') || undefined;

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
    topic: selectedTopic,
    search: searchKeyword
  });

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

  // Flatten pages
  const allQuestions = data?.pages.flatMap(p => p.items) || [];
  
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
        onPin={user?.role === 'teacher' ? handleTogglePin : undefined}
        pinnedStates={pinnedStates}
        likedQuestions={likedQuestions}
        favoritedQuestions={favoritedQuestions}
      />
    </div>
  );
}
