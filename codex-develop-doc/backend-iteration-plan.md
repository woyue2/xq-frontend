# 知识星球问答小程序 - 后端开发迭代计划（Codex 工作稿）

> 本文档基于：`后端需求文档-完整版.md`、`后端-测试用例.md`、`BACKEND-CODING_STANDARDS.md`，用于拆分 Jira/飞书任务与指导具体实现。

---

## 1. 模块优先级与迭代节奏（任务总览）

> ⚠️ 时间粒度以「周」为单位，可按实际人力线性缩放；假设：1 名后端 + 1 名 QA。

### 1.1 迭代里程碑

- **M0（第 0 周）基础骨架与环境**
  - 初始化后端工程骨架。
  - 搭建配置管理、日志、错误处理、健康检查。
  - 接入 Prisma 与数据库迁移流水线。
  - 接入 Redis 与基础工具封装。

- **M1（第 1 周）鉴权 / 白名单 / 课时（P0）**
  - 登录、验证码（如启用）、白名单管理。
  - 课时有效期与角色权限控制。
  - 覆盖 `后端-测试用例.md` 中：
    - 用户认证、白名单管理、课时管理、权限控制相关用例。

- **M2（第 2 周）问题 / 回答 / 评论 + 点赞收藏（P0）**
  - 问题 CRUD、回答与评论、点赞与收藏。
  - 计数字段维护与列表查询。
  - 覆盖问题管理、回答管理、评论管理、点赞收藏相关用例。

- **M3（第 3 周）审核 / AI 回调 / 行为埋点 / 文件上传（P0/P1）**
  - 审核队列、AI 回调接口、行为日志接口、上传签名。
  - 引入任务队列（如 BullMQ）处理异步审核任务。
  - 覆盖审核管理、文件上传、行为埋点、安全/性能部分用例。

- **M4（第 4 周）通知系统 / 性能与安全优化（P1）**
  - 通知读取/未读数/标记已读。
  - 性能优化（索引、N+1 优化）、安全加固与完整压测。

- **M5（第 5 周）收尾 / 文档 / 部署与回滚（P0）**
  - API 文档、测试报告、部署手册与回滚方案。
  - 最终回归：确保 `后端-测试用例.md` 所有用例通过。

---

## 2. 任务清单（按迭代拆分）

> 说明：下面适合作为 Jira/飞书任务拆分的基础，可按团队习惯调整粒度。

### 2.1 M0 - 基础骨架与环境

- T0-1【后端】初始化项目结构
  - 创建 `backend` 目录或独立后端项目。
  - 初始化 `package.json`、TypeScript、ESLint、Jest/Vitest 配置。
  - 引入 Express、Prisma、Pino、Zod 等依赖。

- T0-2【后端】配置管理与环境变量验证
  - 实现 `src/config/env.ts`：使用 Zod 校验必需环境变量。
  - 支持 `.env.development` / `.env.test` / `.env.production`。

- T0-3【后端】日志与错误处理中间件
  - 集成 Pino 日志。
  - 统一错误类型 `AppError`，实现全局错误处理中间件。
  - 约定统一响应格式（code/message/data/timestamp）。

- T0-4【后端】数据库与 Prisma 初始化
  - 定义 `prisma/schema.prisma` 基础模型（users/questions/answers/comments 等骨架）。
  - 配置 `prisma migrate` 流程（dev/test/prod 三种环境）。

- T0-5【后端】Redis 与基础工具封装
  - 实现 `src/config/redis.ts` 与简单封装。
  - 预留验证码限流、行为日志缓存等使用场景。

- T0-6【后端】健康检查与就绪检查
  - `/health`、`/ready` 接口，检查数据库、Redis 连接状态。

### 2.2 M1 - 鉴权 / 白名单 / 课时

- T1-1【后端】用户与白名单相关数据模型完善
  - 在 Prisma 中完善 `users`、`user_whitelist` 表：
    - 手机号、姓名、角色、年级、课时有效期（expires_at）、状态字段。
  - 为手机号、角色、有效期等字段添加索引。

- T1-2【后端】JWT 体系与鉴权中间件
  - 实现 JWT 生成/解析工具（`utils/jwt.ts`）。
  - 实现鉴权中间件：解析 token，挂载 `req.user`。

