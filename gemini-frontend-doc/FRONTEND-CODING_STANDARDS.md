# 知识星球问答小程序 - 编码规范与数据结构定义 v1.0

> **核心原则**：统一语言 (TypeScript)、统一风格 (Prettier/ESLint)、类型安全 (Zod/TS Interfaces)。

---

## 一、前端编码规范 (Frontend)

### 1.1 技术栈核心
*   **框架**: React 18+ (Functional Components)
*   **构建**: Vite
*   **路由**: React Router DOM v6+
*   **状态管理**: Zustand (全局), React Query (异步/服务端状态)
*   **样式**: TailwindCSS + clsx/tailwind-merge
*   **API请求**: Axios + Interceptors

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
*   **业务组件**: `PascalCase.tsx` (e.g., `QuestionCard.tsx`)
*   **基础组件 (UI)**: `kebab-case.tsx` (e.g., `button.tsx`, `dialog.tsx`) - 仅限 `src/components/ui/` 目录
*   **Hooks**: `camelCase.ts` 以 `use` 开头 (e.g., `useScroll.ts`)
*   **工具函数**: `camelCase.ts` (e.g., `formatDate.ts`)
*   **CSS 类名**: 使用 Tailwind Utility Classes，禁止写行内 `style={{}}`。

### 1.4 最佳实践
*   **Props**: 必须定义 Interface，优先使用 `type Props = { ... }`。
*   **导出**: 使用 `export function ComponentName` 而非 `export default` (便于重构)。
*   **逻辑分离**: 复用的业务逻辑必须抽离为 Custom Hook。
*   **空值处理**: 使用 Optional Chaining (`user?.name`) 和 Nullish Coalescing (`count ?? 0`)。

---

## 二、后端编码规范 (Backend)

### 2.1 技术栈核心
*   **环境**: Node.js (ES Modules)
*   **框架**: Express
*   **数据库**: PostgreSQL + Prisma ORM
*   **验证**: Zod (Runtime Validation)

### 2.2 架构模式 (Controller-Service)
*   **Controller (`src/controllers`)**: 处理 HTTP 请求/响应，验证输入，调用 Service。**禁止写业务逻辑**。
*   **Service (`src/services`)**: 包含核心业务逻辑，数据库操作。
*   **Middleware (`src/middlewares`)**: 鉴权、错误处理、日志。

### 2.3 错误处理
*   **禁止**直接抛出 `Error`。
*   **必须**使用统一的 `AppError` 类：
    ```typescript
    throw new AppError(404, "User not found");
    ```
*   使用 `try/catch` 并在 `catch` 中调用 `next(err)` 传递给全局错误中间件。

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
  role: 'student' | 'teacher' | 'parent';
  
  // 权限相关 (新增)
  expiresAt?: string; // ISO Date String, 学生/家长的过期时间
  isValidMember: boolean; // 是否在有效期内 (后端计算好返回)
  permissions: string[]; // e.g. ['question:create', 'audit:read']
}
```

#### 问题 (Question)
```typescript
interface Question {
  id: string;
  title: string;
  content?: string;
  
  // 分类与标签 (新增结构化字段)
  subject: 'math' | 'physics' | 'chemistry'; // 顶级科目
  topics: string[]; // e.g. ["二次函数", "抛物线"]
  methods?: string[]; // e.g. ["配方法"]
  
  // 媒体
  images: string[];
  audioUrl?: string; // 兼容 OSS URL 或 /uploads/ URL
  
  // 状态
  status: 'pending' | 'approved' | 'rejected';
  isPinned: boolean;
  score?: number; // 老师打分 1-5
  
  // 计数 (反范式化，便于列表展示)
  stats: {
    likes: number;
    answers: number;
    favorites: number;
  };
  
  // 关联
  author: {
    id: string;
    nickname: string;
    avatar?: string;
  };
  
  createdAt: string;
}
```

### 3.2 API 响应规范 (Standard Response)

所有 JSON 接口必须遵循以下信封格式：

```typescript
// 成功响应
interface SuccessResponse<T> {
  code: 200;
  message: string; // e.g. "Success"
  data: T;
}

// 错误响应
interface ErrorResponse {
  code: number;    // e.g. 400, 401, 500
  message: string; // e.g. "Invalid phone number"
  errors?: any[];  // Zod 验证详情
}
```

### 3.3 特殊交互协议

#### PWA / 乐观更新约定
*   **点赞/收藏**: 前端立即更新 UI，后端异步处理。
*   **失败回滚**: 若后端返回 !200，前端必须回滚状态并 Toaster 报错。

#### AI 审核结果协议 (`ai_result` 字段)
后端存储 JSON 字符串，前端解析为：
```typescript
interface AIResult {
  safe: boolean;
  confidence: number; // 0.0 - 1.0
  reasons: string[];  // e.g. ["political", "insult"]
  suggestion?: string; // AI 修改建议
}
```

---
**版本**: 1.0
**日期**: 2026-02-01
