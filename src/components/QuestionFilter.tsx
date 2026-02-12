import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TAXONOMY, SUBJECT_OPTIONS } from '@/config/taxonomy';

interface QuestionFilterProps {
  selectedSubject: string;
  setSelectedSubject: (subject: string) => void;
  selectedTopic: string;
  setSelectedTopic: (topic: string) => void;
}

export function QuestionFilter({
  selectedSubject,
  setSelectedSubject,
  selectedTopic,
  setSelectedTopic
}: QuestionFilterProps) {
  return (
    <div className="sticky top-[3.5rem] z-40 bg-gray-50/95 backdrop-blur py-2 -mx-4 px-4 space-y-2 transition-all">
      {/* Subject Filter (Capsules) */}
      <div className="flex overflow-x-auto gap-2 scrollbar-hide pb-1">
        <button
          onClick={() => { setSelectedSubject(''); setSelectedTopic(''); }}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
            !selectedSubject
              ? "bg-gray-800 text-white border-gray-800 shadow-md"
              : "bg-white text-gray-600 border-gray-200"
          )}
        >
          全部
        </button>
        {SUBJECT_OPTIONS.map((sub) => (
          <button
            key={sub.value}
            onClick={() => { setSelectedSubject(sub.value); setSelectedTopic(''); }}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
              selectedSubject === sub.value
                ? "bg-morandi-5 text-white border-morandi-5 shadow-md transform scale-105"
                : "bg-white text-gray-600 border-gray-200 hover:border-morandi-2"
            )}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {/* Topic Filter (Only if subject selected) */}
      {selectedSubject && TAXONOMY[selectedSubject] && (
        <div className="flex overflow-x-auto gap-2 scrollbar-hide animate-in slide-in-from-top-1 fade-in duration-300 border-t border-gray-200 pt-2">
          <div className="flex items-center text-xs text-gray-400 px-1">
            <Filter className="w-3 h-3 mr-1" />
            考点:
          </div>
          {TAXONOMY[selectedSubject].topics.map((topic) => (
            <button
              key={topic}
              onClick={() => setSelectedTopic(selectedTopic === topic ? '' : topic)}
              className={cn(
                "px-3 py-1 rounded-md text-[10px] whitespace-nowrap transition-colors",
                selectedTopic === topic
                  ? "bg-morandi-3 text-morandi-5 font-bold"
                  : "bg-white text-gray-500 hover:bg-gray-100"
              )}
            >
              {topic}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
