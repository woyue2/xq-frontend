import { ArrowLeft, MessageSquare, Heart, Star, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';
import { GoodQuestionBadge } from '@/components/ui/good-question-badge';

export function MyQuestionsPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { data, isLoading } = useQuestions({ authorId: user?.id });

    // 获取当前用户的问题
    const myQuestions = data?.pages.flatMap(p => p.items) || [];

    const getDifficultyBadge = (difficulty?: string) => {
        const difficultyMap: Record<string, { label: string; className: string }> = {
            easy: { label: '简单', className: 'bg-green-100 text-green-700' },
            medium: { label: '中等', className: 'bg-yellow-100 text-yellow-700' },
            hard: { label: '困难', className: 'bg-red-100 text-red-700' },
        };
        return difficulty ? difficultyMap[difficulty] : null;
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            pending: { label: '待审核', className: 'bg-blue-100 text-blue-700' },
            approved: { label: '已通过', className: 'bg-green-100 text-green-700' },
            rejected: { label: '已驳回', className: 'bg-red-100 text-red-700' },
            banned: { label: '已封禁', className: 'bg-gray-100 text-gray-700' },
        };
        return statusMap[status] || statusMap.pending;
    };

    return (
        <div className="flex flex-col pb-10">
            {/* 统计信息 */}
            <div className="bg-white rounded-3xl p-6 mb-4 shadow-sm">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col justify-center items-center h-full p-2 rounded-xl">
                        <div className="text-2xl font-bold text-gray-800">{myQuestions.length}</div>
                        <div className="text-sm text-gray-500 mt-1">全部提问</div>
                    </div>
                    <div 
                        data-testid="stat-approved"
                        className="cursor-pointer hover:bg-gray-50 rounded-xl p-2 transition flex flex-col justify-center items-center h-full"
                        onClick={() => navigate('/my-questions/status/approved')}
                    >
                        <div className="text-2xl font-bold text-green-600">
                            {myQuestions.filter(q => q.status === 'approved').length}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">已通过</div>
                    </div>
                    <div 
                        data-testid="stat-pending"
                        className="cursor-pointer hover:bg-gray-50 rounded-xl p-2 transition flex flex-col justify-center items-center h-full"
                        onClick={() => navigate('/my-questions/status/pending')}
                    >
                        <div className="text-2xl font-bold text-blue-600">
                            {myQuestions.filter(q => q.status === 'pending').length}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">待审核</div>
                    </div>
                </div>
            </div>

            {/* 问题列表 */}
            {isLoading ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
                    <div className="animate-pulse">加载中...</div>
                </div>
            ) : myQuestions.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-400">还没有提问哦</p>
                    <button
                        onClick={() => navigate('/create')}
                        className="mt-6 px-6 py-2 bg-morandi-5 text-white rounded-full hover:bg-morandi-5/90 transition"
                    >
                        去提问
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {myQuestions.map((question) => {
                        const difficultyBadge = getDifficultyBadge(question.difficulty);
                        const statusBadge = getStatusBadge(question.status);

                        return (
                            <div
                                key={question.id}
                                onClick={() => navigate(`/question/${question.id}`)}
                                className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition cursor-pointer"
                            >
                                {/* 状态和标签 */}
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <Badge className={`${statusBadge.className} border-0 px-3 py-0.5 rounded-full text-xs`}>
                                        {statusBadge.label}
                                    </Badge>
                                    {question.isGoodQuestion && (
                                        <GoodQuestionBadge />
                                    )}
                                    {difficultyBadge && (
                                        <Badge className={`${difficultyBadge.className} border-0 px-3 py-0.5 rounded-full text-xs`}>
                                            {difficultyBadge.label}
                                        </Badge>
                                    )}
                                    <span className="text-xs text-gray-400 ml-auto">
                                        {new Date(question.createdAt).toLocaleDateString()}
                                    </span>
                                </div>

                                {/* 标题 */}
                                <h3 className="text-base font-bold text-gray-800 mb-2 line-clamp-2">
                                    {question.title}
                                </h3>

                                {/* 底部信息 */}
                                <div className="flex items-center justify-between text-xs text-gray-400 mt-3">
                                    <div className="flex items-center gap-3">
                                        <span>{question.subject}</span>
                                        <span>•</span>
                                        <span>{question.answerCount || 0} 回答</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1">
                                            <Star className="w-3 h-3" />
                                            <span>{question.collectionCount || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Heart className="w-3 h-3" />
                                            <span>{question.likeCount || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
