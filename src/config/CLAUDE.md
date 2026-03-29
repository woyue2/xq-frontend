# src/config/ — 应用级常量与配置

> **GEB Level: L3** | 父文档：[src/CLAUDE.md](../CLAUDE.md)

## 职责

所有运行时不变的配置常量。不可在此层写异步逻辑或 React 代码。

## 文件清单

| 文件 | 职责 |
|---|---|
| `ui-config.ts` | UI 颜色、难度标签、学科颜色等 |
| `ai-text.ts` | AI 文案配置（首页标语、轮播文案等） |
| `app-constants.ts` | 应用级常量（难度标签、学科映射等） |
| `feature-flags.ts` | 功能开关配置（控制新功能灰度发布） |
| `taxonomy.ts` | 话题/学科分类配置（TopicConfig 等） |

## 质量红线

- 所有 enum-like 值用 `const obj = { ... } as const` 定义
- 不得引入任何第三方库
- 禁止导出函数（只导出常量对象/字面量）
