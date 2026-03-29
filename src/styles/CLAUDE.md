# src/styles/ — 样式系统

> **GEB Level: L3** | 父文档：[src/CLAUDE.md](../CLAUDE.md)

## 职责

全局 CSS 变量、Tailwind 主题扩展、Morandi 调色板定义。

## 文件清单

| 文件 | 职责 |
|---|---|
| `index.css` | 全局 CSS，Tailwind 指令，自定义颜色变量，动画 |

## 约定

- Morandi 色系：`morandi-1`（最浅）→ `morandi-5`（最深），定义在 CSS `@layer base` 中
- 所有颜色变量使用 HSL 格式（便于 dark mode 扩展）
- **禁止**在 `.tsx` 文件中写内联 `style={{ color: '#xxx' }}`，统一使用 Tailwind 类

## FORBIDDEN

- 禁止直接修改 Tailwind 源文件（通过 `@theme` 扩展）
- 禁止在组件内 `import` CSS 模块（使用 Tailwind 工具类替代）
