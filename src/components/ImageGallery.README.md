# ImageGallery Component

图片画廊组件，用于显示多张图片并支持点击放大查看。

## 功能特性

- ✅ 支持显示单张或多张图片
- ✅ 自适应网格布局（1张、2张、3张及以上）
- ✅ 点击图片打开全屏灯箱查看
- ✅ 灯箱支持左右切换图片
- ✅ 支持键盘导航（左右箭头、ESC关闭）
- ✅ 支持限制显示数量，超出部分显示"+N"提示
- ✅ 响应式设计，移动端友好

## API

### Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `images` | `string[]` | 是 | - | 图片URL数组 |
| `maxVisible` | `number` | 否 | `undefined` | 最多显示的图片数量，超出部分显示"+N" |
| `className` | `string` | 否 | - | 自定义CSS类名 |

### 布局规则

- **1张图片**：单张大图显示（正方形）
- **2张图片**：2列网格布局
- **3张及以上**：3列网格布局

## 使用示例

### 基本用法

```tsx
import { ImageGallery } from '@/components/ImageGallery';

function MyComponent() {
  const images = [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
    'https://example.com/image3.jpg',
  ];

  return <ImageGallery images={images} />;
}
```

### 限制显示数量

```tsx
// 只显示前3张，其余显示"+N"
<ImageGallery images={images} maxVisible={3} />
```

### 自定义样式

```tsx
<ImageGallery 
  images={images} 
  className="max-w-md mx-auto" 
/>
```

### 在问题卡片中使用

```tsx
function QuestionCard({ question }) {
  return (
    <div className="bg-white rounded-lg p-4">
      <h3>{question.title}</h3>
      <p>{question.content}</p>
      
      {/* 显示问题图片 */}
      {question.images && question.images.length > 0 && (
        <ImageGallery 
          images={question.images} 
          maxVisible={3}
        />
      )}
    </div>
  );
}
```

## 灯箱功能

点击任意图片后，会打开全屏灯箱查看器，支持：

- **关闭**：点击右上角X按钮或按ESC键
- **切换图片**：
  - 点击左右箭头按钮
  - 使用键盘左右箭头键
  - 自动循环（最后一张的下一张是第一张）
- **图片计数**：底部显示"当前/总数"

## 设计规范

- 图片圆角：`rounded-lg`（8px）
- 网格间距：`gap-2`（8px）
- 悬停效果：`hover:opacity-90`
- 灯箱背景：半透明黑色遮罩
- 按钮样式：圆形，黑色半透明背景，白色图标

## 无障碍支持

- 所有按钮都有 `aria-label` 属性
- 支持键盘导航
- 图片有描述性的 `alt` 文本

## 性能考虑

- 使用原生 `<img>` 标签，浏览器自动优化加载
- 灯箱使用 Radix UI Dialog，性能优秀
- 不会预加载所有图片，按需加载

## 相关组件

- `SwipeableImageCarousel` - 可滑动的图片轮播组件
- `ImageWithFallback` - 带错误处理的图片组件

## 需求追溯

- **Requirements 9.8**: 提供 ImageGallery 组件，用于显示多张图片
- **Requirements 6.5**: 用户查看内容时，系统应显示上传的图片
