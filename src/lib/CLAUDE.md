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
| `permissions.ts` | 权限标识常量 + 角色权限判断工具函数 |
| `permissions.test.ts` | permissions.ts 的单元测试 |
| `test-runner.ts` | 诊断用 API 测试执行器（dev 模式） |
| `race-condition-fix.ts` | 竞态条件统一修复工具（safeCreate/safeUpdate等） |
| `quick-fix.ts` | 快速修复工具（哥的救心丸，createSafeHandler等） |
| `useSafeSubmit.ts` | 防重复提交Hook（useAntiSpam等） |

## 质量红线

- 每个工具文件 ≤ 200 行
- 所有导出函数必须有 JSDoc 说明
- 禁止在工具函数内 `import` 应用层模块（pages/components/hooks/services/stores）

## FORBIDDEN

- 不得引入 React
- 不得产生网络请求或 DOM 副作用
