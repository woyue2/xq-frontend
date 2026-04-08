# xq-frontend - 驾培问答平台（简化版）

## 项目概述

简化版教育问答平台，专注核心功能：问题管理、回答、评论、图片上传，以及科目/考点分类体系。

**简化版范围：**
- 保留 6 个数据表：User, Question, Answer, Comment, Subject, Topic
- 保留 7 个路由：/, /login, /create, /edit/:id, /question/:id, /answer/:id, /admin/subjects
- 保留 6 个 API：auth, questions, answers, comments, subjects, upload
- 删除功能：likes, favorites, notifications, behavior tracking, audit logs, parent-child, good questions

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **后端**：Vercel Serverless Functions (Node.js 20)
- **数据库**：Supabase Postgres + Prisma ORM
- **部署**：Vercel (自动 CI/CD)
- **测试**：Vitest + Playwright + Property-Based Testing (fast-check)
- **状态管理**：Zustand
- **路由**：React Router v7
- **UI 组件**：Radix UI + Tailwind CSS

## 架构设计

**前后端分离（SPA + Serverless API）：**
- **API 层**：`api/*.ts` → Vercel Edge Functions（6 个 API 文件）
- **前端层**：`src/` → Vite 打包 → `dist/`（6 个页面 + 12 个可复用组件）
- **数据层**：Prisma Client → Supabase Postgres（6 个模型）

**部署流程：**
1. 代码推送到 GitHub
2. Vercel 自动触发构建
3. 前端：`npm run build` → `dist/`
4. 后端：API 文件自动部署为 Serverless Functions
5. 数据库：Prisma 迁移自动应用

## 目录结构

```
xq-frontend/
├── api/                          # Serverless API 函数（L2: api/CLAUDE.md）
│   ├── auth.ts                  # 认证 API（密码登录 + JWT）
│   ├── questions.ts             # 问题管理 API
│   ├── answers.ts               # 回答管理 API
│   ├── comments.ts              # 评论管理 API
│   ├── subjects.ts              # 科目/考点管理 API
│   ├── upload.ts                # 图片上传 API
│   └── _helpers.ts              # API 辅助函数（Prisma Client、错误处理）
│
├── src/                          # 前端源码（L2: src/CLAUDE.md）
│   ├── components/              # React 组件（L2: src/components/CLAUDE.md）
│   │   ├── QuestionCard.tsx    # 问题卡片（列表项）
│   │   ├── QuestionDetail.tsx  # 问题详情
│   │   ├── AnswerCard.tsx      # 回答卡片
│   │   ├── CommentCard.tsx     # 评论卡片
│   │   ├── ImageUploader.tsx   # 图片上传器
│   │   ├── ImageGallery.tsx    # 图片画廊
│   │   ├── SubjectTopicSelector.tsx  # 科目考点选择器
│   │   ├── QuestionFilter.tsx  # 问题筛选器
│   │   ├── SubjectManager.tsx  # 科目管理组件
│   │   ├── TopicManager.tsx    # 考点管理组件
│   │   ├── SubjectForm.tsx     # 科目表单
│   │   ├── TopicForm.tsx       # 考点表单
│   │   └── ui/                 # shadcn/ui 基础组件
│   │
│   ├── pages/                   # 页面组件（L2: src/pages/CLAUDE.md）
│   │   ├── HomePage.tsx        # 首页（问题列表）
│   │   ├── LoginPage.tsx       # 登录页
│   │   ├── CreateQuestionPage.tsx  # 创建/编辑问题页
│   │   ├── QuestionDetailPage.tsx  # 问题详情页
│   │   ├── AnswerQuestionPage.tsx  # 回答问题页
│   │   └── admin/
│   │       └── AdminSubjectsPage.tsx  # 科目管理页
│   │
│   ├── hooks/                   # 自定义 Hooks（L2: src/hooks/CLAUDE.md）
│   ├── services/                # API 调用层（L2: src/services/CLAUDE.md）
│   ├── stores/                  # Zustand 状态管理（L2: src/stores/CLAUDE.md）
│   ├── lib/                     # 工具函数（L2: src/lib/CLAUDE.md）
│   ├── types/                   # TypeScript 类型定义（L2: src/types/CLAUDE.md）
│   ├── config/                  # 配置文件（L2: src/config/CLAUDE.md）
│   ├── layouts/                 # 布局组件（L2: src/layouts/CLAUDE.md）
│   └── styles/                  # 样式文件（L2: src/styles/CLAUDE.md）
│
├── prisma/                       # 数据库 Schema 和迁移
│   ├── schema.prisma            # 简化后的 Schema（6 个模型）
│   └── migrations/              # 数据库迁移历史
│
├── archive/                      # 历史文件归档
│   ├── old-docs/                # 旧文档
│   ├── old-tests/               # 旧测试
│   └── old-scripts/             # 旧脚本
│
├── .kiro/specs/app-simplification/  # 简化版 Spec 文档
│   ├── requirements.md          # 需求文档
│   ├── design.md                # 设计文档
│   └── tasks.md                 # 实施计划
│
├── vercel.json                  # Vercel 部署配置
├── vite.config.ts               # Vite 构建配置
├── package.json                 # 依赖管理
├── README.md                    # 项目说明
├── INTEGRATION_TESTING.md       # 集成测试文档
└── INTEGRATION_TESTS_SUCCESS.md # 测试结果报告
```

