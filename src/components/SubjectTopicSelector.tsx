/**
 * [POS] src/components/SubjectTopicSelector.tsx
 *   所属：components 层 | 角色：科目和考点选择器组件
 *   兄弟：QuestionCard.tsx / ImageUploader.tsx / QuestionFilter.tsx
 *
 * [INPUT]
 *   - react                          → useState / useEffect
 *   - @/components/ui/select         → Select / SelectContent / SelectItem / SelectTrigger / SelectValue
 *   - @/components/ui/label          → Label
 *   - @/types/dto                    → SubjectDTO / TopicDTO
 *   - @/lib/utils                    → cn
 *
 * [OUTPUT]
 *   - SubjectTopicSelector（科目和考点选择器组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/components/CLAUDE.md 的文件清单
 */
import { useState, useEffect } from 'react';
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

// Simple in-memory cache for subjects (they rarely change)
let subjectsCache: SubjectDTO[] | null = null;
let subjectsCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Topic cache by subject key
const topicsCache: Map<string, { data: TopicDTO[]; time: number }> = new Map();

export function SubjectTopicSelector({
  subjectValue,
  topicValue,
  onSubjectChange,
  onTopicChange,
  className,
  required = false,
}: SubjectTopicSelectorProps) {
  const [subjects, setSubjects] = useState<SubjectDTO[]>([]);
  const [topics, setTopics] = useState<TopicDTO[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Load subjects on mount (with caching)
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        
        // Check cache first
        const now = Date.now();
        if (subjectsCache && (now - subjectsCacheTime) < CACHE_DURATION) {
          setSubjects(subjectsCache);
          setLoadingSubjects(false);
          return;
        }

        // Fetch from API
        const response = await fetch('/api/subjects');
        const data = await response.json();
        
        if (data.code === 200) {
          subjectsCache = data.data;
          subjectsCacheTime = now;
          setSubjects(data.data);
        }
      } catch (error) {
        console.error('Failed to load subjects:', error);
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, []);

  // Load topics when subject changes (with caching)
  useEffect(() => {
    if (!subjectValue) {
      setTopics([]);
      return;
    }

    const fetchTopics = async () => {
      try {
        setLoadingTopics(true);
        
        // Check cache first
        const now = Date.now();
        const cached = topicsCache.get(subjectValue);
        if (cached && (now - cached.time) < CACHE_DURATION) {
          setTopics(cached.data);
          setLoadingTopics(false);
          return;
        }

        // Fetch from API
        const response = await fetch(`/api/subjects?key=${subjectValue}&topics=1`);
        const data = await response.json();
        
        if (data.code === 200) {
          topicsCache.set(subjectValue, { data: data.data, time: now });
          setTopics(data.data);
        }
      } catch (error) {
        console.error('Failed to load topics:', error);
      } finally {
        setLoadingTopics(false);
      }
    };

    fetchTopics();
  }, [subjectValue]);

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
