/**
 * QuestionFilter 组件使用示例
 * 
 * 本文件展示 QuestionFilter 组件的各种使用场景
 */

import { useState } from 'react';
import { QuestionFilter } from './QuestionFilter';

// 示例 1: 基础用法
export function BasicExample() {
  const [filters, setFilters] = useState({
    subject: '',
    topic: '',
    search: ''
  });

  const handleFilterChange = (newFilters: any) => {
    console.log('筛选条件变化:', newFilters);
    setFilters({
      subject: newFilters.subject || '',
      topic: newFilters.topic || '',
      search: newFilters.search || ''
    });
  };

  return (
    <div className="p-4 max-w-md">
      <h2 className="text-lg font-semibold mb-4">基础用法</h2>
      <QuestionFilter
        subject={filters.subject}
        topic={filters.topic}
        search={filters.search}
        onFilterChange={handleFilterChange}
      />
      
      <div className="mt-4 p-3 bg-gray-100 rounded">
        <p className="text-sm font-medium mb-2">当前筛选条件:</p>
        <pre className="text-xs">{JSON.stringify(filters, null, 2)}</pre>
      </div>
    </div>
  );
}

// 示例 2: 与问题列表集成
export function WithQuestionListExample() {
  const [filters, setFilters] = useState<{
    subject?: string;
    topic?: string;
    search?: string;
  }>({});
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchQuestions = async (filterParams: any) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterParams.subject) params.append('subject', filterParams.subject);
      if (filterParams.topic) params.append('topic', filterParams.topic);
      if (filterParams.search) params.append('search', filterParams.search);
      
      const response = await fetch(`/api/questions?${params.toString()}`);
      const data = await response.json();
      
      if (data.code === 200) {
        setQuestions(data.data.items);
      }
    } catch (error) {
      console.error('加载问题列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    fetchQuestions(newFilters);
  };

  return (
    <div className="p-4 max-w-2xl">
      <h2 className="text-lg font-semibold mb-4">与问题列表集成</h2>
      
      <QuestionFilter
        subject={filters.subject}
        topic={filters.topic}
        search={filters.search}
        onFilterChange={handleFilterChange}
      />
      
      <div className="mt-6">
        {loading ? (
          <p className="text-gray-500">加载中...</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              找到 {questions.length} 个问题
            </p>
            {questions.map((q: any) => (
              <div key={q.id} className="p-3 bg-white rounded border">
                <h3 className="font-medium">{q.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {q.subject} · {q.authorName}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 示例 3: 预设筛选条件
export function PresetFiltersExample() {
  const [filters, setFilters] = useState({
    subject: 'math',
    topic: '',
    search: ''
  });

  const handleFilterChange = (newFilters: any) => {
    setFilters({
      subject: newFilters.subject || '',
      topic: newFilters.topic || '',
      search: newFilters.search || ''
    });
  };

  return (
    <div className="p-4 max-w-md">
      <h2 className="text-lg font-semibold mb-4">预设筛选条件</h2>
      <p className="text-sm text-gray-600 mb-4">
        默认选中数学科目
      </p>
      
      <QuestionFilter
        subject={filters.subject}
        topic={filters.topic}
        search={filters.search}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
}

// 示例 4: 自定义样式
export function CustomStyleExample() {
  const [filters, setFilters] = useState<{
    subject?: string;
    topic?: string;
    search?: string;
  }>({});

  const handleFilterChange = (newFilters: any) => {
    console.log('筛选条件:', newFilters);
    setFilters(newFilters);
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">自定义样式</h2>
      
      <QuestionFilter
        className="max-w-lg mx-auto border-2 border-blue-200"
        onFilterChange={handleFilterChange}
      />
    </div>
  );
}

// 示例 5: URL 参数同步
export function URLSyncExample() {
  // 从 URL 参数读取初始筛选条件
  const searchParams = new URLSearchParams(window.location.search);
  const [filters, setFilters] = useState({
    subject: searchParams.get('subject') || '',
    topic: searchParams.get('topic') || '',
    search: searchParams.get('search') || ''
  });

  const handleFilterChange = (newFilters: any) => {
    // 更新状态
    setFilters({
      subject: newFilters.subject || '',
      topic: newFilters.topic || '',
      search: newFilters.search || ''
    });

    // 更新 URL 参数
    const params = new URLSearchParams();
    if (newFilters.subject) params.set('subject', newFilters.subject);
    if (newFilters.topic) params.set('topic', newFilters.topic);
    if (newFilters.search) params.set('search', newFilters.search);
    
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    
    window.history.pushState({}, '', newUrl);
  };

  return (
    <div className="p-4 max-w-md">
      <h2 className="text-lg font-semibold mb-4">URL 参数同步</h2>
      <p className="text-sm text-gray-600 mb-4">
        筛选条件会同步到 URL 参数中
      </p>
      
      <QuestionFilter
        subject={filters.subject}
        topic={filters.topic}
        search={filters.search}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
}