## 简化版数据模型（6 个表）

### User - 用户表
- id, phone, name, nickname, avatar, role, passwordHash, createdAt, updatedAt

### Question - 问题表
- id, title, content, subject, tags, images, authorId, authorName, authorAvatar, createdAt, updatedAt

### Answer - 回答表
- id, questionId, content, images, authorId, authorName, authorAvatar, createdAt, updatedAt

### Comment - 评论表
- id, questionId, content, image, authorId, authorName, authorAvatar, createdAt, updatedAt

### Subject - 科目表
- id, key, name, order, enabled, description, createdAt, updatedAt

### Topic - 考点表
- id, subjectKey, value, label, order, enabled, createdAt, updatedAt

## 开发规范

### GEB 三层文档协议
- **L1（本文件）**：项目宪法·全局地图·技术栈
- **L2（模块级）**：各目录的 CLAUDE.md，列出成员清单和接口
- **L3（文件级）**：每个文件头部的 [POS]/[INPUT]/[OUTPUT]/[PROTOCOL] 注释

**L3 标记状态**:
- ✅ API 层：7/7 文件已标记（100%）
- ✅ 组件层：12/12 文件已标记（100%）
- ✅ 页面层：6/6 文件已标记（100%）

### 代码品味（Linus 标准）
- 函数长度 ≤ 20 行（复杂逻辑 ≤ 30 行）
- 嵌套深度 ≤ 3 层
- 分支数量 ≤ 3 个
- 无重复代码（DRY 原则）
- 命名清晰（无需注释即可理解）
- 无隐式副作用
- 纯函数优先（易测试）

**代码品味遵守率**:
- ✅ API 层：100%（经过 Phase A/B/C 重构）
- ⚠️ 组件层：部分超大组件需拆分（7 个组件 >150 行）

### TypeScript 严格模式
- 禁止 `any`（使用 `unknown` + 类型收窄）
- 禁止隐式 undefined（使用可选链 `?.`）
- 所有 API 响应必须有接口定义
- 组件 Props 必须有接口定义
- useState 泛型显式标注

**TypeScript Strict Mode 状态**:
- ✅ API 层：0 个 `any` 类型（100% 类型安全）
- ✅ 组件层：生产代码无 `any`（测试文件除外）
- ✅ 所有 API 响应有接口定义
- ✅ 所有组件 Props 有接口定义

