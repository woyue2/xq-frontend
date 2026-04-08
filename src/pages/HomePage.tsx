/**
 * [POS] src/pages/HomePage.tsx
 *   所属：pages 层 | 角色：首页（问题列表 + 筛选），路由 `/`
 *   兄弟：所有其他 pages
 *
 * [INPUT]
 *   - react                  → useState / useRef / useEffect
 *   - react-router-dom       → useNavigate
 *   - swr                    → useSWR
 *   - @/lib/swr-config       → fetcher
 *   - @/components/QuestionFilter → QuestionFilter
 *   - @/components/QuestionCard → QuestionCard
 *   - lucide-react           → Loader2
 *   - @/types/dto            → QuestionDTO
 *
 * [OUTPUT]
 *   - HomePage（页面组件，带 SWR 缓存）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/pages/CLAUDE.md 的文件清单
 */
import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-config';
import { QuestionFilter } from '@/components/QuestionFilter';
import { QuestionCard } from '@/components/QuestionCard';
import { Loader2 } from 'lucide-react';
import type { QuestionDTO } from '@/types/dto';

interface QuestionsResponse {
  items: QuestionDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function HomePage() {
  // Filter states
  const [filters, setFilters] = useState<{
    subject?: string;
    topic?: string;
    search?: string;
  }>({});

  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Build API URL with filters
  const buildApiUrl = (currentPage: number) => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      pageSize: pageSize.toString(),
    });

    if (filters.subject) params.append('subject', filters.subject);
    if (filters.topic) params.append('topic', filters.topic);
    if (filters.search) params.append('search', filters.search);

    return `/api/questions?${params.toString()}`;
  };

  // Use SWR for data fetching with caching
  const { data, error, isLoading } = useSWR<QuestionsResponse>(
    buildApiUrl(page),
    fetcher,
    {
      // Keep previous data while loading new data
      keepPreviousData: true,
      // Revalidate after 5 minutes
      dedupingInterval: 5 * 60 * 1000,
    }
  );

  // Intersection observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.subject, filters.topic, filters.search]);

  // Handle filter changes
  const handleFilterChange = (newFilters: {
    subject?: string;
    topic?: string;
    search?: string;
  }) => {
    setFilters(newFilters);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (data && page < data.totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  // Intersection observer for auto-load
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && data && page < data.totalPages && !isLoading) {
          handleLoadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [page, data, isLoading]);

  // Handle error state
  if (error) {
    return (
      <div className="flex flex-col gap-4 pb-4">
        <QuestionFilter
          subject={filters.subject}
          topic={filters.topic}
          search={filters.search}
          onFilterChange={handleFilterChange}
        />
        <div className="flex flex-col items-center justify-center py-20 text-red-400">
          <p>加载失败，请刷新页面重试</p>
        </div>
      </div>
    );
  }

  const questions = data?.items || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Filter Section */}
      <QuestionFilter
        subject={filters.subject}
        topic={filters.topic}
        search={filters.search}
        onFilterChange={handleFilterChange}
      />

      {/* Questions List */}
      <div className="space-y-4 min-h-[50vh]">
        {isLoading && !data ? (
          // Initial loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg p-4 space-y-3 animate-pulse"
            >
              <div className="h-40 bg-gray-200 rounded-lg w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))
        ) : questions.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-gray-300" />
            </div>
            <p>暂无相关提问</p>
          </div>
        ) : (
          <>
            {/* Question Cards */}
            {questions.map((question) => (
              <QuestionCard key={question.id} question={question} />
            ))}

            {/* Load More / Loading Indicator */}
            <div
              ref={observerTarget}
              className="h-10 flex items-center justify-center"
            >
              {isLoading && data && (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              )}
              {!isLoading && page >= totalPages && questions.length > 0 && (
                <p className="text-xs text-gray-400">没有更多了</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