- T1-3【后端】验证码发送接口（可接真实短信或 Mock）
  - `POST /api/auth/send-code`：
    - 参数校验（Zod）。
    - 限流策略（IP + 手机号）。
    - 若启用真实短信：对接短信服务供应商。
  - 覆盖 `AUTH-API-*` 相关测试用例。

- T1-4【后端】登录与白名单校验
  - `POST /api/auth/login`：
    - 校验验证码。
    - 校验 `user_whitelist` 是否存在记录。
    - 登录时同步/更新 `expires_at`、角色信息。
    - 响应返回 `expiresAt` 与 `permissions` 列表。

- T1-5【后端】课时有效期与权限中间件
  - 封装一个检查课时有效期的中间件：
    - 课时过期 → 拦截写操作，返回 `403/MEMBER_EXPIRED`。
  - 封装角色权限中间件：
    - 管理员/教师/学生/家长不同接口访问控制。

- T1-6【QA】认证 / 白名单 / 课时用例落地
  - 根据 `后端-测试用例.md` 的认证、白名单、课时、权限章节实现全部测试。
  - 若发现缺少用例，按约定新增对应测试 ID 并更新文档。

### 2.3 M2 - 问题 / 回答 / 评论 / 点赞收藏

- T2-1【后端】问题/回答/评论/点赞收藏数据模型完善
  - 补全 `questions`、`answers`、`comments`、`likes`、`favorites` 等模型字段。
  - 加索引：问题状态、创建时间、作者 ID 等。

- T2-2【后端】问题 CRUD 与列表查询接口
  - `GET /api/questions`（分页/筛选/搜索）。
  - `GET /api/questions/:id`。
  - `POST /api/questions`：结构化 subject/topics/methods + 异步 AI 审核任务。
  - `PATCH /api/questions/:id`：仅允许特定字段更新。

- T2-3【后端】回答与评论接口
  - 回答：`POST /api/questions/:id/answers`、`GET /api/questions/:id/answers` 等。
  - 评论：`POST /api/questions/:id/comments`、`GET /api/questions/:id/comments`。

- T2-4【后端】点赞与收藏接口
  - 点赞：支持问题/回答两种 target_type，幂等等。
  - 收藏：对问题收藏/取消收藏。

- T2-5【后端】计数维护与事务
  - 创建/删除回答/评论/点赞/收藏时，维护计数字段。
  - 使用事务保证计数更新一致性。

- T2-6【QA】问题/回答/评论/点赞收藏测试用例
  - 覆盖所有相关模块用例。
  - 对幂等等、事务回滚等场景补充分支测试。

### 2.4 M3 - 审核 / AI 回调 / 行为埋点 / 文件上传

- T3-1【后端】审核队列与审核接口
  - 审核列表、通过/驳回接口。
  - 与问题/回答/评论状态联动。

- T3-2【后端】AI 回调接口
  - `POST /api/internal/ai-check`：
    - 写入 `ai_result`。
    - 更新问题/回答审核状态。

- T3-3【后端】行为埋点接口
  - `POST /api/behavior/log`：
    - 接收前端行为类型与 metadata。
    - 写入 `behavior_logs` 表或队列。

- T3-4【后端】上传签名接口
  - `GET /api/upload/signature`：
    - 返回 OSS 直传签名。
    - 限制文件类型 / 大小。

- T3-5【QA】行为埋点 / 审核 / 上传相关测试
  - 完成 `后端-测试用例.md` 中审核管理、文件上传、行为埋点相关用例。
  - 若行为埋点批量接口存在，补充对应测试。

### 2.5 M4 - 通知 / 性能与安全

- T4-1【后端】通知系统
  - 通知表模型设计。
  - 获取通知列表、未读数、标记已读接口。

- T4-2【后端】性能优化
  - 按测试用例中性能要求对关键接口压测。
  - 为慢查询添加索引或缓存。

- T4-3【后端】安全加固
  - SQL 注入防护、XSS 输出编码检查。
  - CSRF 防护策略（若为跨域，主要在前端；后台可通过 Referer / CSRF Token）。
  - 暴力破解限流与锁定策略。

- T4-4【QA】性能与安全测试
  - 按 `后端-测试用例.md` 的性能、安全用例执行，并记录报告。

### 2.6 M5 - 文档 / 部署 / 回滚

