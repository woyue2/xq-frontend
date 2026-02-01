import { ArrowLeft, MessageSquare, Heart, Star, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GoodQuestionBadge } from '@/components/ui/good-question-badge';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';

export function StatusListPage() {
    const navigate = useNavigate();
    const { status } = useParams<{ status: string }>();
    const { user } = useAuthStore();
    const { data, isLoading } = useQuestions({ authorId: user?.id });

    // Filter questions based on route param status
    const allQuestions = data?.pages.flatMap(p => p.items) || [];
    const questions = allQuestions.filter(q => q.status === status);

    const getPageTitle = () => {
        switch (status) {
            case 'pending': return '待审核提问';
            case 'approved': return '已通过提问';
            case 'rejected': return '已驳回提问';
            case 'banned': return '已封禁提问';
            default: return '提问列表';
        }
    };

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
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">{getPageTitle()}</h1>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
                    <div className="animate-pulse">加载中...</div>
                </div>
            ) : questions.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-400">暂无{getPageTitle().replace('提问', '')}的内容</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {questions.map((question) => {
                        const difficultyBadge = getDifficultyBadge(question.difficulty);
                        const statusBadge = getStatusBadge(question.status);

                        return (
                            <div
                                key={question.id}
                                onClick={() => navigate(`/question/${question.id}`)}
                                className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition cursor-pointer"
                            >
                                {/* Status and Badges */}
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <Badge className={`${statusBadge.className} border-0 px-3 py-0.5 rounded-full text-xs`}>
                                        {statusBadge.label}
                                    </Badge>
                                    {question.isGoodQuestion && (
                                        <GoodQuestionBadge />
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
                                    {question.tags?.map((tag, index) => (
                                        <Badge key={index} variant="outline" className="text-gray-500 border-gray-200 text-xs px-2 py-0.5">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>

                                {/* Title */}
                                <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-2">
                                    {question.title}
                                </h3>

                                {/* Content Preview */}
                                <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                                    {question.content}
                                </p>

                                {/* Footer Info */}
                                <div className="flex items-center justify-between text-xs text-gray-400">
                                    <div className="flex items-center gap-3">
                                        <span>{new Date(question.createdAt).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Heart className="w-3 h-3" /> {question.stats.likes}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MessageSquare className="w-3 h-3" /> {question.stats.comments}
                                        </span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
