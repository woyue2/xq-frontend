# ImageUploader 组件

图片上传组件，支持多图上传、客户端验证、进度显示和预览。

## 功能特性

- ✅ 支持多图上传（默认最多 3 张，可配置）
- ✅ 客户端验证格式（jpg, png, gif, webp）
- ✅ 客户端验证大小（单张不超过 5MB）
- ✅ 实时显示上传进度
- ✅ 图片预览和删除
- ✅ 上传失败重试
- ✅ 支持禁用状态

## 使用方法

### 基本用法

```tsx
import { useState } from 'react';
import { ImageUploader } from '@/components/ImageUploader';

function MyComponent() {
  const [images, setImages] = useState<string[]>([]);

  return (
    <ImageUploader
      value={images}
      onChange={setImages}
    />
  );
}
```

### 自定义最大数量

```tsx
<ImageUploader
  maxCount={1}
  value={images}
  onChange={setImages}
/>
```

### 禁用状态

```tsx
<ImageUploader
  value={images}
  onChange={setImages}
  disabled
/>
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `maxCount` | `number` | `3` | 最多上传图片数量 |
| `value` | `string[]` | `[]` | 已上传图片 URL 列表 |
| `onChange` | `(urls: string[]) => void` | - | 图片列表变化回调 |
| `disabled` | `boolean` | `false` | 是否禁用上传 |
| `className` | `string` | - | 自定义样式类名 |

## 验证规则

### 格式验证

支持的图片格式：
- jpg / jpeg
- png
- gif
- webp

### 大小验证

- 单张图片不超过 5MB
- 超过限制会显示错误提示

## 上传流程

1. 用户选择文件
2. 客户端验证格式和大小
3. 显示上传进度
4. 调用 `/api/upload` 接口上传到 Supabase Storage
5. 返回图片 URL
6. 触发 `onChange` 回调

## 错误处理

- 格式不支持：立即提示并阻止上传
- 大小超限：立即提示并阻止上传
- 上传失败：显示错误信息和重试按钮
- 未登录：提示需要登录

## 依赖

- `@/components/ui/button` - 按钮组件
- `@/components/ui/progress` - 进度条组件
- `lucide-react` - 图标库
- `/api/upload` - 图片上传 API

## 相关组件

- `ImageGallery` - 图片画廊组件（用于显示已上传的图片）

## 示例

查看 `ImageUploader.example.tsx` 获取完整示例。
