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
| `QuestionFilter.tsx` | 问题列表筛选器（学科/话题/状态等） |
| `QuestionList.tsx` | 问题列表容器（无限滚动 + 骨架屏） |

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
