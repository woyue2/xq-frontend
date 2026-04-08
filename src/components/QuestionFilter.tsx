/**
 * [POS] src/components/QuestionFilter.tsx
 *   所属：components 层 | 角色：问题筛选器组件
 *   兄弟：QuestionCard.tsx / SubjectTopicSelector.tsx / ImageUploader.tsx
 *
 * [INPUT]
 *   - react                          → useState / useEffect / useRef
 *   - @/components/SubjectTopicSelector → SubjectTopicSelector
 *   - @/components/ui/input          → Input
 *   - @/components/ui/button         → Button
 *   - @/lib/utils                    → cn
 *
 * [OUTPUT]
 *   - QuestionFilter（问题筛选器组件，带搜索防抖）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/components/CLAUDE.md 的文件清单
 */
import { useState, useEffect, useRef } from 'react';
import { SubjectTopicSelector } from '@/components/SubjectTopicSelector';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface QuestionFilterProps {
  subject?: string;
  topic?: string;
  search?: string;
  onFilterChange?: (filters: { subject?: string; topic?: string; search?: string }) => void;
  className?: string;
}

export function QuestionFilter({
  subject,
  topic,
  search,
  onFilterChange,
  className,
}: QuestionFilterProps) {
  const [localSubject, setLocalSubject] = useState(subject || '');
  const [localTopic, setLocalTopic] = useState(topic || '');
  const [localSearch, setLocalSearch] = useState(search || '');
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-apply filters when subject or topic changes
  useEffect(() => {
    onFilterChange?.({
      subject: localSubject || undefined,
      topic: localTopic || undefined,
      search: localSearch || undefined,
    });
  }, [localSubject, localTopic]);

  // Debounced search handler
  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer (500ms delay)
    debounceTimerRef.current = setTimeout(() => {
      onFilterChange?.({
        subject: localSubject || undefined,
        topic: localTopic || undefined,
        search: value || undefined,
      });
    }, 500);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleApplyFilters = () => {
    // Clear debounce timer and apply immediately
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onFilterChange?.({
      subject: localSubject || undefined,
      topic: localTopic || undefined,
      search: localSearch || undefined,
    });
  };

  const handleClearFilters = () => {
    setLocalSubject('');
    setLocalTopic('');
    setLocalSearch('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onFilterChange?.({
      subject: undefined,
      topic: undefined,
      search: undefined,
    });
  };

  return (
    <div className={cn('bg-white rounded-lg p-4 shadow-sm space-y-4', className)}>
      {/* Subject and Topic Selector */}
      <SubjectTopicSelector
        subjectValue={localSubject}
        topicValue={localTopic}
        onSubjectChange={setLocalSubject}
        onTopicChange={setLocalTopic}
      />

      {/* Search Input */}
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="搜索问题标题或内容..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleApplyFilters();
            }
          }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleApplyFilters} className="flex-1">
          应用筛选
        </Button>
        <Button onClick={handleClearFilters} variant="outline">
          清除
        </Button>
      </div>
    </div>
  );
}
