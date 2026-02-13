import { useEffect } from 'react';
import { ArrowLeft, ChatCentered, CaretRight } from '@phosphor-icons/react';
// 修改原因：按需求保持点赞/收藏图标为原始样式，Heart/Star 回退到 lucide-react。
import { Heart, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GoodQuestionBadge } from '@/components/ui/good-question-badge';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';
import { toast } from 'sonner';

export function StatusListPage() {
    const navigate = useNavigate();
    const { status } = useParams<{ status: string }>();
    const { user } = useAuthStore();
    const normalizedStatus =
      status === 'pending' || status === 'approved' || status === 'rejected' || status === 'banned'
        ? status
        : undefined;
    const { data, isLoading } = useQuestions({
        // 修改原因：状态页应由后端按状态过滤，避免仅在首屏分页数据里前端过滤导致 pending 漏显示。
        status: normalizedStatus,
        authorId: user && user.role !== 'parent' ? user.id : undefined
    });

    // 权限保护：仅已登录的非家长用户可以访问状态列表页
    useEffect(() => {
        if (!user) {
            toast.error('请先登录后查看你的提问状态');
            navigate('/login');
            return;
        }

        if (user.role === 'parent') {
            toast.error('家长账号无法查看提问状态列表');
            navigate('/profile');
        }
    }, [user, navigate]);

     // 修改原因：后端已按 status 过滤，这里只做空值兜底，避免重复过滤造成边界数据丢失。
     const questions = (data?.pages.flatMap(p => p.list) || []).filter(q => q && q.id);

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
                    <ChatCentered className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-400">暂无{getPageTitle().replace('提问', '')}的内容</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {questions.map((question) => {
                        const difficultyBadge = getDifficultyBadge(question.difficulty);
                        const statusBadge = getStatusBadge(question.status || 'pending');

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
                                            <ChatCentered className="w-3 h-3" /> {question.stats.comments}
                                        </span>
                                    </div>
                                    <CaretRight className="w-4 h-4 text-gray-300" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