### React Hooks 规范
- useEffect 依赖数组完整
- useEffect 中异步函数正确写法
- useCallback/useMemo 合理使用
- 自定义 Hook 以 `use` 开头
- 事件处理函数以 `handle` 开头

### API 层设计模式（Phase A/B/C 重构后）

**辅助函数模式**:
- `sendError()` - 统一错误响应
- `sendAuthError()` - 统一认证错误响应
- `toXxxDTO()` - 模型到 DTO 转换
- `validateXxx()` - 验证逻辑集中化
- `getAdminUser()` - 纯函数权限检查

**代码质量指标**:
| 指标 | 重构前 | 重构后 | 改进 |
|------|--------|--------|------|
| API 层总行数 | 964 行 | 700 行 | -27% |
| 重复代码 | ~274 行 | 0 行 | -100% |
| `any` 类型 | 7 处 | 0 处 | -100% |
| 辅助函数 | 1 个 | 11 个 | +1000% |

**Prisma Client 使用规范**:
- ✅ 所有 API 文件必须从 `api/_helpers.ts` 导入 `prisma`
- ❌ 禁止在 API 文件中重复初始化 PrismaClient
- 原因：防止连接池耗尽（Vercel Serverless 限制）

## 测试策略

### 单元测试（Vitest）
- 组件测试：`src/test/*.test.tsx`
- Hooks 测试：`src/test/*.test.ts`
- 工具函数测试：`src/lib/*.test.ts`

### 集成测试（Vitest + Real API）
- API 集成测试：`src/test/integration/*.test.ts`
- 47 个测试，100% 通过
- 测试真实 Supabase 数据库

### 属性测试（fast-check）
- 验证通用正确性属性
- 输入验证、数据持久化、筛选排序等

### E2E 测试（Playwright）
- 端到端用户流程测试

详见：`INTEGRATION_TESTING.md`

## 部署环境

### 开发环境
- 本地开发：`npm run dev`（Vite dev server + Vercel dev）
- 数据库：Supabase 测试项目
- 环境变量：`.env.local`

### 生产环境
- 部署平台：Vercel
- 数据库：Supabase 生产项目
- 环境变量：Vercel Dashboard 配置
- 域名：know-ans.vercel.app

## 相关文档

### 项目文档
- **需求文档**：`.kiro/specs/app-simplification/requirements.md`
- **设计文档**：`.kiro/specs/app-simplification/design.md`
- **实施计划**：`.kiro/specs/app-simplification/tasks.md`

### 测试文档
- **集成测试**：`INTEGRATION_TESTING.md`
- **测试结果**：`INTEGRATION_TESTS_SUCCESS.md`

### 技术文档
- **错误处理**：`src/lib/ERROR_HANDLING.md`
- **图片上传**：`api/UPLOAD_README.md`

### 代码审查报告（GEB Protocol）
- **Phase A 完成报告**：`GEB_PHASE_A_COMPLETE.md`（关键问题修复）
- **Phase B 完成报告**：`GEB_PHASE_B_COMPLETE.md`（TypeScript Strict Mode + 重构）
- **Phase C 进度报告**：`GEB_PHASE_C_PROGRESS.md`（持续重构）
- **最终总结报告**：`GEB_REVIEW_SUMMARY.md`（全面总结）

**代码审查成果**:
- ✅ Prisma Client 单例化（防止连接池耗尽）
- ✅ requireAdmin() 重构为纯函数（无副作用）
- ✅ 错误处理标准化（`catch (error: unknown)`）
- ✅ 替换所有 `any` 类型（API 层 100% 类型安全）
- ✅ API 层代码减少 27%（264 行）
- ✅ 消除所有重复代码（274 行）
- ✅ 新增 11 个可复用辅助函数
- ✅ 验证逻辑集中化（易于维护）

---

**[PROTOCOL]**: 本文件是 L1 根文档，变更时需同步更新所有 L2 文档的父级链接。
