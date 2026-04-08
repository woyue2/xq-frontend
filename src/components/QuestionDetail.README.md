# QuestionDetail 组件

## 概述

QuestionDetail 是一个综合性组件，用于显示问题的完整详情，包括问题内容、图片、回答列表和评论列表。

## 功能特性

- 显示问题完整信息（标题、内容、科目、标签、图片）
- 显示作者信息和发布时间
- 显示回答列表（使用卡片样式）
- 显示评论列表（使用紧凑样式）
- 为登录用户提供"回答"和"评论"按钮
- 使用 ImageGallery 组件展示图片
- 响应式设计，适配移动端和桌面端

## 使用示例

```tsx
import { QuestionDetail } from '@/components/QuestionDetail';
import type { QuestionDTO, AnswerDTO, CommentDTO } from '@/types/dto';

function QuestionPage() {
  const question: QuestionDTO = {
    id: '1',
    title: '如何解这道数学题？',
    content: '求解方程 x^2 + 5x + 6 = 0',
    subject: '数学',
    tags: ['代数', '方程'],
    images: ['/uploads/question1.jpg'],
    authorId: 'user1',
    authorName: '张三',
    authorAvatar: '/avatars/user1.jpg',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    answerCount: 2
  };

  const answers: AnswerDTO[] = [
    {
      id: 'a1',
      questionId: '1',
      content: '这是一个一元二次方程，可以使用因式分解法...',
      images: ['/uploads/answer1.jpg'],
      authorId: 'user2',
      authorName: '李四',
      authorAvatar: '/avatars/user2.jpg',
      createdAt: '2024-01-15T11:00:00Z',
      updatedAt: '2024-01-15T11:00:00Z'
    }
  ];

  const comments: CommentDTO[] = [
    {
      id: 'c1',
      questionId: '1',
      content: '这道题很有意思！',
      authorId: 'user3',
      authorName: '王五',
      authorAvatar: '/avatars/user3.jpg',
      createdAt: '2024-01-15T12:00:00Z',
      updatedAt: '2024-01-15T12:00:00Z'
    }
  ];

  const handleAnswer = () => {
    console.log('打开回答对话框');
  };

  const handleComment = () => {
    console.log('打开评论对话框');
  };

  return (
    <QuestionDetail
      question={question}
      answers={answers}
      comments={comments}
      isLoggedIn={true}
      onAnswer={handleAnswer}
      onComment={handleComment}
    />
  );
}
```

## Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| question | QuestionDTO | 是 | - | 问题数据对象 |
| answers | AnswerDTO[] | 否 | [] | 回答列表 |
| comments | CommentDTO[] | 否 | [] | 评论列表 |
| isLoggedIn | boolean | 否 | false | 用户是否已登录 |
| onAnswer | () => void | 否 | - | 点击"回答"按钮的回调 |
| onComment | () => void | 否 | - | 点击"评论"按钮的回调 |
| className | string | 否 | - | 自定义样式类名 |

## 数据类型

### QuestionDTO

```typescript
interface QuestionDTO {
  id: string;
  title: string;
  content?: string;
  subject?: string;
  tags?: string[];
  images?: string[];
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
  answerCount?: number;
}
```

### AnswerDTO

```typescript
interface AnswerDTO {
  id: string;
  questionId: string;
  content: string;
  images?: string[];
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
}
```

### CommentDTO

```typescript
interface CommentDTO {
  id: string;
  questionId: string;
  content: string;
  image?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 样式说明

- 使用 Tailwind CSS 进行样式设计
- 主容器使用白色背景和圆角阴影
- 问题内容、回答列表、评论列表使用边框分隔
- 回答使用灰色背景卡片样式
- 评论使用紧凑的列表样式
- 响应式设计，适配不同屏幕尺寸

## 依赖组件

- `@/components/ui/badge` - 显示科目和标签
- `@/components/ui/avatar` - 显示用户头像
- `@/components/ui/button` - 回答和评论按钮
- `@/components/ImageGallery` - 显示图片画廊

## 注意事项

1. 确保传入的 question 对象包含所有必需字段
2. 时间格式应为 ISO 8601 字符串格式
3. 图片 URL 应为有效的可访问路径
4. isLoggedIn 为 true 时才显示操作按钮
5. onAnswer 和 onComment 回调需要在父组件中实现具体逻辑
