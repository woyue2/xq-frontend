# 全仓硬编码问题清单

> 扫描时间：2026-02-13
> 扫描范围：React 前端 + Express 后端全部源代码

---

## 1. URL/域名/IP 相关

| 文件路径 | 行号 | 命中类别 | 原始片段 | 风险 | 建议迁移位置 | 建议配置名 |
|---------|------|---------|---------|------|------------|-----------|
| src/services/api.ts | 9 | URL/域名 | `const API_BASE = "http://localhost:4000/api"` | P0 | env | VITE_API_BASE_URL |
| src/services/api.ts | 25 | URL/域名 | `wsEndpoint: "ws://localhost:3000"` | P0 | env | VITE_WS_ENDPOINT |
| src/lib/permissions.ts | 12 | localhost | `return url.startsWith('http://localhost')` | P1 | env | VITE_DEV_ORIGIN |
| src/pages/QuestionDetail.tsx | 45 | localhost | `window.location.origin !== 'http://localhost:5173'` | P1 | env | VITE_DEV_ORIGIN |

---

## 2. 端口/CORS origin/回调地址

| 文件路径 | 行号 | 命中类别 | 原始片段 | 风险 | 建议迁移位置 | 建议配置名 |
|---------|------|---------|---------|------|------------|-----------|
| backend/src/config/env.ts | 7 | 端口 | `PORT: z.coerce.number().default(3000)` | P0 | env | PORT |
| src/services/api.ts | 12 | CORS origin | `const IS_DEV = url.startsWith('http://localhost');` | P1 | env | VITE_IS_DEV |

---

## 3. Key/Secret/Token/Password/JWT

| 文件路径 | 行号 | 命中类别 | 原始片段 | 风险 | 建议迁移位置 | 建议配置名 |
|---------|------|---------|---------|------|------------|-----------|
| backend/src/config/env.ts | 10 | JWT密钥 | `JWT_SECRET: z.string().min(16)` | P0 | env | JWT_SECRET |
| backend/src/config/env.ts | 11 | 数据库URL | `DATABASE_URL: z.string().url()` | P0 | env | DATABASE_URL |
| src/services/api.ts | 30 | Authorization头 | `Authorization: \`Bearer \${token}\`` | P1 | 常量 | AUTHORIZATION_HEADER |

---

## 4. Axios配置

| 文件路径 | 行号 | 命中类别 | 原始片段 | 风险 | 建议迁移位置 | 建议配置名 |
|---------|------|---------|---------|------|------------|-----------|
| src/services/api.ts | 15 | 超时时间 | `timeout: 10000` | P1 | env | VITE_API_TIMEOUT |
| src/services/api.ts | 18 | Content-Type | `'Content-Type': 'application/json'` | P2 | 常量 | API_CONTENT_TYPE |
| src/services/api.ts | 14 | baseURL | `baseURL: API_BASE` | P0 | env | VITE_API_BASE_URL |

---

## 5. 魔法数字

| 文件路径 | 行号 | 命中类别 | 原始片段 | 风险 | 建议迁移位置 | 建议配置名 |
|---------|------|---------|---------|------|------------|-----------|
| src/services/api.ts | 15 | 超时时间 | `timeout: 10000` | P1 | env | VITE_API_TIMEOUT |
| src/services/mock/handlers.ts | 多处 | 分页size | `pageSize: 10` | P2 | 常量 | DEFAULT_PAGE_SIZE |
| src/hooks/useAuth.ts | - | 重试逻辑 | `retry: 1` | P2 | env | VITE_API_RETRY_COUNT |

---

## 6. 状态枚举/角色字符串

| 文件路径 | 行号 | 命中类别 | 原始片段 | 风险 | 建议迁移位置 | 建议配置名 |
|---------|------|---------|---------|------|------------|-----------|
| src/lib/permissions.ts | 20 | 角色字符串 | `'teacher'` | P1 | 常量 | USER_ROLE_TEACHER |
| src/lib/permissions.ts | 24 | 角色字符串 | `'student'` | P1 | 常量 | USER_ROLE_STUDENT |
| src/lib/permissions.ts | 28 | 角色字符串 | `'parent'` | P1 | 常量 | USER_ROLE_PARENT |
| backend/src/services/auth.service.ts | 多处 | 审核状态 | `'pending'`, `'approved'`, `'rejected'` | P1 | 常量/Enum | AUDIT_STATUS_* |
| src/types/api.ts | - | 审核状态 | `status: 'pending' \| 'approved' \| 'rejected'` | P1 | 常量/Enum | AUDIT_STATUS_* |

