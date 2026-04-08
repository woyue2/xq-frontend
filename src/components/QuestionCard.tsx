/**
 * [POS] src/components/QuestionCard.tsx
 *   所属：components 层 | 角色：问题卡片组件（显示问题摘要，支持点击跳转）
 *   兄弟：ImageGallery.tsx / ImageUploader.tsx / QuestionFilter.tsx
 *
 * [INPUT]
 *   - react-router-dom               → useNavigate
 *   - @/components/ui/badge          → Badge
 *   - @/components/ui/avatar         → Avatar / AvatarFallback / AvatarImage
 *   - @/components/ImageGallery      → ImageGallery
 *   - @/types/dto                    → QuestionDTO
 *   - @/lib/utils                    → cn
 *
 * [OUTPUT]
 *   - QuestionCard（问题卡片组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/components/CLAUDE.md 的文件清单
 */
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageGallery } from '@/components/ImageGallery';
import { cn } from '@/lib/utils';
import type { QuestionDTO } from '@/types/dto';

export interface QuestionCardProps {
  question: QuestionDTO;
  className?: string;
}

export function QuestionCard({ question, className }: QuestionCardProps) {
  const navigate = useNavigate();

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

  const handleClick = () => {
    navigate(`/question/${question.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer',
        className
      )}
    >
      {/* Images */}
      {question.images && question.images.length > 0 && (
        <div className="mb-3">
          <ImageGallery images={question.images} maxVisible={3} />
        </div>
      )}

      {/* Subject Badge */}
      {question.subject && (
        <Badge variant="outline" className="mb-2">
          {question.subject}
        </Badge>
      )}

      {/* Tags (Topics) */}
      {question.tags && question.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {question.tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900 mb-3 line-clamp-2">
        {question.title}
      </h3>

      {/* Author & Meta */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Avatar className="w-6 h-6">
          <AvatarImage src={question.authorAvatar} alt={question.authorName} />
          <AvatarFallback className="text-xs">
            {question.authorName[0]}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{question.authorName}</span>
        <span>·</span>
        <span>{formatDate(question.createdAt)}</span>
      </div>
    </div>
  );
}
