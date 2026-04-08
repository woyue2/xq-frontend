# AnswerCard 组件

回答卡片组件，用于显示问题的回答内容。

## 功能特性

- 显示回答内容（支持多行文本）
- 显示作者信息（头像、昵称）
- 显示创建时间（相对时间格式）
- 支持图片展示（使用 ImageGallery 组件）
- 响应式设计

## 使用方法

```tsx
import { AnswerCard } from '@/components/AnswerCard';
import type { AnswerDTO } from '@/types/dto';

const answer: AnswerDTO = {
  id: '1',
  questionId: 'q1',
  content: '这是回答内容...',
  images: ['image1.jpg', 'image2.jpg'],
  authorId: 'user1',
  authorName: '张老师',
  authorAvatar: '/avatars/avatar.svg',
  createdAt: '2024-01-01T12:00:00Z',
  updatedAt: '2024-01-01T12:00:00Z'
};

<AnswerCard answer={answer} />
```

## Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| answer | AnswerDTO | 是 | 回答数据对象 |
| className | string | 否 | 自定义样式类名 |

## AnswerDTO 类型

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

## 时间格式

组件会自动将时间转换为相对时间格式：
- 1分钟内：刚刚
- 1小时内：X分钟前
- 1天内：X小时前
- 超过1天：显示日期

## 依赖组件

- Avatar / AvatarFallback / AvatarImage (shadcn/ui)
- ImageGallery (自定义组件)

## 样式说明

- 使用 Tailwind CSS 进行样式设计
- 白色背景，圆角卡片
- 轻微阴影效果
- 支持通过 className 自定义样式