---

## 7. 错误处理/Console.log

| 文件路径 | 行号 | 命中类别 | 原始片段 | 风险 | 建议迁移位置 | 建议处理方式 |
|---------|------|---------|---------|------|------------|-------------|
| src/services/api.ts | 69-76 | catch吞错 | `catch (error: unknown) { ... }` | P1 | - | 添加结构化错误日志 |
| src/pages/QuestionDetail.tsx | 47-53 | catch吞错 | `console.warn('非本地环境，跳过mock');` | P2 | - | 统一错误处理 |
| src/services/mock/handlers.ts | 多处 | console.log | `console.log('[GET /api/user/profile]')` | P2 | - | 使用Logger替代 |

---

## 风险汇总

| 风险等级 | 数量 | 说明 |
|---------|------|------|
| **P0 (高风险)** | 2 | API_BASE_URL 和 WS_ENDPOINT 硬编码导致无法区分环境 |
| **P1 (中风险)** | 8 | 角色字符串、审核状态、端口等配置分散 |
| **P2 (低风险)** | 6 | 超时时间、Content-Type、console.log等 |

---

## 配置项清单

### 环境变量配置

| env变量名 | 类型 | 默认值 | 影响模块 | 当前状态 |
|----------|------|--------|---------|---------|
| **前端环境变量** |
| VITE_API_BASE_URL | string | "http://localhost:4000/api" | src/services/api.ts | ❌ 硬编码 |
| VITE_WS_ENDPOINT | string | "ws://localhost:3000" | src/services/api.ts | ❌ 硬编码 |
| VITE_API_TIMEOUT | number | 10000 | src/services/api.ts | ❌ 硬编码 |
| VITE_IS_DEV | boolean | auto-detect | src/services/api.ts | ❌ 硬编码 |
| VITE_DEV_ORIGIN | string | "http://localhost:5173" | src/lib/permissions.ts, QuestionDetail.tsx | ❌ 硬编码 |
| **后端环境变量** |
| PORT | number | 3000 | backend/src/config/env.ts | ✅ 已配置 |
| NODE_ENV | 'development' \| 'test' \| 'production' | 'development' | backend/src/config/env.ts | ✅ 已配置 |
| DATABASE_URL | string | - | backend/src/config/env.ts | ✅ 已配置 |
| JWT_SECRET | string | - (min 16 chars) | backend/src/config/env.ts | ✅ 已配置 |
| CORS_ORIGIN | string | "http://localhost:5173" | backend/src/app.ts | ⚠️ 需补充 |

### 常量配置（建议迁移至 src/constants/）

| 常量名 | 类型 | 当前值 | 影响模块 | 建议文件名 |
|--------|------|--------|---------|----------|
| USER_ROLE_TEACHER | string | 'teacher' | src/lib/permissions.ts | userRoles.ts |
| USER_ROLE_STUDENT | string | 'student' | src/lib/permissions.ts | userRoles.ts |
| USER_ROLE_PARENT | string | 'parent' | src/lib/permissions.ts | userRoles.ts |
| AUDIT_STATUS_PENDING | string | 'pending' | backend多文件 | auditStatus.ts |
| AUDIT_STATUS_APPROVED | string | 'approved' | backend多文件 | auditStatus.ts |
| AUDIT_STATUS_REJECTED | string | 'rejected' | backend多文件 | auditStatus.ts |
| API_CONTENT_TYPE | string | 'application/json' | src/services/api.ts | apiConstants.ts |
| AUTHORIZATION_HEADER | string | 'Authorization: Bearer ...' | src/services/api.ts | apiConstants.ts |
| DEFAULT_PAGE_SIZE | number | 10 | src/services/mock/handlers.ts | pagination.ts |

---

## 建议处理优先级

### 立即处理 (P0)

- [ ] 将 `API_BASE` 和 `wsEndpoint` 迁移至环境变量
- [ ] 完善后端 `CORS_ORIGIN` 配置

### 短期处理 (P1)

- [ ] 创建 `src/constants/userRoles.ts` 统一角色字符串
- [ ] 创建 `src/constants/auditStatus.ts` 统一审核状态
- [ ] 完善错误处理，避免吞错

### 长期优化 (P2)

- [ ] 统一超时、重试等配置
- [ ] 使用 Logger 替代散落的 console.log
- [ ] 建立完整的 env.example 文件
