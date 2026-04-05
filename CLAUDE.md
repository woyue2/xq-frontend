# 知否（xq）项目 — GEB L1 根文档

> **GEB Level: L1** | 更新：2026-03-30

## 项目定位

**知否**是一个家庭版知识问答平台，支持学生提问、教师回答、家长监看，集成 AI 审核。
当前架构：Vite + React + TypeScript（前端）+ Express + Prisma + PostgreSQL（后端）。
未来迁移路线：见 [if重构路线白嫖.md](./if重构路线白嫖.md)（Supabase 方案）。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | Vite + React 18 + TypeScript |
| 状态管理 | Zustand |
| 服务端状态 | TanStack Query |
| UI 组件 | shadcn/ui + Radix UI + Tailwind v4 |
| 路由 | react-router-dom v7 |
| HTTP 客户端 | axios |
| 后端 | Express + Prisma ORM |
| 数据库 | PostgreSQL |
| 测试 | Vitest + Testing Library + Playwright |

---

## 质量红线（GEB 强制）

| 指标 | 上限 |
|---|---|
| 单文件行数 | **800 行** |
| 目录文件数 | **8 个**（shadcn/ui 自动生成除外） |
| 函数/组件体行数 | **20 行**（逻辑密集型适当放宽，但不超 50） |
| 缩进层数 | **3 层** |

---

## L3 文件契约注释（强制）

每个**源文件**（`.ts` / `.tsx`）头部必须包含 L3 契约注释块：

```ts
/**
 * [POS] src/层级/文件名.ts
 *   所属：层级名称 | 角色：本文件在模块中的作用
 *   兄弟：与本文件同层且有关联的文件
 *
 * [INPUT]
 *   - 依赖路径  → 从此路径导入的符号
 *
 * [OUTPUT]
 *   - 导出符号  → 类型/职责说明
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. 所属目录的 CLAUDE.md 文件清单
 */
```

> **[PROTOCOL] 是强制触发条件**：新增/修改/删除 import 或 export 时，必须先更新契约注释，再提交。

---

## FORBIDDEN 死罪（立即回滚）

1. **全量 `any` props**：组件 props 签名禁止 `: any`，必须定义 interface
2. **生产 `console.log`**：非 error middleware / server 启动日志一律删除
3. **单文件堆砌一切**：超过 800 行必须按职责拆分
4. **魔法数字裸写**：时间常量、业务阈值必须提取为具名常量

## FORBIDDEN 重罪（代码审查必须修复）

1. **`as any` 绕过类型系统**：用正确的 interface 或类型守卫替代
2. **TODO/FIXME 残留**：禁止提交含未完成标记的代码
3. **深度嵌套（> 3 层）**：提前 return / 提取函数
4. **useState 地狱**：> 5 个 useState 同时存在于一个组件，必须抽取 hook

---

## 坏味道（需要改进）

1. Mock 数据与生产代码混杂
2. service 对象平铺在同一个文件（已修：api.ts 拆分）
3. 页面组件超过 500 行
4. `as any` 访问后端返回的可选字段
5. `queryParams: any` 参数构造
6. 过滤逻辑写在组件内（应提取 hook）
7. 魔法时间常数（ms）

---

## 目录结构

```
xq-frontend/
├── src/                    ← 前端源码 → src/CLAUDE.md
│   ├── components/         ← 共享组件
│   ├── pages/              ← 路由页面
│   ├── services/           ← HTTP 服务层（已拆分）
│   ├── stores/             ← Zustand Store
│   ├── hooks/              ← 可复用 Hooks
│   ├── lib/                ← 纯工具函数
│   ├── types/              ← 类型定义
│   ├── config/             ← 应用常量/特性
│   ├── layouts/            ← 布局组件
│   ├── styles/             ← 样式系统
│   └── test/               ← 测试套件
├── api/                    ← Vercel Serverless API → api/CLAUDE.md
│   ├── _lib/               ← API 工具层
│   ├── admin/              ← 管理员功能
│   ├── answers/            ← 回答管理
│   ├── auth/               ← 用户认证
│   ├── behavior/           ← 行为分析（预留）
│   ├── comments/           ← 评论管理
│   ├── health.ts           ← 健康检查
│   ├── interactions/       ← 交互管理
│   ├── notifications/      ← 通知管理
│   ├── questions/          ← 问题管理
│   ├── subjects/           ← 学科管理
│   ├── upload/             ← 文件上传
│   └── users/              ← 用户管理
└── backend/src/            ← 后端源码 → backend/src/CLAUDE.md
    ├── routes/             ← Express 路由
    ├── services/           ← 业务逻辑
    ├── middlewares/        ← 中间件
    └── utils/              ← 工具函数
```

## 子模块文档

- [前端源码层 →](./src/CLAUDE.md)
- [Vercel Serverless API →](./api/CLAUDE.md)
- [后端源码层 →](./backend/src/CLAUDE.md)
