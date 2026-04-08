# src/components/ — 共享 UI 组件

> **GEB Level: L3** | 父文档：[src/CLAUDE.md](../CLAUDE.md)

## 职责

跨页面复用的 UI 构建块，不包含路由逻辑，不维护全局 state。

## 目录结构

```
components/
├── ui/          ← shadcn/ui 生成 + 自定义扩展 → ui/CLAUDE.md
├── figma/       ← Figma 导出基础组件
├── admin/       ← 管理后台专用子组件
└── *.tsx        ← 项目自定义共享组件
```

## 文件（根目录，非 ui/）

| 文件 | 职责 |
|---|---|
| `QuestionCard.tsx` | 问题卡片（列表+详情复用） |
| `QuestionDetail.tsx` | 问题详情组件（显示完整问题内容、回答列表、评论列表） |
| `QuestionFilter.tsx` | 问题列表筛选器（学科/话题/状态等） |
| `QuestionList.tsx` | 问题列表容器（无限滚动 + 骨架屏） |
| `ImageGallery.tsx` | 图片画廊（显示多张图片，支持点击放大查看） |
| `ImageUploader.tsx` | 图片上传组件（支持多图上传、客户端验证、进度显示和预览） |
| `SubjectTopicSelector.tsx` | 科目和考点选择器（级联下拉选择器，用于问题创建和筛选） |
| `SubjectManager.tsx` | 科目管理组件（管理员用，显示科目列表，支持创建、编辑、删除科目，选中科目查看考点） |
| `SubjectForm.tsx` | 科目表单组件（创建和编辑科目，包含字段验证和错误处理） |

## 子目录文件

| 文件 | 目录 | 职责 |
|---|---|---|
| `figma/ImageWithFallback.tsx` | figma/ | 带 fallback 的图片组件（Figma 导出） |

## 质量红线

- 每个组件文件 ≤ 300 行
- props 必须定义 typed interface
- 不得在组件内直接调用 service（通过 props 或 callback 传入）

## 子模块文档

- [ui/ →](./ui/CLAUDE.md)
