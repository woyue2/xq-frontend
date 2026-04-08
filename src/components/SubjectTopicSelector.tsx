/**
 * [POS] src/components/SubjectTopicSelector.tsx
 *   所属：components 层 | 角色：科目和考点选择器组件
 *   兄弟：QuestionCard.tsx / ImageUploader.tsx / QuestionFilter.tsx
 *
 * [INPUT]
 *   - react                          → useEffect
 *   - swr                            → useSWR
 *   - @/lib/swr-config               → fetcher
 *   - @/components/ui/select         → Select / SelectContent / SelectItem / SelectTrigger / SelectValue
 *   - @/components/ui/label          → Label
 *   - @/types/dto                    → SubjectDTO / TopicDTO
 *   - @/lib/utils                    → cn
 *
 * [OUTPUT]
 *   - SubjectTopicSelector（科目和考点选择器组件，带 SWR 缓存）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/components/CLAUDE.md 的文件清单
 */
import { useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { SubjectDTO, TopicDTO } from '@/types/dto';

export interface SubjectTopicSelectorProps {
  subjectValue?: string;
  topicValue?: string;
  onSubjectChange?: (value: string) => void;
  onTopicChange?: (value: string) => void;
  className?: string;
  required?: boolean;
}

export function SubjectTopicSelector({
  subjectValue,
  topicValue,
  onSubjectChange,
  onTopicChange,
  className,
  required = false,
}: SubjectTopicSelectorProps) {
  // Fetch subjects with SWR (1-minute cache)
  const { data: subjects = [], isLoading: loadingSubjects } = useSWR<SubjectDTO[]>(
    '/api/subjects',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute (shorter than previous 5 min)
    }
  );

  // Fetch topics with SWR when subject is selected (1-minute cache)
  const { data: topics = [], isLoading: loadingTopics } = useSWR<TopicDTO[]>(
    subjectValue ? `/api/subjects?key=${subjectValue}&topics=1` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  // Clear topic when subject changes
  useEffect(() => {
    if (subjectValue && topicValue) {
      // Check if current topic belongs to selected subject
      const topicExists = topics.some(t => t.value === topicValue);
      if (!topicExists && topics.length > 0) {
        onTopicChange?.('');
      }
    }
  }, [subjectValue, topics, topicValue, onTopicChange]);

  const handleSubjectChange = (value: string) => {
    onSubjectChange?.(value);
    // Clear topic when subject changes
    if (topicValue) {
      onTopicChange?.('');
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Subject Selector */}
      <div className="space-y-2">
        <Label htmlFor="subject">
          科目 {required && <span className="text-red-500">*</span>}
        </Label>
        <Select
          value={subjectValue}
          onValueChange={handleSubjectChange}
          disabled={loadingSubjects}
        >
          <SelectTrigger id="subject">
            <SelectValue placeholder={loadingSubjects ? '加载中...' : '请选择科目'} />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.key}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Topic Selector */}
      <div className="space-y-2">
        <Label htmlFor="topic">考点</Label>
        <Select
          value={topicValue}
          onValueChange={onTopicChange}
          disabled={!subjectValue || loadingTopics}
        >
          <SelectTrigger id="topic">
            <SelectValue
              placeholder={
                !subjectValue
                  ? '请先选择科目'
                  : loadingTopics
                  ? '加载中...'
                  : '请选择考点（可选）'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {topics.map((topic) => (
              <SelectItem key={topic.id} value={topic.value}>
                {topic.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
