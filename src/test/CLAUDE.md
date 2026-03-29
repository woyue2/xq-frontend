# src/test/ — 测试套件

> **GEB Level: L3** | 父文档：[src/CLAUDE.md](../CLAUDE.md)

## 职责

Vitest + Testing Library 单元/集成测试，Playwright E2E 测试入口。

## 文件清单（24 个）

> 按功能模块分组（待整理为子目录）：

| 文件 | 测试对象 |
|---|---|
| `api.test.ts` | services/api.ts re-export 兼容性 |
| `integration.test.tsx` | 关键页面交互集成流程 |
| `admin.test.tsx` | AdminManagementPage 逻辑 |
| `QuestionDetailPage.test.tsx` | 问题详情页交互 |
| （其余同理...） | — |

## 质量红线

- 每个测试文件只测试一个模块
- 禁止在测试文件中调用真实 HTTP（必须 mock service）
- 测试文件命名遵循 `xxx.test.tsx` 格式

## FORBIDDEN

- 禁止在测试文件中 import 真实后端代码
- 禁止使用 `as any` 绕过 mock 类型检查
