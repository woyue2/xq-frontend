# src/lib/ — 纯工具函数

> **GEB Level: L3** | 父文档：[src/CLAUDE.md](../CLAUDE.md)

## 职责

无副作用的纯函数库，不依赖任何应用层代码（stores / services / hooks 均不可引用）。

## 文件清单

| 文件 | 职责 |
|---|---|
| `utils.ts` | `cn()`（classnames 合并）等通用工具 |
| `mock-data.ts` | 本地 Mock 数据（仅 test/dev 模式使用） |
| `mock-env.ts` | `USE_MOCK` 标志 |
| `image-compress.ts` | 图片压缩工具 |
| `share.ts` | 分享 URL 构建 + 剪贴板写入 |

## 质量红线

- 每个工具文件 ≤ 200 行
- 所有导出函数必须有 JSDoc 说明
- 禁止在工具函数内 `import` 应用层模块（pages/components/hooks/services/stores）

## FORBIDDEN

- 不得引入 React
- 不得产生网络请求或 DOM 副作用
