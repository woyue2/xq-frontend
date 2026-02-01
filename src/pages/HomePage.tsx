import { useState } from 'react';
import { Search, Plus, Heart, Star, MessageCircle, Share2, Edit3, Volume2, Pin, PinOff } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { mockQuestions, currentUser, userLikes, userFavorites } from '@/lib/mock-data';
import type { Question, DifficultyLevel } from '@/types';

interface HomePageProps {
  onNavigate: (page: string, data?: any) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [questions, setQuestions] = useState<Question[]>(
    [...mockQuestions].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
  );
  const [likedQuestions, setLikedQuestions] = useState(new Set(userLikes));
  const [favoritedQuestions, setFavoritedQuestions] = useState(new Set(userFavorites));

  const handleTogglePin = (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser?.role !== 'teacher') {
      toast.error('只有老师可以置顶问题');
      return;
    }

    setQuestions(prev => {
      const next = prev.map(q => {
        if (q.id === questionId) {
          const newStatus = !q.isPinned;
          toast.success(newStatus ? '已置顶' : '已取消置顶');
          return { ...q, isPinned: newStatus };
        }
        return q;
      });
      
      // Re-sort
      return [...next].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });
  };

  const getDifficultyConfig = (difficulty?: DifficultyLevel) => {
    const configs = {
      easy: { label: '简单', className: 'bg-[#BDE0FE] text-blue-700' },
      medium: { label: '中等', className: 'bg-[#FFC8DD] text-pink-700' },
      hard: { label: '难题', className: 'bg-[#FFAFCC] text-red-700' },
    };
    return difficulty ? configs[difficulty] : null;
  };

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

  const handleComment = (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate('detail', { questionId });
  };

  const handleAnswer = (questionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser?.role === 'teacher') {
      onNavigate('answer', { questionId });
    } else {
      toast.error('暂无回答权限');
    }
  };

  const handleShare = (question: Question, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success('分享链接已复制');
  };

  const handleCreateQuestion = () => {
    if (currentUser?.role === 'student' || currentUser?.role === 'teacher') {
      onNavigate('create');
    } else {
      toast.error('暂无提问权限');
    }
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl">初中知识问答</h1>
            <p className="text-[10px] text-[#D5BDAF] font-medium leading-none mt-0.5">好好学习，天天向上</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-full transition">
              <Search className="w-5 h-5 text-gray-600" />
            </button>
            <button 
              onClick={() => onNavigate('profile')}
              className="p-1 hover:bg-gray-100 rounded-full transition"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser?.avatar} />
                <AvatarFallback>{currentUser?.nickname?.[0] || '我'}</AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </div>

      {/* 问题列表 */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-24">
        <div className="space-y-4">
          {questions.map((question) => {
            const difficultyConfig = getDifficultyConfig(question.difficulty);
            
            return (
              <div
                key={question.id}
                onClick={() => onNavigate('detail', { questionId: question.id })}
                className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
              >
                <div className="p-3 space-y-2">
                  {/* 缩略图区域 - 移到上方 */}
                  {question.images && question.images.length > 0 && (
                    <div className="w-full aspect-video rounded-lg overflow-hidden relative">
                      <img
                        src={question.images[0]}
                        alt="问题缩略图"
                        className="w-full h-full object-cover"
                      />
                      {question.images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                          +{question.images.length - 1}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 标签行 */}
                  <div className="flex flex-wrap items-center gap-2">
                    {question.isPinned && (
                      <Badge className="bg-[#D5BDAF] text-white border-none flex items-center gap-1">
                        <Pin className="w-3 h-3 fill-white" /> 置顶
                      </Badge>
                    )}
                    {question.isGoodQuestion && (
                      <Badge className="bg-red-500 text-white border-none">
                        好问题
                      </Badge>
                    )}
                    {question.tags?.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-[#BDE0FE] text-gray-700 hover:bg-[#A2D2FF]"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {difficultyConfig && (
                      <Badge
                        variant="secondary"
                        className={difficultyConfig.className}
                      >
                        {difficultyConfig.label}
                      </Badge>
                    )}
                  </div>

                  {/* 问题标题和作者信息 */}
                  <div className="space-y-1">
                    <h3 className="text-base line-clamp-2">
                      {question.title}
                    </h3>
                    {/* 提问信息 - 紧凑布局 */}
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                      <Avatar className="w-3.5 h-3.5">
                        <AvatarFallback className="text-[8px]">{question.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[80px]">{question.authorName}</span>
                      <span>·</span>
                      <span className="whitespace-nowrap">{formatDate(question.createdAt)}</span>
                    </div>
                  </div>

                  {/* 互动按钮区 */}
                  <div className="flex items-center gap-4 pt-2 border-t">
                    <button
                      onClick={(e) => handleLike(question.id, e)}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-500 transition"
                    >
                      <Heart 
                        className={`w-3.5 h-3.5 ${likedQuestions.has(question.id) ? 'fill-red-500 text-red-500' : ''}`} 
                      />
                      <span className={likedQuestions.has(question.id) ? 'text-red-500' : ''}>
                        {question.likes + (likedQuestions.has(question.id) ? 1 : 0)}
                      </span>
                    </button>

                    <button
                      onClick={(e) => handleFavorite(question.id, e)}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-yellow-500 transition"
                    >
                      <Star 
                        className={`w-3.5 h-3.5 ${favoritedQuestions.has(question.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} 
                      />
                      <span className={favoritedQuestions.has(question.id) ? 'text-yellow-500' : ''}>
                        {question.favorites + (favoritedQuestions.has(question.id) ? 1 : 0)}
                      </span>
                    </button>

                    <button
                      onClick={(e) => handleComment(question.id, e)}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-[#CDB4DB] transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{question.comments}</span>
                    </button>

                    {currentUser?.role === 'teacher' && (
                      <button
                        onClick={(e) => handleAnswer(question.id, e)}
                        className="flex items-center gap-1 text-xs text-[#A2D2FF] hover:text-[#BDE0FE] transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>回答</span>
                      </button>
                    )}

                    {currentUser?.role === 'teacher' && (
                      <button
                        onClick={(e) => handleTogglePin(question.id, e)}
                        className={`flex items-center gap-1 text-xs transition ${question.isPinned ? 'text-[#D5BDAF]' : 'text-gray-600 hover:text-[#D5BDAF]'}`}
                      >
                        {question.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        <span>{question.isPinned ? '取消置顶' : '置顶'}</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => handleShare(question, e)}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 transition ml-auto"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部固定提问按钮 */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20">
        <Button
          onClick={handleCreateQuestion}
          size="lg"
          className="w-16 h-16 rounded-full bg-[#D5BDAF] hover:bg-[#B59D8F] shadow-lg active:scale-90 transition-all border-none"
        >
          <Plus className="w-8 h-8 text-white" />
        </Button>
      </div>
    </div>
  );
}