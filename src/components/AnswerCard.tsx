/**
 * [POS] src/components/AnswerCard.tsx
 *   所属：components 层 | 角色：回答卡片组件（显示回答内容、图片、作者、时间）
 *   兄弟：QuestionCard.tsx / ImageGallery.tsx / ImageUploader.tsx
 *
 * [INPUT]
 *   - @/components/ui/avatar         → Avatar / AvatarFallback / AvatarImage
 *   - @/components/ImageGallery      → ImageGallery
 *   - @/types/dto                    → AnswerDTO
 *   - @/lib/utils                    → cn
 *
 * [OUTPUT]
 *   - AnswerCard（回答卡片组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/components/CLAUDE.md 的文件清单
 */
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageGallery } from '@/components/ImageGallery';
import { cn } from '@/lib/utils';
import type { AnswerDTO } from '@/types/dto';

export interface AnswerCardProps {
  answer: AnswerDTO;
  className?: string;
}

export function AnswerCard({ answer, className }: AnswerCardProps) {
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
          <AvatarImage src={answer.authorAvatar} alt={answer.authorName} />
          <AvatarFallback className="text-xs">
            {answer.authorName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{answer.authorName}</span>
          <span className="text-xs text-gray-500">{formatDate(answer.createdAt)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="text-gray-800 mb-3 whitespace-pre-wrap">
        {answer.content}
      </div>

      {/* Images */}
      {answer.images && answer.images.length > 0 && (
        <div className="mt-3">
          <ImageGallery images={answer.images} />
        </div>
      )}
    </div>
  );
}
