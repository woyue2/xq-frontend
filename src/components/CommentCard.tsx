/**
 * [POS] src/components/CommentCard.tsx
 *   所属：components 层 | 角色：评论卡片组件（显示评论内容、图片、作者、时间）
 *   兄弟：QuestionCard.tsx / AnswerCard.tsx / ImageGallery.tsx
 *
 * [INPUT]
 *   - @/components/ui/avatar         → Avatar / AvatarFallback / AvatarImage
 *   - @/types/dto                    → CommentDTO
 *   - @/lib/utils                    → cn
 *
 * [OUTPUT]
 *   - CommentCard（评论卡片组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/components/CLAUDE.md 的文件清单
 */
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { CommentDTO } from '@/types/dto';

export interface CommentCardProps {
  comment: CommentDTO;
  className?: string;
}

export function CommentCard({ comment, className }: CommentCardProps) {
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
    <div
      className={cn(
        'bg-white rounded-lg p-4 shadow-sm',
        className
      )}
    >
      {/* Author & Meta */}
      <div className="flex items-center gap-2 mb-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={comment.authorAvatar} alt={comment.authorName} />
          <AvatarFallback className="text-xs">
            {comment.authorName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{comment.authorName}</span>
          <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="text-gray-800 mb-3 whitespace-pre-wrap">
        {comment.content}
      </div>

      {/* Single Image */}
      {comment.image && (
        <div className="mt-3">
          <img
            src={comment.image}
            alt="评论图片"
            className="rounded-lg max-w-full h-auto"
          />
        </div>
      )}
    </div>
  );
}
