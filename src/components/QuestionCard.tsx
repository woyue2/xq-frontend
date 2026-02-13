import React from 'react';
import { PushPin, PushPinSlash, ChatCircle, ShareNetwork } from '@phosphor-icons/react';
// 修改原因：按需求保持点赞/收藏图标为原始样式，Heart/Star 回退到 lucide-react。
import { Heart, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GoodQuestionBadge } from '@/components/ui/good-question-badge';
import { SwipeableImageCarousel } from '@/components/ui/swipeable-image-carousel';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Question, DifficultyLevel } from '@/types';
import { DIFFICULTY_LABELS } from '@/config/app-constants';
import { toast } from 'sonner';
import { buildQuestionShareUrl, copyToClipboardSafe } from '@/lib/share';

interface QuestionCardProps {
    question: Question;
    isLiked?: boolean;
    isFavorited?: boolean;
    onLike?: (e: React.MouseEvent) => void;
    onFavorite?: (e: React.MouseEvent) => void;
    onShare?: (e: React.MouseEvent) => void;
    showSubject?: boolean;
    isAdmin?: boolean;
    isPinned?: boolean;
    onPin?: (e: React.MouseEvent) => void;
    onTogglePin?: (e: React.MouseEvent) => void;
    understandingStatus?: 'understood' | 'not_understood' | null;
    onToggleUnderstanding?: (e: React.MouseEvent) => void;
    onAuthorClick?: (e: React.MouseEvent) => void;
}

export function QuestionCard({ 
    question, 
    isLiked = false, 
    isFavorited = false, 
    isPinned: propIsPinned,
    onLike, 
    onFavorite,
    onShare,
    showSubject = true,
    isAdmin = false,
    onPin,
    onTogglePin,
    understandingStatus,
    onToggleUnderstanding,
    onAuthorClick
}: QuestionCardProps) {
    const navigate = useNavigate();
    const isPinned = propIsPinned !== undefined ? propIsPinned : question.isPinned;
    const difficultyConfig = DIFFICULTY_LABELS[question.difficulty as DifficultyLevel];
    const handlePin = onPin || onTogglePin;
    const showPin = !!onPin || (isAdmin && !!onTogglePin);

    // 安全统计值：兼容 stats 缺失或不完整的场景，避免出现 NaN
    const baseLikes =
        typeof question.stats?.likes === 'number'
            ? question.stats.likes
            : typeof (question as any).likeCount === 'number'
                ? (question as any).likeCount
                : 0;
    const baseFavorites =
        typeof question.stats?.favorites === 'number'
            ? question.stats.favorites
            : typeof (question as any).collectionCount === 'number'
                ? (question as any).collectionCount
                : 0;
    const baseComments =
        typeof question.stats?.comments === 'number'
            ? question.stats.comments
            : 0;

    // 修改原因：点赞/收藏计数以服务端返回值为准，避免本地高亮状态再叠加一次导致显示与真实计数不一致。
    const likesDisplay = baseLikes;
    const favoritesDisplay = baseFavorites;

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
                            <PushPin className="w-2.5 h-2.5 fill-white" />
                        </Badge>
                    )}
                />
            )}

            {/* Badges & Topics */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
                {/* Fallback PushPin Badge if no images */}
                {isPinned && (!question.images || question.images.length === 0) && (
                    <Badge className="bg-blue-600 text-white border-none flex items-center gap-1 min-h-[1.25rem] text-[10px] px-1.5">
                        <PushPin className="w-2.5 h-2.5 fill-white" />
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
            {/* 修改原因：产品当前仅支持数学场景，隐藏固定的 math 标签，避免挤占空间导致换行。 */}
            {showSubject && question.subject !== 'math' && (
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
                    <button
                        type="button"
                        onClick={(e) => {
                            if (!onAuthorClick) return;
                            e.stopPropagation();
                            onAuthorClick(e);
                        }}
                        className={cn(
                            'flex items-center gap-1.5',
                            onAuthorClick ? 'cursor-pointer' : 'cursor-default'
                        )}
                        data-testid="question-author"
                    >
                        <Avatar className="w-4 h-4 border border-gray-100">
                            <AvatarFallback className="text-[8px] bg-gray-50">
                                {question.authorName[0]}
                            </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[80px] font-medium">
                            {question.authorName}
                        </span>
                    </button>
                    <span>·</span>
                    <span className="whitespace-nowrap">{formatDate(question.createdAt)}</span>
                    {onToggleUnderstanding && (
                        <>
                            <span>·</span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleUnderstanding(e);
                                }}
                                className="text-[10px]"
                            >
                                <span
                                    className={cn(
                                        understandingStatus === 'understood'
                                            ? 'text-green-500'
                                            : understandingStatus === 'not_understood'
                                              ? 'text-red-500'
                                              : 'text-gray-400'
                                    )}
                                >
                                    {understandingStatus === 'understood'
                                        ? '弄懂了'
                                        : understandingStatus === 'not_understood'
                                          ? '没弄懂'
                                          : '未标记'}
                                </span>
                            </button>
                        </>
                    )}
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
                        {likesDisplay}
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
                         {favoritesDisplay}
                    </span>
                </button>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/question/${question.id}`);
                    }}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-500 transition-colors"
                >
                    <ChatCircle className="w-3.5 h-3.5" />
                    <span>{baseComments}</span>
                </button>

                <button
                    onClick={async (e) => { 
                        e.stopPropagation(); 

                        if (onShare) {
                            onShare(e);
                            return;
                        }

                        const shareUrl = buildQuestionShareUrl(question.id);
                        if (!shareUrl) {
                            toast.error('暂未配置分享域名，当前不支持复制分享链接');
                            return;
                        }

                        const copied = await copyToClipboardSafe(shareUrl);
                        if (copied) {
                            toast.success('分享链接已复制');
                        } else {
                            toast.success(`分享链接：${shareUrl}`);
                        }
                    }}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-800 transition ml-auto"
                >
                    <ShareNetwork className="w-3.5 h-3.5" />
                </button>

                {showPin && handlePin && (
                    <button
                        className={cn(
                            "flex items-center gap-1 text-[10px] transition-colors",
                            isPinned ? "text-blue-600 hover:text-gray-500" : "text-gray-500 hover:text-blue-600"
                        )}
                        onClick={(e) => { e.stopPropagation(); handlePin(e); }}
                    >
                        {isPinned ? (
                            <>
                                <PushPinSlash className="w-3.5 h-3.5" />
                                <span>取消置顶</span>
                            </>
                        ) : (
                            <>
                                <PushPin className="w-3.5 h-3.5" />
                                <span>置顶</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
