/**
 * [POS] src/components/QuestionDetail.tsx
 *   所属：components 层 | 角色：问题详情组件（显示完整问题内容、回答列表、评论列表）
 *   兄弟：QuestionCard.tsx / ImageGallery.tsx / ImageUploader.tsx
 *
 * [INPUT]
 *   - react                          → useState / useEffect
 *   - @/components/ui/badge          → Badge
 *   - @/components/ui/avatar         → Avatar / AvatarFallback / AvatarImage
 *   - @/components/ui/button         → Button
 *   - @/components/ImageGallery      → ImageGallery
 *   - @/types/dto                    → QuestionDTO / AnswerDTO / CommentDTO
 *   - @/lib/utils                    → cn
 *
 * [OUTPUT]
 *   - QuestionDetail（问题详情组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/components/CLAUDE.md 的文件清单
 */
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ImageGallery } from '@/components/ImageGallery';
import { cn } from '@/lib/utils';
import type { QuestionDTO, AnswerDTO, CommentDTO } from '@/types/dto';

export interface QuestionDetailProps {
  question: QuestionDTO;
  answers?: AnswerDTO[];
  comments?: CommentDTO[];
  isLoggedIn?: boolean;
  onAnswer?: () => void;
  onComment?: () => void;
  className?: string;
}

export function QuestionDetail({
  question,
  answers = [],
  comments = [],
  isLoggedIn = false,
  onAnswer,
  onComment,
  className
}: QuestionDetailProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const MILLIS_PER_MINUTE = 60_000;
    const MILLIS_PER_HOUR = 3_600_000;
    const MILLIS_PER_DAY = 86_400_000;
    if (diff < MILLIS_PER_MINUTE) return '刚刚';
    if (diff < MILLIS_PER_HOUR) return `${Math.floor(diff / MILLIS_PER_MINUTE)}分钟前`;
    if (diff < MILLIS_PER_DAY) return `${Math.floor(diff / MILLIS_PER_HOUR)}小时前`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn('bg-white rounded-lg shadow-sm', className)}>
      {/* Question Content */}
      <div className="p-6 border-b">
        {/* Subject Badge */}
        {question.subject && (
          <Badge variant="outline" className="mb-3">
            {question.subject}
          </Badge>
        )}

        {/* Tags (Topics) */}
        {question.tags && question.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {question.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {question.title}
        </h1>

        {/* Content */}
        {question.content && (
          <p className="text-gray-700 mb-4 whitespace-pre-wrap">
            {question.content}
          </p>
        )}

        {/* Images */}
        {question.images && question.images.length > 0 && (
          <div className="mb-4">
            <ImageGallery images={question.images} />
          </div>
        )}

        {/* Author & Meta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={question.authorAvatar} alt={question.authorName} />
              <AvatarFallback>
                {question.authorName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-gray-900">{question.authorName}</div>
              <div className="text-sm text-gray-500">{formatDate(question.createdAt)}</div>
            </div>
          </div>

          {/* Action Buttons (Logged-in users only) */}
          {isLoggedIn && (
            <div className="flex gap-2">
              <Button onClick={onAnswer} variant="default" size="sm">
                回答
              </Button>
              <Button onClick={onComment} variant="outline" size="sm">
                评论
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Answers Section */}
      {answers.length > 0 && (
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            回答 ({answers.length})
          </h2>
          <div className="space-y-4">
            {answers.map((answer) => (
              <div key={answer.id} className="bg-gray-50 rounded-lg p-4">
                {/* Answer Content */}
                <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                  {answer.content}
                </p>

                {/* Answer Images */}
                {answer.images && answer.images.length > 0 && (
                  <div className="mb-3">
                    <ImageGallery images={answer.images} maxVisible={3} />
                  </div>
                )}

                {/* Answer Author & Meta */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={answer.authorAvatar} alt={answer.authorName} />
                    <AvatarFallback className="text-xs">
                      {answer.authorName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{answer.authorName}</span>
                  <span>·</span>
                  <span>{formatDate(answer.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          评论 ({comments.length})
        </h2>
        {comments.length > 0 ? (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={comment.authorAvatar} alt={comment.authorName} />
                  <AvatarFallback className="text-xs">
                    {comment.authorName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">
                      {comment.authorName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                  {comment.image && (
                    <div className="mt-2">
                      <ImageGallery images={[comment.image]} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">暂无评论</p>
        )}
      </div>
    </div>
  );
}
