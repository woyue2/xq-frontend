import { MessageSquare, ThumbsUp, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEffect, useState } from 'react';
import type { MyAnswerSummary } from '@/types/api';
import { profileService } from '@/services/api';
import { toast } from 'sonner';

export function MyAnswersPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [myAnswers, setMyAnswers] = useState<MyAnswerSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // 未登录用户直接跳转登录页，避免在未授权状态下访问个人回答列表
        if (!user) {
            navigate('/login');
            return;
        }

        // 业务规则：只有老师才会有回答记录，学生/家长访问该页面时提示并回到个人中心
        if (user.role !== 'teacher') {
            toast.error('只有老师可以查看我的回答');
            navigate('/profile');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (!user || user.role !== 'teacher') return;
        setIsLoading(true);
        profileService
            .getMyAnswers({ page: 1, pageSize: 50 })
            .then((data) => {
                setMyAnswers(data.items);
            })
            .catch((err) => {
                // eslint-disable-next-line no-console
                console.error('加载我的回答失败', err);
                toast.error('加载我的回答列表失败，请稍后重试');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [user]);

    // 对未登录或非老师账号在 UI 层直接不渲染内容，避免闪现不符合身份的页面
    if (!user || user.role !== 'teacher') {
        return null;
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col pb-10">
            {/* Header statistics */}
            <div className="bg-white rounded-3xl p-6 mb-4 shadow-sm">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-gray-800">{myAnswers.length}</div>
                        <div className="text-sm text-gray-500 mt-1">我的回答</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-green-600">
                            {myAnswers.reduce((sum, a) => sum + (a.likes || 0), 0)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">获赞总数</div>
                    </div>
                </div>
            </div>

            {/* Answer List */}
            {isLoading ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
                    <div className="animate-pulse text-gray-400">加载中...</div>
                </div>
            ) : myAnswers.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-400">还没有回答过问题哦</p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-6 px-6 py-2 bg-morandi-5 text-white rounded-full hover:bg-morandi-5/90 transition"
                    >
                        去首页看看
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {myAnswers.map((answer) => (
                        <div
                            key={answer.id}
                            onClick={() => navigate(`/question/${answer.questionId}`)}
                            className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition cursor-pointer"
                        >
                            {/* Question Title */}
                            <div className="mb-3">
                                <span className="text-sm font-medium text-gray-500">回答问题：</span>
                                <h3 className="text-base font-bold text-gray-800 line-clamp-1">
                                    {answer.questionTitle || '未知问题'}
                                </h3>
                            </div>

                            {/* Answer Content Preview */}
                            <p className="text-gray-600 text-sm line-clamp-2 mb-3 bg-gray-50 p-3 rounded-xl">
                                {answer.content}
                            </p>

                            {/* Footer Stats */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <ThumbsUp className="w-4 h-4" />
                                        <span>{answer.likes}</span>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {formatDate(answer.createdAt)}
                                    </span>
                                </div>
                                
                                <div className="flex items-center text-xs text-gray-400">
                                    {answer.status === 'approved' ? (
                                        <Badge className="bg-green-100 text-green-700 border-0 px-2">已发布</Badge>
                                    ) : (
                                        <Badge className="bg-yellow-100 text-yellow-700 border-0 px-2">审核中</Badge>
                                    )}
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
