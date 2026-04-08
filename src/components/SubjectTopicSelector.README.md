# SubjectTopicSelector 组件

## 概述

`SubjectTopicSelector` 是一个科目和考点选择器组件，提供两个级联下拉选择器：科目选择器和考点选择器。当用户选择科目后，考点选择器会自动加载该科目下的考点列表。

## 功能特性

- **科目选择器**：显示所有启用的科目列表
- **考点选择器**：基于选中的科目动态加载考点列表
- **级联逻辑**：选择科目后自动加载考点，切换科目时清空已选考点
- **加载状态**：显示加载中状态，禁用未就绪的选择器
- **受控组件**：使用 value/onChange 模式，便于表单集成
- **必填标识**：支持显示必填标识（红色星号）

## Props

```typescript
interface SubjectTopicSelectorProps {
  subjectValue?: string;        // 当前选中的科目 key
  topicValue?: string;           // 当前选中的考点 value
  onSubjectChange?: (value: string) => void;  // 科目变化回调
  onTopicChange?: (value: string) => void;    // 考点变化回调
  className?: string;            // 自定义样式类名
  required?: boolean;            // 是否显示必填标识（默认 false）
}
```

## 使用示例

### 基础用法

```tsx
import { SubjectTopicSelector } from '@/components/SubjectTopicSelector';

function CreateQuestionForm() {
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');

  return (
    <SubjectTopicSelector
      subjectValue={subject}
      topicValue={topic}
      onSubjectChange={setSubject}
      onTopicChange={setTopic}
      required
    />
  );
}
```

### 在表单中使用

```tsx
import { SubjectTopicSelector } from '@/components/SubjectTopicSelector';

function QuestionForm() {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    topic: '',
  });

  const handleSubjectChange = (value: string) => {
    setFormData(prev => ({ ...prev, subject: value, topic: '' }));
  };

  const handleTopicChange = (value: string) => {
    setFormData(prev => ({ ...prev, topic: value }));
  };

  return (
    <form>
      <input
        value={formData.title}
        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
        placeholder="问题标题"
      />
      
      <SubjectTopicSelector
        subjectValue={formData.subject}
        topicValue={formData.topic}
        onSubjectChange={handleSubjectChange}
        onTopicChange={handleTopicChange}
        required
      />
    </form>
  );
}
```

### 筛选器用法

```tsx
import { SubjectTopicSelector } from '@/components/SubjectTopicSelector';

function QuestionFilter() {
  const [filters, setFilters] = useState({
    subject: '',
    topic: '',
  });

  return (
    <SubjectTopicSelector
      subjectValue={filters.subject}
      topicValue={filters.topic}
      onSubjectChange={(value) => setFilters(prev => ({ ...prev, subject: value }))}
      onTopicChange={(value) => setFilters(prev => ({ ...prev, topic: value }))}
      className="mb-4"
    />
  );
}
```

## API 依赖

组件依赖以下 API 端点：

- `GET /api/subjects` - 获取所有启用的科目列表
- `GET /api/subjects?key={subjectKey}&topics=1` - 获取指定科目下的考点列表

## 数据类型

```typescript
interface SubjectDTO {
  id: string;
  key: string;
  name: string;
  order: number;
  enabled: boolean;
  description?: string;
}

interface TopicDTO {
  id: string;
  subjectKey: string;
  value: string;
  label: string;
  order: number;
  enabled: boolean;
}
```

## 行为说明

1. **初始加载**：组件挂载时自动加载科目列表
2. **科目选择**：用户选择科目后，自动加载该科目下的考点列表
3. **科目切换**：切换科目时，自动清空已选考点
4. **禁用状态**：
   - 科目列表加载中时，科目选择器禁用
   - 未选择科目或考点列表加载中时，考点选择器禁用
5. **占位文本**：根据状态显示不同的占位文本（加载中、请选择等）

## 样式定制

组件使用 shadcn/ui 的 Select 组件，支持通过 `className` prop 自定义外层容器样式：

```tsx
<SubjectTopicSelector
  className="max-w-md"
  // ...其他 props
/>
```

## 注意事项

- 科目为必选项时，应在表单验证中检查 `subjectValue` 是否为空
- 考点为可选项，可以为空
- 组件不处理错误提示，错误处理应在父组件中实现
- 组件使用受控模式，必须提供 value 和 onChange props
