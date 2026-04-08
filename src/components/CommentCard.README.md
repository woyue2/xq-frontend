# CommentCard 组件

评论卡片组件，用于显示问题的评论内容。

## 功能特性

- 显示评论内容（支持多行文本）
- 显示作者信息（头像、昵称）
- 显示创建时间（相对时间格式）
- 支持单张图片展示
- 响应式设计

## 使用方法

```tsx
import { CommentCard } from '@/components/CommentCard';
import type { CommentDTO } from '@/types/dto';

const comment: CommentDTO = {
  id: '1',
  questionId: 'q1',
  content: '这是评论内容...',
  image: 'comment-image.jpg',
  authorId: 'user1',
  authorName: '张同学',
  authorAvatar: '/avatars/avatar.svg',
  createdAt: '2024-01-01T12:00:00Z',
  updatedAt: '2024-01-01T12:00:00Z'
};

<CommentCard comment={comment} />
```

## Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| comment | CommentDTO | 是 | 评论数据对象 |
| className | string | 否 | 自定义样式类名 |

## CommentDTO 类型

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

## 时间格式

组件会自动将时间转换为相对时间格式：
- 1分钟内：刚刚
- 1小时内：X分钟前
- 1天内：X小时前
- 超过1天：显示日期

## 图片说明

- 评论支持单张图片（可选）
- 图片会自动适应容器宽度
- 使用圆角样式显示

## 依赖组件

- Avatar / AvatarFallback / AvatarImage (shadcn/ui)

## 样式说明

- 使用 Tailwind CSS 进行样式设计
- 白色背景，圆角卡片
- 轻微阴影效果
- 支持通过 className 自定义样式

## 与 AnswerCard 的区别

- CommentCard 支持单张图片（image: string）
- AnswerCard 支持多张图片（images: string[]）
- CommentCard 更简洁，适合短评论场景
