import { ArrowLeft, ChatCentered, CaretRight, Trash } from '@phosphor-icons/react';
// 修改原因：按需求保持点赞/收藏图标为原始样式，Heart/Star 回退到 lucide-react。
import { Heart, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';
import { GoodQuestionBadge } from '@/components/ui/good-question-badge';
import { toast } from 'sonner';
import { questionService } from '@/services/api';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function MyQuestionsPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { data, isLoading, refetch } = useQuestions({ authorId: user?.id });
    const [statusStats, setStatusStats] = useState<{
        total: number;
        pending: number;
        approved: number;
    } | null>(null);

    // 未登录用户访问“我的提问”时统一跳转登录页，避免误展示公共列表
    useEffect(() => {
        if (!user) {
            toast.error('请先登录');
            navigate('/login');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (!user) {
            setStatusStats(null);
            return;
        }

        let alive = true;
        // 修改原因：统计卡片改为使用后端聚合结果，避免“仅首屏分页数据”导致待审核数量偏差。
        questionService.getMyStatusCounts()
            .then((stats) => {
                if (!alive) return;
                setStatusStats({
                    total: stats.total,
                    pending: stats.pending,
                    approved: stats.approved
                });
            })
            .catch(() => {
                if (!alive) return;
                // ⚠️ 不确定因素：统计接口临时失败时，先回退为当前页本地统计，可能仍受分页影响。
                setStatusStats(null);
            });

        return () => {
            alive = false;
        };
    }, [user?.id]);

     // 获取当前用户的问题
     const myQuestions = (data?.pages.flatMap(p => p.list) || []).filter(q => q && q.id);

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

    const canDeleteQuestion = (question: any) => {
        const isTeacher = user?.role === 'teacher';
        const isAuthor = user?.id === question.authorId;
        const answers =
            question.answerCount ??
            (question.stats && typeof question.stats.answers === 'number'
                ? question.stats.answers
                : 0);
        const hasAnyAnswer = (answers as number) > 0;
        const isApproved = question.status === 'approved';

        if (isTeacher) return true;
        // 修改原因：前端删除入口与后端权限保持一致，学生已通过问题不展示删除按钮。
        return isAuthor && !hasAnyAnswer && !isApproved;
    };

    const handleDelete = async (e: React.MouseEvent, question: any) => {
        e.stopPropagation();
        if (!window.confirm('确定要删除这个问题吗？此操作无法撤销。')) return;

        try {
            await questionService.delete(question.id);
            toast.success('删除成功');
            await refetch();
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                '删除失败，请稍后重试';
            toast.error(message);
        }
    };

    return (
        <div className="flex flex-col pb-10">
            {/* 统计信息 */}
            <div className="bg-white rounded-3xl p-6 mb-4 shadow-sm">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col justify-center items-center h-full p-2 rounded-xl">
                        <div className="text-2xl font-bold text-gray-800">{statusStats?.total ?? myQuestions.length}</div>
                        <div className="text-sm text-gray-500 mt-1">全部提问</div>
                    </div>
                    <div 
                        data-testid="stat-approved"
                        className="cursor-pointer hover:bg-gray-50 rounded-xl p-2 transition flex flex-col justify-center items-center h-full"
                        onClick={() => navigate('/my-questions/status/approved')}
                    >
                        <div className="text-2xl font-bold text-green-600">
                            {statusStats?.approved ?? myQuestions.filter(q => q.status === 'approved').length}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">已通过</div>
                    </div>
                    <div 
                        data-testid="stat-pending"
                        className="cursor-pointer hover:bg-gray-50 rounded-xl p-2 transition flex flex-col justify-center items-center h-full"
                        onClick={() => navigate('/my-questions/status/pending')}
                    >
                        <div className="text-2xl font-bold text-blue-600">
                            {statusStats?.pending ?? myQuestions.filter(q => q.status === 'pending').length}
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
                    <ChatCentered className="w-16 h-16 text-gray-300 mx-auto mb-4" />
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
                        const statusBadge = getStatusBadge(question.status || 'pending');
                        const answers =
                            question.answerCount ??
                            (question.stats && typeof question.stats.answers === 'number'
                                ? question.stats.answers
                                : 0);

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
                                        {/* 修改原因：产品当前仅支持数学场景，隐藏固定的 math 文本标签，避免底部信息换行。 */}
                                        {question.subject !== 'math' && <span>{question.subject}</span>}
                                        {question.subject !== 'math' && <span>•</span>}
                                        <span>{answers as number} 回答</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* 修改原因：与 QuestionCard 语义保持一致，当前用户已点赞/收藏时显示实心态。 */}
                                        <div className="flex items-center gap-1">
                                            <Star
                                                className={cn(
                                                    'w-3 h-3',
                                                    question.isFavorited ? 'text-yellow-500 fill-yellow-500' : ''
                                                )}
                                            />
                                            <span>{question.collectionCount || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Heart
                                                className={cn(
                                                    'w-3 h-3',
                                                    question.isLiked ? 'text-red-500 fill-red-500' : ''
                                                )}
                                            />
                                            <span>{question.likeCount || 0}</span>
                                        </div>
                                        {canDeleteQuestion(question) && (
                                            <button
                                                type="button"
                                                onClick={(e) => handleDelete(e, question)}
                                                className="text-red-400 hover:text-red-500 transition-colors p-1"
                                                title="删除问题"
                                                data-testid={`delete-question-${question.id}`}
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        )}
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
