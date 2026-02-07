# 知识星球问答小程序 - 编码规范与数据结构定义 v1.0

> **核心原则**：统一语言 (TypeScript)、统一风格 (Prettier/ESLint)、类型安全 (Zod/TS Interfaces)。

---

## 一、前端编码规范 (Frontend)

### 1.1 技术栈核心

- **框架**: React 18+ (Functional Components)
- **构建**: Vite
- **路由**: React Router DOM v6+
- **状态管理**: Zustand (全局), React Query (异步/服务端状态)
- **样式**: TailwindCSS + clsx/tailwind-merge
- **API请求**: Axios + Interceptors

### 1.2 目录结构约定

```
src/
  ├── components/      # UI 组件 (原子级/分子级)
  │   ├── ui/          # Radix/Shadcn 通用组件 (Button, Input)
  │   └── features/    # 业务组件 (QuestionCard, CommentList)
  ├── hooks/           # 自定义 Hooks (useAuth, useQuestions)
  ├── layouts/         # 页面布局 (MainLayout, AuthLayout)
  ├── pages/           # 页面级组件 (负责数据获取与分发)
  ├── services/        # API 服务层 (不包含 UI 逻辑)
  ├── stores/          # Zustand 状态库
  ├── types/           # 全局类型定义
  └── utils/           # 工具函数
```

### 1.3 命名规范

- **业务组件**: `PascalCase.tsx` (e.g., `QuestionCard.tsx`)
- **基础组件 (UI)**: `kebab-case.tsx` (e.g., `button.tsx`, `dialog.tsx`) - 仅限 `src/components/ui/` 目录
- **Hooks**: `camelCase.ts` 以 `use` 开头 (e.g., `useScroll.ts`)
- **工具函数**: `camelCase.ts` (e.g., `formatDate.ts`)
- **CSS 类名**: 使用 Tailwind Utility Classes，禁止写行内 `style={{}}`。

### 1.4 最佳实践

- **Props**: 必须定义 Interface，优先使用 `type Props = { ... }`。
- **导出**: 使用 `export function ComponentName` 而非 `export default` (便于重构)。
- **逻辑分离**: 复用的业务逻辑必须抽离为 Custom Hook。
- **空值处理**: 使用 Optional Chaining (`user?.name`) 和 Nullish Coalescing (`count ?? 0`)。

---

## 二、后端编码规范 (Backend)

### 2.1 技术栈核心

- **环境**: Node.js (ES Modules)
- **框架**: Express
- **数据库**: PostgreSQL + Prisma ORM
- **验证**: Zod (Runtime Validation)

### 2.2 架构模式 (Controller-Service)

- **Controller (`src/controllers`)**: 处理 HTTP 请求/响应，验证输入，调用 Service。**禁止写业务逻辑**。
- **Service (`src/services`)**: 包含核心业务逻辑，数据库操作。
- **Middleware (`src/middlewares`)**: 鉴权、错误处理、日志。

### 2.3 错误处理

- **禁止**直接抛出 `Error`。
- **必须**使用统一的 `AppError` 类：
  ```typescript
  throw new AppError(404, 'User not found');
  ```
- 使用 `try/catch` 并在 `catch` 中调用 `next(err)` 传递给全局错误中间件。

---

## 三、前后端通用数据结构 (Shared Interfaces)

### 3.1 核心实体 (Prisma Schema 映射)

#### 用户 (User)

```typescript
interface User {
  id: string; // UUID
  phone: string;
  nickname: string;
  avatar?: string;
```
