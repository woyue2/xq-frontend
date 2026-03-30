# src/components/ui/ — shadcn/ui 组件库

> **GEB Level: L3** | 父文档：[components/CLAUDE.md](../CLAUDE.md)

## 职责

Radix UI 原语的 shadcn/ui 封装。**此目录绝大多数文件为自动生成，不计入 GEB 8文件目录上限。**

## ⚠️ 重要：修改规则

| 场景 | 处理方式 |
|---|---|
| 需要新增 shadcn 组件 | `npx shadcn add <component>` 自动生成，不手写 |
| 需要修改已有组件样式 | 通过 `className` props 覆盖，**不修改生成文件** |
| 需要扩展组件能力 | 在组件目录外创建包装组件（如 `GoodQuestionBadge.tsx`） |
| Bug 修复或 API 对齐 | 允许修改生成文件，但注释标明修改原因 |

## 自定义扩展文件

以下为项目自行添加的文件（需要特别维护）：

| 文件 | 职责 |
|---|---|
| `good-question-badge.tsx` | "精品题" 标识组件 |
| `image-carousel.tsx` | 图片轮播（多图展示） |
| `swipeable-image-carousel.tsx` | 可滑动图片轮播（支持触摸手势 + 左右翻页） |

## FORBIDDEN

- 不得在 `ui/` 目录内直接引用 service 或 store
- 不得在 `ui/` 内写业务逻辑（路由跳转、API 调用等）
