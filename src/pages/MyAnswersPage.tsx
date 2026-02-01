import { MessageSquare, ThumbsUp, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { mockAnswers, mockQuestions } from '@/lib/mock-data';

export function MyAnswersPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Flatten answers and filter by current user
    const myAnswers = Object.entries(mockAnswers).flatMap(([questionId, answers]) => {
        return answers.map(answer => ({
            ...answer,
            questionId // ensure questionId is present
        }));
    }).filter(answer => answer.authorId === user?.id);

    // Helper to find question details
    const getQuestion = (questionId: string) => {
        return mockQuestions.find(q => q.id === questionId);
    };

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
            {myAnswers.length === 0 ? (
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
                    {myAnswers.map((answer) => {
                        const question = getQuestion(answer.questionId);
                        
                        return (
                            <div
                                key={answer.id}
                                onClick={() => navigate(`/question/${answer.questionId}`)}
                                className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition cursor-pointer"
                            >
                                {/* Question Title */}
                                <div className="mb-3">
                                    <span className="text-sm font-medium text-gray-500">回答问题：</span>
                                    <h3 className="text-base font-bold text-gray-800 line-clamp-1">
                                        {question?.title || '未知问题'}
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
                        );
                    })}
                </div>
            )}
        </div>
    );
}
