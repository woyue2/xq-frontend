/**
 * [POS] src/components/QuestionFilter.tsx
 *   所属：components 层 | 角色：问题列表筛选器（学科/话题/状态等）
 *   兄弟：QuestionCard.tsx / QuestionList.tsx
 *
 * [INPUT]
 *   - react                             → useEffect / useState
 *   - lucide-react                      → Filter
 *   - @/lib/utils                       → cn
 *   - @/services/subjectConfig.service  → subjectConfigService
 *   - @/types/api                       → SubjectDto
 *
 * [OUTPUT]
 *   - QuestionFilter（筛选器组件）
 *   - QuestionFilterProps（interface）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/components/CLAUDE.md 的文件清单
 */
import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subjectConfigService } from '@/services/subjectConfig.service';
import type { SubjectDto } from '@/types/api';

export interface QuestionFilterProps {
  selectedSubject: string;
  setSelectedSubject: (subject: string) => void;
  selectedTopic: string;
  setSelectedTopic: (topic: string) => void;
}

export function QuestionFilter({
  selectedSubject,
  setSelectedSubject,
  selectedTopic,
  setSelectedTopic,
}: QuestionFilterProps) {
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);

  useEffect(() => {
    subjectConfigService
      .getSubjects()
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

  const currentSubject = subjects.find((s) => s.key.replace('subject_', '') === selectedSubject);

  return (
    <div className="sticky top-[3.5rem] z-40 bg-gray-50/95 backdrop-blur py-2 -mx-4 px-4 space-y-2 transition-all">
      {/* Subject Filter (Capsules) */}
      <div className="flex overflow-x-auto gap-2 scrollbar-hide pb-1">
        <button
          onClick={() => {
            setSelectedSubject('');
            setSelectedTopic('');
          }}
          className={cn(
            'px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border',
            !selectedSubject
              ? 'bg-gray-800 text-white border-gray-800 shadow-md'
              : 'bg-white text-gray-600 border-gray-200',
          )}
        >
          全部
        </button>
        {subjects.map((sub) => (
          <button
            key={sub.key}
            onClick={() => {
              setSelectedSubject(sub.key.replace('subject_', ''));
              setSelectedTopic('');
            }}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border',
              selectedSubject === sub.key.replace('subject_', '')
                ? 'bg-gray-800 text-white border-gray-800 shadow-md'
                : 'bg-white text-gray-600 border-gray-200',
            )}
          >
            {sub.name}
          </button>
        ))}
      </div>

      {/* Topic Filter */}
      {selectedSubject && currentSubject && currentSubject.topics.length > 0 && (
        <div className="flex overflow-x-auto gap-2 scrollbar-hide border-t border-gray-200 pt-2">
          <div className="flex items-center text-xs text-gray-400 px-1">
            <Filter className="w-3 h-3 mr-1" />
            考点:
          </div>
          {currentSubject.topics.map((topic) => (
            <button
              key={topic.value}
              onClick={() => setSelectedTopic(selectedTopic === topic.value ? '' : topic.value)}
              className={cn(
                'px-3 py-1 rounded-md text-[10px] whitespace-nowrap transition-colors',
                selectedTopic === topic.value
                  ? 'bg-morandi-3 text-morandi-5 font-bold'
                  : 'bg-white text-gray-500 hover:bg-gray-100',
              )}
            >
              {topic.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
