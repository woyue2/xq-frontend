import { ArrowLeft, MessageSquare, Heart, Star, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

// 模拟点赞数据 - 实际应从API或store获取
const mockLikedQuestions = [
    {
        id: 'like1',
        title: '英语作文高分技巧汇总',
        content: '整理了一些英语作文的高分技巧...',
        authorName: '英语达人',
        createdAt: '2026-01-18T09:00:00Z',
        difficulty: 'easy',
        isGoodQuestion: true,
        isPinned: false,
        topics: ['英语作文', '写作技巧'],
        stats: { likes: 156, favorites: 89, comments: 23, answers: 5 },
        status: 'approved'
    },
    {
        id: 'like2',
        title: '化学方程式配平口诀',
        content: '分享一个简单易记的化学方程式配平口诀...',
        authorName: '化学小王子',
        createdAt: '2026-01-22T16:00:00Z',
        difficulty: 'medium',
        isGoodQuestion: false,
        isPinned: false,
        topics: ['化学方程式', '配平'],
        stats: { likes: 78, favorites: 34, comments: 12, answers: 2 },
        status: 'approved'
    }
];

export function MyLikesPage() {
    const navigate = useNavigate();
    const [myLikes] = useState(mockLikedQuestions);

    const getDifficultyBadge = (difficulty?: string) => {
        const difficultyMap: Record<string, { label: string; className: string }> = {
            easy: { label: '简单', className: 'bg-green-100 text-green-700' },
            medium: { label: '中等', className: 'bg-yellow-100 text-yellow-700' },
            hard: { label: '困难', className: 'bg-red-100 text-red-700' },
        };
        return difficulty ? difficultyMap[difficulty] : null;
    };

    return (
        <div className="flex flex-col pb-10">
            {/* 统计信息 */}
            <div className="bg-white rounded-3xl p-6 mb-4 shadow-sm">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <Heart className="w-8 h-8 text-red-500" />
                        <div className="text-3xl font-bold text-gray-800">{myLikes.length}</div>
                    </div>
                    <div className="text-sm text-gray-500">点赞的问题</div>
                </div>
            </div>

            {/* 问题列表 */}
            {myLikes.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
                    <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-400">还没有点赞任何问题</p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-6 px-6 py-2 bg-morandi-5 text-white rounded-full hover:bg-morandi-5/90 transition"
                    >
                        去首页看看
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {myLikes.map((question) => {
                        const difficultyBadge = getDifficultyBadge(question.difficulty);

                        return (
                            <div
                                key={question.id}
                                onClick={() => navigate(`/question/${question.id}`)}
                                className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition cursor-pointer"
                            >
                                {/* 标签 */}
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    {question.isGoodQuestion && (
                                        <Badge className="bg-red-50 text-red-600 border-0 px-3 py-0.5 rounded-full text-xs">
                                            好问题
                                        </Badge>
                                    )}
                                    {question.isPinned && (
                                        <Badge className="bg-purple-50 text-purple-600 border-0 px-3 py-0.5 rounded-full text-xs">
                                            置顶
                                        </Badge>
                                    )}
                                    {difficultyBadge && (
                                        <Badge className={`${difficultyBadge.className} border-0 px-3 py-0.5 rounded-full text-xs`}>
                                            {difficultyBadge.label}
                                        </Badge>
                                    )}
                                </div>

                                {/* 标题 */}
                                <h3 className="font-medium text-gray-800 mb-2 line-clamp-2">{question.title}</h3>

                                {/* 内容预览 */}
                                {question.content && (
                                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{question.content}</p>
                                )}

                                {/* 标签 */}
                                {question.topics && question.topics.length > 0 && (
                                    <div className="flex gap-2 mb-3 flex-wrap">
                                        {question.topics.map((topic, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-morandi-1/30 text-gray-600 rounded-full text-xs"
                                            >
                                                #{topic}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* 作者信息 */}
                                <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                                    <span>{question.authorName}</span>
                                    <span>•</span>
                                    <span>{new Date(question.createdAt).toLocaleDateString('zh-CN')}</span>
                                </div>

                                {/* 底部统计 */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                                            <span>{question.stats.likes}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4" />
                                            <span>{question.stats.favorites}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MessageSquare className="w-4 h-4" />
                                            <span>{question.stats.answers}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