- T5-1【后端】API 文档整理
  - 输出 OpenAPI/Apifox 文档，与测试用例 ID 对齐。

- T5-2【后端】部署与回滚手册
  - 描述部署步骤、环境变量配置、数据库迁移流程。
  - 为每次版本变更记录迁移与回滚策略。

- T5-3【QA】测试报告
  - 按 `后端-测试用例.md` 的报告模板产出最终测试报告。

---

## 3. 推荐后端目录结构（结合编码规范）

> 结合 `BACKEND-CODING_STANDARDS.md`，建议后端在仓库中使用类似结构。

```bash
backend/
├── src/
│   ├── app.ts                # 应用入口（挂载中间件与路由）
│   ├── server.ts             # 启动脚本（监听端口）
│   ├── config/               # 配置管理
│   │   ├── env.ts
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── logger.ts
│   ├── controllers/          # 控制器（Express handler）
│   │   ├── auth.controller.ts
│   │   ├── question.controller.ts
│   │   ├── answer.controller.ts
│   │   ├── comment.controller.ts
│   │   ├── like.controller.ts
│   │   ├── favorite.controller.ts
│   │   ├── audit.controller.ts
│   │   ├── behavior.controller.ts
│   │   └── upload.controller.ts
│   ├── services/             # 业务逻辑
│   │   ├── auth.service.ts
│   │   ├── question.service.ts
│   │   ├── answer.service.ts
│   │   ├── comment.service.ts
│   │   ├── like.service.ts
│   │   ├── favorite.service.ts
│   │   ├── audit.service.ts
│   │   ├── behavior.service.ts
│   │   └── notification.service.ts
│   ├── repositories/         # 数据访问（按需）
│   │   ├── user.repository.ts
│   │   ├── question.repository.ts
│   │   └── ...
│   ├── routes/               # 路由分组
│   │   ├── auth.routes.ts
│   │   ├── question.routes.ts
│   │   ├── admin.routes.ts
│   │   └── index.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── role.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── logging.middleware.ts
│   ├── validators/           # Zod schema
│   │   ├── auth.schema.ts
│   │   ├── question.schema.ts
│   │   ├── behavior.schema.ts
│   │   └── ...
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── sms.ts
│   │   ├── oss.ts
│   │   ├── ai-audit.ts
│   │   └── password.ts
│   ├── errors/
│   │   └── AppError.ts
│   ├── types/
│   │   ├── entities.ts
│   │   ├── requests.ts
│   │   ├── responses.ts
│   │   └── auth.ts
│   └── tests/
│       ├── unit/
│       └── integration/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── package.json
```

---

## 4. 关键接口列表草稿（索引形式）

> 详细请求/响应格式由 `backend-key-apis.md` 补充。

- 鉴权与用户
  - `POST /api/auth/send-code`
  - `POST /api/auth/login`
  - `GET /api/auth/me`

- 白名单与课时
  - `GET /api/admin/whitelist`
  - `POST /api/admin/whitelist`
  - `PATCH /api/admin/whitelist/:id`
  - `DELETE /api/admin/whitelist/:id`

- 问题 / 回答 / 评论
  - `GET /api/questions`
  - `GET /api/questions/:id`
  - `POST /api/questions`
  - `PATCH /api/questions/:id`
  - `POST /api/questions/:id/answers`
  - `GET /api/questions/:id/answers`
  - `POST /api/questions/:id/comments`
  - `GET /api/questions/:id/comments`

- 点赞 / 收藏
  - `POST /api/interactions/like`
  - `DELETE /api/interactions/like`
  - `POST /api/interactions/favorite`
  - `DELETE /api/interactions/favorite`

- 审核与 AI 回调
  - `GET /api/admin/audit-queue`
  - `POST /api/admin/audit/:id/approve`
  - `POST /api/admin/audit/:id/reject`
  - `POST /api/internal/ai-check`

- 行为埋点
  - `POST /api/behavior/log`

- 文件上传
  - `GET /api/upload/signature`

- 通知
  - `GET /api/notifications`
  - `POST /api/notifications/read`
  - `GET /api/notifications/unread-count`

---

> 后续文件：
> - `backend-key-apis.md`：详细接口规范（请求/响应/错误码示例）。
> - `backend-testing-plan.md`：与 `后端-测试用例.md` 对齐的自动化测试实现计划。

