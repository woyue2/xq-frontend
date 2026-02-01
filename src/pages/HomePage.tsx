import { useState, useEffect, useRef } from 'react';
import { Heart, Star, MessageCircle, Share2, Pin, PinOff, Loader2, Filter } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { toast } from 'sonner';
import { currentUser } from '@/lib/mock-data'; // Only for legacy check, should use store ideally
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { useQuestions } from '@/hooks/useQuestions';
import { TAXONOMY, SUBJECT_OPTIONS } from '@/config/taxonomy';
import { cn } from '@/lib/utils';
import type { Question, DifficultyLevel } from '@/types';

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

  const handleLike = (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newLikes = new Set(likedQuestions);
    if (newLikes.has(questionId)) {
      newLikes.delete(questionId);
      toast.success('已取消点赞');
    } else {
      newLikes.add(questionId);
      toast.success('点赞成功');
    }
    setLikedQuestions(newLikes);
  };

  const handleFavorite = (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = new Set(favoritedQuestions);
    if (newFavorites.has(questionId)) {
      newFavorites.delete(questionId);
      toast.success('已取消收藏');
    } else {
      newFavorites.add(questionId);
      toast.success('收藏成功');
    }
    setFavoritedQuestions(newFavorites);
  };

  const handleTogglePin = (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (user?.role !== 'teacher') {
      toast.error('只有老师可以置顶问题');
      return;
    }
    toast.success('置顶状态已更新');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes}分钟前`;
      }
      return `${hours}小时前`;
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  const getDifficultyConfig = (difficulty?: DifficultyLevel) => {
    const configs = {
      easy: { label: '简单', className: 'bg-[#BDE0FE] text-blue-700' },
      medium: { label: '中等', className: 'bg-[#FFC8DD] text-pink-700' },
      hard: { label: '难题', className: 'bg-[#FFAFCC] text-red-700' },
    };
    return difficulty ? configs[difficulty] : null;
  };

  // Flatten pages
  const allQuestions = data?.pages.flatMap(p => p.items) || [];

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
                  ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-200"
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
                    ? "bg-blue-100 text-blue-700 font-bold"
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
        ) : allQuestions.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>暂无相关问题</p>
          </div>
        ) : (
          allQuestions.map((question) => {
            const difficultyConfig = getDifficultyConfig(question.difficulty);
            return (
              <div
                key={question.id}
                onClick={() => navigate(`/question/${question.id}`)}
                className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300 active:scale-[0.99] border border-transparent hover:border-blue-50"
              >
                <div className="p-3 space-y-2">
                  {/* Images */}
                  {question.images && question.images.length > 0 && (
                    <div className="w-full aspect-video rounded-xl overflow-hidden relative">
                      <img
                        src={question.images[0]}
                        alt="thumbnail"
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      {question.images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                          +{question.images.length - 1}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Topics (formerly Tags) */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {question.isPinned && (
                      <Badge className="bg-[#D5BDAF] text-white border-none flex items-center gap-1 h-5 text-[10px] px-1.5">
                        <Pin className="w-2.5 h-2.5 fill-white" /> 置顶
                      </Badge>
                    )}
                    {question.isGoodQuestion && (
                      <Badge className="bg-red-500 text-white border-none h-5 text-[10px] px-1.5">
                        好问题
                      </Badge>
                    )}

                    {/* Subject Badge */}
                    {!selectedSubject && (
                      <Badge variant="outline" className="border-blue-200 text-blue-400 h-5 text-[10px] px-1.5 capitalize">
                        {question.subject}
                      </Badge>
                    )}

                    {/* Topics */}
                    {question.topics?.slice(0, 2).map((topic, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-[#BDE0FE]/30 text-gray-600 hover:bg-[#BDE0FE]/50 h-5 text-[10px] px-1.5"
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>

                  {/* Title & Meta */}
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-gray-800 line-clamp-2 leading-relaxed">
                      {question.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <Avatar className="w-4 h-4 border border-gray-100">
                        <AvatarFallback className="text-[8px] bg-gray-50">{question.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[80px] font-medium">{question.authorName}</span>
                      <span>·</span>
                      <span className="whitespace-nowrap">{formatDate(question.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-50 mt-1">
                    <button
                      onClick={(e) => handleLike(question.id, e)}
                      className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-red-500 transition-colors group"
                    >
                      <Heart
                        className={cn("w-3.5 h-3.5 transition-transform group-active:scale-125", likedQuestions.has(question.id) ? 'fill-red-500 text-red-500' : '')}
                      />
                      <span className={likedQuestions.has(question.id) ? 'text-red-500 font-bold' : ''}>
                        {question.stats.likes + (likedQuestions.has(question.id) ? 1 : 0)}
                      </span>
                    </button>

                    <button
                      onClick={(e) => handleFavorite(question.id, e)}
                      className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-yellow-500 transition-colors group"
                    >
                      <Star
                        className={cn("w-3.5 h-3.5 transition-transform group-active:scale-125", favoritedQuestions.has(question.id) ? 'fill-yellow-500 text-yellow-500' : '')}
                      />
                      <span className={favoritedQuestions.has(question.id) ? 'text-yellow-500 font-bold' : ''}>
                        {question.stats.favorites + (favoritedQuestions.has(question.id) ? 1 : 0)}
                      </span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/question/${question.id}`);
                      }}
                      className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-[#CDB4DB] transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{question.stats.comments}</span>
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); toast.success('分享链接已复制'); }}
                      className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-800 transition ml-auto"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
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