# 后端结构审计报告（架构审计员）

- 审计时间：2026-02-13
- 审计范围：`backend/src/routes/*.ts`（HTTP 层）
- 审计方式：只读分析（未修改业务代码）

## 0. 结论摘要

当前后端并非严格三层（HTTP → Service → Repository），而是**“Route + Service 的两层主结构，伴随 Route 直连 Prisma 的混合模式”**。

- 主路径：`Route -> Service -> Prisma`
- 实际并存路径：`Route -> Prisma`（在多个文件中存在）
- 结论：分层边界存在穿透，尤其在 `question/internal/profile/user-me/comment` 路由中明显。

---

## 一、分层边界检查

### 1) HTTP 层是否包含复杂逻辑/规则/状态变更/事务/DB 访问

审计结果：**存在**，且在部分文件中占比高。

- 复杂业务逻辑：存在（权限矩阵、状态流转、批量处理、审核回调决策）
- 大量条件判断：存在（`question.routes.ts`、`internal.routes.ts`、`behavior.routes.ts`、`user-me.routes.ts` 明显）
- 数据计算或规则处理：存在（计数增减、状态差量、字段过滤/映射、分页兜底）
- 状态变更逻辑：存在（审核状态、理解状态、点赞收藏状态、通知已读）
- 事务处理：存在（`question.routes.ts` 中 `prisma.$transaction`）
- 直接数据库访问：存在（多处 route 直接 `prisma.*`）

### 2) 是否存在清晰结构 HTTP→业务→数据访问

- 严格三层：**否**（缺少独立 repository/data-access 层）
- 当前实际结构：
  - 大部分：`Route -> Service -> Prisma`
  - 部分：`Route -> Prisma`（越过 Service）
  - 少量：`Route` 同时调用 `Service + Prisma`（跨层混用）

---

## 二、文件级诊断（HTTP 层全量）

| 文件 | 是否包含业务逻辑 | 逻辑占比 | 是否直接DB调用 | 框架耦合严重写法 | 单文件复杂度风险 |
|---|---|---|---|---|---|
| `backend/src/routes/admin-audit.routes.ts` | 是 | 中 | 否 | 中（大量基于 `req.body.type` 分支） | 中 |
| `backend/src/routes/admin-class-hours.routes.ts` | 是 | 低-中 | 否 | 低 | 低-中 |
| `backend/src/routes/admin-question-dimensions.routes.ts` | 是 | 中 | 否 | 中（参数校验+映射较多） | 中 |
| `backend/src/routes/admin-whitelist.routes.ts` | 否（以转发为主） | 低 | 否 | 低 | 低 |
| `backend/src/routes/answer.routes.ts` | 否（薄路由） | 低 | 否 | 低 | 低 |
| `backend/src/routes/auth.routes.ts` | 低（主要转发） | 低 | 否 | 低 | 低-中 |
| `backend/src/routes/behavior.routes.ts` | 是 | 中-高 | 否 | 高（直接处理 token、限流状态、批量并发） | 高 |
| `backend/src/routes/comment.routes.ts` | 是 | 中 | 是（查问题） | 中 | 中 |
| `backend/src/routes/config.routes.ts` | 低（映射转换） | 低 | 否 | 低 | 低 |
| `backend/src/routes/interaction.routes.ts` | 是（规则校验） | 中 | 否 | 中 | 中 |
| `backend/src/routes/internal.routes.ts` | 是 | 高 | 是（多表读写） | 高（回调鉴权/IP逻辑+状态流转全在路由） | 高 |
| `backend/src/routes/notification.routes.ts` | 是 | 中 | 否 | 中 | 中 |
| `backend/src/routes/parent.routes.ts` | 低-中（鉴权/参数适配） | 低-中 | 否 | 中 | 低-中 |
| `backend/src/routes/profile.routes.ts` | 是 | 中 | 是（answer/question直查） | 中 | 中 |
| `backend/src/routes/question.routes.ts` | 是 | 高 | 是（多处查询+事务） | 高（权限、状态机、计数、组合查询） | 高 |
| `backend/src/routes/upload.routes.ts` | 是 | 中 | 否（但有FS） | 中-高（multer/fs/path 强框架&基础设施耦合） | 中 |
| `backend/src/routes/user-me.routes.ts` | 是 | 中-高 | 是（user直查） | 高（复杂参数规范化与字段白名单） | 中-高 |

补充说明（直接 DB 调用明显文件）：
- `question.routes.ts`
- `internal.routes.ts`
- `profile.routes.ts`
- `user-me.routes.ts`
- `comment.routes.ts`

---

## 三、耦合度评估

### 1) 业务逻辑是否依赖框架对象（`req/res`）

结论：**是，依赖明显**。

- 多处业务判断直接读取 `req.user`、`req.body`、`req.query` 决策；
- 批处理、限流、权限矩阵在路由中完成；
- 这类逻辑天然绑定 Express 上下文，不易独立复用。

### 2) 数据访问是否散落在多个层级

结论：**是，散落明显**。

- Service 层已有 Prisma 访问；
- 但多个 Route 仍直接 `prisma.*`；
- 出现数据访问双入口（Route 与 Service 并存）。

### 3) 是否存在跨层调用（Route 直连 DB + 调 Service）

结论：**存在**。

典型表现：
- `question.routes.ts`：既调 `questionService/answerService/commentService/interactionService`，也直接查/改 Prisma；
- `internal.routes.ts`：核心审核回调流程在 Route 内完成表级写入；
- `profile.routes.ts`、`user-me.routes.ts`：Route 内执行查询聚合。

---

## 四、总体评分

- 分层清晰度评分：**5/10**
- 框架耦合风险：**中-高**
- 未来迁移难度：**中-高**
- 结构失控风险：**中**（若继续在 Route 堆积规则，风险将升至高）

评分依据（简要）：
- 优点：多数核心能力已有 Service 承载；
- 扣分点：Route 层越界（直接 DB + 业务状态流转 + 事务 + 框架强依赖）在关键文件中集中出现。

---

## 五、边界与证据要点（节选）

- Route 事务处理：`question.routes.ts` 存在 `prisma.$transaction`。
- Route 直接 DB：`question/profile/user-me/internal/comment` 均有 `prisma.*`。
- Route 业务规则密集：
  - `question.routes.ts`：权限矩阵、理解状态差量、状态组合查询；
  - `internal.routes.ts`：IP 白名单、内部 token 验证、审核状态决策；
  - `behavior.routes.ts`：内存限流与批量事件处理。

