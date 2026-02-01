import React from 'react';
import { Heart, Star, Pin, PinOff, MessageCircle, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GoodQuestionBadge } from '@/components/ui/good-question-badge';
import { SwipeableImageCarousel } from '@/components/ui/swipeable-image-carousel';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Question, DifficultyLevel } from '@/types';
import { DIFFICULTY_LABELS } from '@/config/app-constants';
import { toast } from 'sonner';

interface QuestionCardProps {
    question: Question;
    isLiked?: boolean;
    isFavorited?: boolean;
    onLike?: (e: React.MouseEvent) => void;
    onFavorite?: (e: React.MouseEvent) => void;
    onShare?: (e: React.MouseEvent) => void;
    showSubject?: boolean;
    isAdmin?: boolean;
    onTogglePin?: (e: React.MouseEvent) => void;
}

export function QuestionCard({ 
    question, 
    isLiked = false, 
    isFavorited = false, 
    onLike, 
    onFavorite,
    onShare,
    showSubject = true,
    isAdmin = false,
    onTogglePin
}: QuestionCardProps) {
    const navigate = useNavigate();
    const isPinned = question.isPinned;
    const difficultyConfig = DIFFICULTY_LABELS[question.difficulty as DifficultyLevel];

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        return date.toLocaleDateString();
    };

    return (
        <div
            onClick={() => navigate(`/question/${question.id}`)}
            className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-all duration-200 cursor-pointer"
        >
            {/* Images - Swipeable Carousel */}
            {question.images && question.images.length > 0 && (
                <SwipeableImageCarousel
                    images={question.images}
                    overlay={isPinned && (
                        <Badge className="bg-blue-600 text-white border-none flex items-center gap-1 min-h-[1.25rem] text-[10px] px-1.5 shadow-sm">
                            <Pin className="w-2.5 h-2.5 fill-white" />
                        </Badge>
                    )}
                />
            )}

            {/* Badges & Topics */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
                {/* Fallback Pin Badge if no images */}
                {isPinned && (!question.images || question.images.length === 0) && (
                    <Badge className="bg-blue-600 text-white border-none flex items-center gap-1 min-h-[1.25rem] text-[10px] px-1.5">
                        <Pin className="w-2.5 h-2.5 fill-white" />
                    </Badge>
                )}
                
                {/* Good Question Badge - Interactive */}
                {question.isGoodQuestion && (
                    <GoodQuestionBadge />
                )}

                {/* Tags */}
                {question.tags?.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="bg-gray-100 text-gray-600 border-none min-h-[1.25rem] text-[10px]">
                        {tag}
                    </Badge>
                ))}

                {/* Difficulty */}
                {difficultyConfig && (
                    <Badge className={cn(difficultyConfig.className, "border-none min-h-[1.25rem] text-[10px]")}>
                        {difficultyConfig.label}
                    </Badge>
                )}
            </div>

            {/* Subject Badge */}
            {showSubject && (
                <Badge variant="outline" className="border-morandi-2 text-morandi-5 h-5 text-[10px] px-1.5 capitalize mb-2 inline-flex">
                    {question.subject}
                </Badge>
            )}

            {/* Topics (from taxonomy) */}
            <div className="flex flex-wrap gap-1 mb-2">
                 {question.topics?.slice(0, 2).map((topic, index) => (
                    <Badge
                        key={index}
                        variant="secondary"
                        className="bg-morandi-1/30 text-gray-600 hover:bg-morandi-1/50 h-5 text-[10px] px-1.5"
                    >
                        {topic}
                    </Badge>
                ))}
            </div>

            {/* Title & Meta */}
            <div className="space-y-1.5 px-3">
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
            <div className="flex items-center gap-4 p-3 pt-2 border-t border-gray-50 mt-1">
                <button
                    onClick={(e) => { e.stopPropagation(); onLike?.(e); }}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-red-500 transition-colors group"
                >
                    <Heart
                        className={cn("w-3.5 h-3.5 transition-transform group-active:scale-125", isLiked ? 'fill-red-500 text-red-500' : '')}
                    />
                    <span className={isLiked ? 'text-red-500 font-bold' : ''}>
                        {question.stats.likes + (isLiked ? 1 : 0)}
                    </span>
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onFavorite?.(e); }}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-yellow-500 transition-colors group"
                >
                    <Star
                        className={cn("w-3.5 h-3.5 transition-transform group-active:scale-125", isFavorited ? 'fill-yellow-500 text-yellow-500' : '')}
                    />
                    <span className={isFavorited ? 'text-yellow-500 font-bold' : ''}>
                         {question.stats.favorites + (isFavorited ? 1 : 0)}
                    </span>
                </button>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/question/${question.id}`);
                    }}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-500 transition-colors"
                >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{question.stats.comments}</span>
                </button>

                <button
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (onShare) onShare(e);
                        else toast.success('分享链接已复制');
                    }}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-800 transition ml-auto"
                >
                    <Share2 className="w-3.5 h-3.5" />
                </button>

                {isAdmin && onTogglePin && (
                    <button
                        className={cn(
                            "flex items-center gap-1 text-[10px] transition-colors",
                            isPinned ? "text-blue-600 hover:text-gray-500" : "text-gray-500 hover:text-blue-600"
                        )}
                        onClick={(e) => { e.stopPropagation(); onTogglePin(e); }}
                    >
                        {isPinned ? (
                            <>
                                <PinOff className="w-3.5 h-3.5" />
                                <span>取消置顶</span>
                            </>
                        ) : (
                            <>
                                <Pin className="w-3.5 h-3.5" />
                                <span>置顶</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
