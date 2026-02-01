import { ArrowLeft, MessageSquare, Heart, Star, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// 模拟收藏数据 - 实际应从API或store获取
const mockFavoriteQuestions = [
    {
        id: 'fav1',
        title: '如何理解二次函数的顶点式？',
        content: '我对二次函数的顶点式理解不够深入...',
        authorName: '数学老师',
        createdAt: '2026-01-15T10:00:00Z',
        difficulty: 'medium',
        isGoodQuestion: true,
        isPinned: false,
        topics: ['二次函数', '代数'],
        stats: { likes: 42, favorites: 18, comments: 5, answers: 3 },
        status: 'approved'
    },
    {
        id: 'fav2',
        title: '物理中的能量守恒定律应用',
        content: '能量守恒定律在实际问题中如何应用？',
        authorName: '物理达人',
        createdAt: '2026-01-20T14:30:00Z',
        difficulty: 'hard',
        isGoodQuestion: false,
        isPinned: true,
        topics: ['能量守恒', '力学'],
        stats: { likes: 28, favorites: 12, comments: 8, answers: 2 },
        status: 'approved'
    }
];

export function MyFavoritesPage() {
    const navigate = useNavigate();
    const [myFavorites] = useState(mockFavoriteQuestions);

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
                        <Star className="w-8 h-8 text-yellow-500" />
                        <div className="text-3xl font-bold text-gray-800">{myFavorites.length}</div>
                    </div>
                    <div className="text-sm text-gray-500">收藏的问题</div>
                </div>
            </div>

            {/* 问题列表 */}
            {myFavorites.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
                    <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-400">还没有收藏任何问题</p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-6 px-6 py-2 bg-morandi-5 text-white rounded-full hover:bg-morandi-5/90 transition"
                    >
                        去首页看看
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {myFavorites.map((question) => {
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
                                            <Heart className="w-4 h-4" />
                                            <span>{question.stats.likes}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
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
