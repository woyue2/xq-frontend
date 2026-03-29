# src/types/ — 类型定义

> **GEB Level: L3** | 父文档：[src/CLAUDE.md](../CLAUDE.md)

## 职责

TypeScript 类型声明层，不含任何运行时逻辑。

## 文件清单

| 文件 | 职责 |
|---|---|
| `index.ts` | 核心领域类型：`User`, `Question`, `Answer`, `Comment`, `SubjectType` 等 |
| `api.ts` | API 请求/响应 DTO 类型：`ApiResponse<T>`, `LoginPayload`, `WhitelistUser` 等 |
| `parent.ts` | 家长端专用类型：`ChildInfo` 等 |

## 质量红线

- 禁止在类型文件内写任何运行时逻辑（函数、变量赋值等）
- 所有类型使用 `interface` 优先（需要类型运算时才用 `type`）
- DTO 类型（前后端协议）放在 `api.ts`；领域实体类型放在 `index.ts`

## FORBIDDEN

- 禁止使用裸 `any`
- 禁止类型互相 re-export 导致循环依赖
