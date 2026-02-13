import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChatCentered } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { GoodQuestionBadge } from '@/components/ui/good-question-badge';
import { questionService } from '@/services/api';

export function GoodQuestionsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['good-questions'],
    queryFn: async () => {
      // 修改原因：改为调用后端“好问题专用接口”，避免客户端在通用列表中二次过滤。
      // ⚠️ 不确定因素：当前页面保持单页展示，先取较大的 pageSize（100）覆盖常见数据量；超大数据量可后续改为分页加载。
      return questionService.getGoodQuestions({ page: 1, pageSize: 100 });
    },
  });

  const goodQuestions = data?.list || [];

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
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">所有好问题</h1>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
          <div className="animate-pulse">加载中...</div>
        </div>
      ) : goodQuestions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
          <ChatCentered className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400">暂时没有好问题哦</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goodQuestions.map((question) => {
            const difficultyBadge = getDifficultyBadge(question.difficulty);

            return (
              <div
                key={question.id}
                onClick={() => navigate(`/question/${question.id}`)}
                className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition cursor-pointer"
              >
                {/* Badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <GoodQuestionBadge />
                  {difficultyBadge && (
                    <Badge
                      className={`${difficultyBadge.className} border-0 px-3 py-0.5 rounded-full text-xs`}
                    >
                      {difficultyBadge.label}
                    </Badge>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(question.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-gray-800 mb-2 line-clamp-2">
                  {question.title}
                </h3>

                {/* Footer info */}
                <div className="flex items-center justify-between text-xs text-gray-400 mt-3">
                  <div className="flex items-center gap-3">
                    {/* 修改原因：产品当前仅支持数学场景，隐藏固定的 math 文本标签，避免底部信息换行。 */}
                    {question.subject !== 'math' && <span>{question.subject}</span>}
                    {question.subject !== 'math' && <span>•</span>}
                    <span>{question.answerCount || 0} 回答</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{question.viewCount || 0} 浏览</span>
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
