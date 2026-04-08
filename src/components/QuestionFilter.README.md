# QuestionFilter 组件

## 概述

QuestionFilter 是一个问题筛选器组件，用于在问题列表页面提供科目、考点和关键词搜索功能。

## 功能特性

- **科目筛选**: 使用 SubjectTopicSelector 组件选择科目
- **考点筛选**: 基于选择的科目动态加载考点列表
- **关键词搜索**: 支持按标题或内容搜索问题
- **应用筛选**: 点击按钮应用当前筛选条件
- **清除筛选**: 一键清除所有筛选条件
- **回车搜索**: 在搜索框中按回车键快速应用筛选

## Props

```typescript
interface QuestionFilterProps {
  subject?: string;           // 当前选中的科目
  topic?: string;             // 当前选中的考点
  search?: string;            // 当前搜索关键词
  onFilterChange?: (filters: { 
    subject?: string; 
    topic?: string; 
    search?: string 
  }) => void;                 // 筛选条件变化回调
  className?: string;         // 自定义样式类名
}
```

## 使用示例

### 基础用法

```tsx
import { QuestionFilter } from '@/components/QuestionFilter';

function QuestionListPage() {
  const [filters, setFilters] = useState({
    subject: '',
    topic: '',
    search: ''
  });

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // 使用新的筛选条件重新加载问题列表
    fetchQuestions(newFilters);
  };

  return (
    <div>
      <QuestionFilter
        subject={filters.subject}
        topic={filters.topic}
        search={filters.search}
        onFilterChange={handleFilterChange}
      />
    </div>
  );
}
```

### 受控组件模式

```tsx
import { QuestionFilter } from '@/components/QuestionFilter';

function HomePage() {
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [search, setSearch] = useState('');

  const handleFilterChange = ({ subject, topic, search }) => {
    setSubject(subject || '');
    setTopic(topic || '');
    setSearch(search || '');
    
    // 调用 API 获取筛选后的问题列表
    fetchFilteredQuestions({ subject, topic, search });
  };

  return (
    <QuestionFilter
      subject={subject}
      topic={topic}
      search={search}
      onFilterChange={handleFilterChange}
    />
  );
}
```

### 与 API 集成

```tsx
import { QuestionFilter } from '@/components/QuestionFilter';

function QuestionListPage() {
  const [questions, setQuestions] = useState([]);
  const [filters, setFilters] = useState({});

  const fetchQuestions = async (filters) => {
    const params = new URLSearchParams();
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.topic) params.append('topic', filters.topic);
    if (filters.search) params.append('search', filters.search);
    
    const response = await fetch(`/api/questions?${params.toString()}`);
    const data = await response.json();
    
    if (data.code === 200) {
      setQuestions(data.data.items);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    fetchQuestions(newFilters);
  };

  return (
    <div className="space-y-4">
      <QuestionFilter
        subject={filters.subject}
        topic={filters.topic}
        search={filters.search}
        onFilterChange={handleFilterChange}
      />
      
      <div className="space-y-2">
        {questions.map(q => (
          <QuestionCard key={q.id} question={q} />
        ))}
      </div>
    </div>
  );
}
```

## 组件行为

### 筛选流程

1. 用户选择科目 → 考点列表自动更新（由 SubjectTopicSelector 处理）
2. 用户选择考点（可选）
3. 用户输入搜索关键词（可选）
4. 用户点击"应用筛选"按钮或在搜索框按回车键
5. 触发 `onFilterChange` 回调，传递当前筛选条件

### 清除筛选

点击"清除"按钮会：
1. 重置所有筛选条件为空
2. 触发 `onFilterChange` 回调，传递空的筛选条件
3. 父组件应重新加载未筛选的问题列表

### 回车搜索

在搜索框中按回车键会立即应用当前筛选条件，无需点击"应用筛选"按钮。

## 样式定制

组件使用 Tailwind CSS 进行样式设计，可以通过 `className` prop 添加自定义样式：

```tsx
<QuestionFilter
  className="max-w-md mx-auto"
  onFilterChange={handleFilterChange}
/>
```

## 依赖组件

- **SubjectTopicSelector**: 科目和考点选择器
- **Input**: shadcn/ui 输入框组件
- **Button**: shadcn/ui 按钮组件

## 相关需求

- 需求 5.5: 科目和考点筛选功能
- 需求 5.6: 问题列表科目筛选
- 需求 5.7: 问题列表考点筛选
- 需求 7.6: 搜索功能
- 需求 9.7: QuestionFilter 组件实现

## 注意事项

1. 组件采用受控模式，需要父组件管理筛选状态
2. 筛选条件不会自动应用，需要用户点击"应用筛选"按钮
3. 搜索框支持回车键快速搜索
4. 清除筛选会将所有条件重置为 undefined
5. 科目变化时，考点会自动清空（由 SubjectTopicSelector 处理）
