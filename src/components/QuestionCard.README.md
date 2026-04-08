# QuestionCard 组件

问题卡片组件，用于在列表中显示问题摘要信息，支持点击跳转到详情页。

## 功能特性

- 显示问题标题、科目、考点（tags）
- 显示作者头像、姓名和创建时间
- 支持显示问题图片（使用 ImageGallery 组件）
- 点击卡片跳转到问题详情页
- 响应式设计，支持移动端和桌面端
- 支持自定义样式类名

## 使用示例

### 基础用法

```tsx
import { QuestionCard } from '@/components/QuestionCard';
import type { QuestionDTO } from '@/types/dto';

function QuestionListPage() {
  const question: QuestionDTO = {
    id: 'q1',
    title: '如何解一元二次方程？',
    content: '请详细说明解题步骤',
    subject: 'math',
    tags: ['代数', '方程'],
    images: ['https://example.com/image1.jpg'],
    authorId: 'u1',
    authorName: '张老师',
    authorAvatar: 'https://example.com/avatar.jpg',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    answerCount: 3
  };

  return <QuestionCard question={question} />;
}
```

### 在列表中使用

```tsx
import { QuestionCard } from '@/components/QuestionCard';
import type { QuestionDTO } from '@/types/dto';

function QuestionList({ questions }: { questions: QuestionDTO[] }) {
  return (
    <div className="space-y-4">
      {questions.map((question) => (
        <QuestionCard key={question.id} question={question} />
      ))}
    </div>
  );
}
```

### 自定义样式

```tsx
<QuestionCard 
  question={question} 
  className="border-2 border-blue-500" 
/>
```

## Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| question | QuestionDTO | 是 | - | 问题数据对象 |
| className | string | 否 | - | 自定义样式类名 |

## QuestionDTO 类型

```typescript
interface QuestionDTO {
  id: string;                // 问题ID
  title: string;             // 问题标题
  content?: string;          // 问题内容（可选）
  subject?: string;          // 科目（可选）
  tags?: string[];           // 考点标签（可选）
  images?: string[];         // 图片URL数组（可选）
  authorId: string;          // 作者ID
  authorName: string;        // 作者姓名
  authorAvatar?: string;     // 作者头像URL（可选）
  createdAt: string;         // 创建时间（ISO 8601格式）
  updatedAt: string;         // 更新时间（ISO 8601格式）
  answerCount?: number;      // 回答数量（可选）
}
```

## 样式说明

- 卡片使用白色背景，圆角边框，带有阴影效果
- 鼠标悬停时阴影加深，提供视觉反馈
- 点击时有轻微的缩放动画效果
- 科目显示为轮廓徽章（outline badge）
- 考点标签显示为次要徽章（secondary badge）
- 作者信息使用小号字体和灰色文字
- 时间显示为相对时间（如"刚刚"、"5分钟前"、"2小时前"等）

## 依赖组件

- `ImageGallery` - 用于显示问题图片
- `Badge` - 用于显示科目和考点标签
- `Avatar` - 用于显示作者头像
- `react-router-dom` - 用于页面导航

## 注意事项

1. 组件内部使用 `useNavigate` 进行路由跳转，需要在 Router 上下文中使用
2. 图片显示使用 ImageGallery 组件，最多显示3张图片
3. 时间格式化会自动处理相对时间显示
4. 作者头像如果加载失败，会显示作者姓名的首字母作为后备
5. 所有可选字段（subject、tags、images等）都会进行空值检查，不会导致渲染错误

## GEB 协议

本组件遵循 GEB（Global Event Bus）协议规范，文件头部包含完整的依赖关系和输出说明。变更时需要同步更新：

1. 文件头部的 [INPUT]/[OUTPUT] 注释
2. `src/components/CLAUDE.md` 的文件清单
