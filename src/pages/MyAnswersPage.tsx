import { ChatCentered, ThumbsUp, CaretRight } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEffect, useState } from 'react';
import type { MyAnswerSummary, MyAnswerTodoQuestion } from '@/types/api';
import { profileService } from '@/services/api';
import { toast } from 'sonner';

type MyAnswersPageProps = {
    view?: 'pending' | 'answered';
};

export function MyAnswersPage({ view = 'pending' }: MyAnswersPageProps) {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [myAnswers, setMyAnswers] = useState<MyAnswerSummary[]>([]);
    const [todoQuestions, setTodoQuestions] = useState<MyAnswerTodoQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        const loader =
            view === 'answered'
                ? profileService.getMyAnswers({ page: 1, pageSize: 50 })
                : profileService.getMyAnswerTodos({ page: 1, pageSize: 50 });

        loader
            .then((data) => {
                // 修改原因：根据页面类型选择对应数据源，修复“待回答”口径错误（应为待老师作答问题）。
                const safeList = Array.isArray(data.list) ? data.list : [];
                if (view === 'answered') {
                    setMyAnswers(safeList as MyAnswerSummary[]);
                    setTodoQuestions([]);
                    return;
                }
                setTodoQuestions(safeList as MyAnswerTodoQuestion[]);
                setMyAnswers([]);
            })
            .catch((err) => {
                // eslint-disable-next-line no-console
                console.error('加载我的回答失败', err);
                toast.error(view === 'answered' ? '加载我的回答列表失败，请稍后重试' : '加载待回答问题失败，请稍后重试');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [user, view]);

    // 对未登录或非老师账号在 UI 层直接不渲染内容，避免闪现不符合身份的页面
    if (!user || user.role !== 'teacher') {
        return null;
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    // 修改原因：基于路由页面类型（待回答/已回答）做最小过滤，不改后端接口。
    const filteredAnswers = myAnswers.filter((answer) => {
        if (view === 'answered') {
            return answer.status === 'approved';
        }
        // ⚠️ 不确定因素：当前“待回答”口径按“非 approved”处理（含 pending/rejected）；
        // 若后续产品定义为“仅 pending”，可在此改为 answer.status === 'pending'。
        return answer.status !== 'approved';
    });

    const pendingQuestions = view === 'pending' ? todoQuestions : [];
    const pageTitle = view === 'answered' ? '已回答' : '待回答';
    const leftCount = view === 'answered' ? filteredAnswers.length : pendingQuestions.length;
    const rightCount =
        view === 'answered'
            ? filteredAnswers.reduce((sum, a) => sum + (a.likes || 0), 0)
            : pendingQuestions.reduce((sum, q) => sum + (q.likes || 0), 0);

    return (
        <div className="flex flex-col pb-10">
            {/* Header statistics */}
            <div className="bg-white rounded-3xl p-6 mb-4 shadow-sm">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-gray-800">{leftCount}</div>
                        <div className="text-sm text-gray-500 mt-1">{pageTitle}</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-green-600">{rightCount}</div>
                        <div className="text-sm text-gray-500 mt-1">{view === 'answered' ? '获赞总数' : '题目获赞总数'}</div>
                    </div>
                </div>
            </div>

            {/* Answer List */}
            {isLoading ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
                    <div className="animate-pulse text-gray-400">加载中...</div>
                </div>
            ) : (view === 'answered' ? filteredAnswers.length === 0 : pendingQuestions.length === 0) ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
                    <ChatCentered className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-400">
                        {view === 'answered' ? '还没有已回答记录哦' : '暂无待回答问题'}
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-6 px-6 py-2 bg-morandi-5 text-white rounded-full hover:bg-morandi-5/90 transition"
                    >
                        去首页看看
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {view === 'answered'
                        ? filteredAnswers.map((answer) => (
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
                                          <CaretRight className="w-4 h-4 ml-2" />
                                      </div>
                                  </div>
                              </div>
                          ))
                        : pendingQuestions.map((question) => (
                              <div
                                  key={question.id}
                                  onClick={() => navigate(`/question/${question.id}`)}
                                  className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition cursor-pointer"
                              >
                                  <div className="mb-3">
                                      <span className="text-sm font-medium text-gray-500">待回答问题：</span>
                                      <h3 className="text-base font-bold text-gray-800 line-clamp-1">
                                          {question.title || '未知问题'}
                                      </h3>
                                  </div>

                                  <p className="text-gray-600 text-sm line-clamp-2 mb-3 bg-gray-50 p-3 rounded-xl">
                                      {question.content || '暂无问题描述'}
                                  </p>

                                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                      <div className="flex items-center gap-4 text-sm text-gray-500">
                                          <div className="flex items-center gap-1">
                                              <ThumbsUp className="w-4 h-4" />
                                              <span>{question.likes}</span>
                                          </div>
                                          <span className="text-xs text-gray-400">
                                              {formatDate(question.createdAt)}
                                          </span>
                                      </div>
                                      
                                      <div className="flex items-center text-xs text-gray-400">
                                          <Badge className="bg-blue-100 text-blue-700 border-0 px-2">待作答</Badge>
                                          <CaretRight className="w-4 h-4 ml-2" />
                                      </div>
                                  </div>
                              </div>
                          ))}
                </div>
            )}
        </div>
    );
}
