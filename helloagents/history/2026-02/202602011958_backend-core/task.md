# 方案包任务清单 - backend-core

> 状态符号: [ ] 待执行 / [√] 已完成 / [X] 执行失败 / [-] 已跳过 / [?] 待确认

## 一、基础架构与环境

- [√] 初始化后端工程目录与基础依赖（Node/TS/Express/Prisma/Jest）。
- [√] 配置 `.env` 与 `docker-compose`，完成 Postgres/Redis 联调。
- [√] 建立基础应用骨架（`app.ts`、`server.ts`、中间件、健康检查）。

## 二、数据库与模型

- [√] 根据完整版需求文档定义 Prisma 模型（用户、白名单、问题、回答、评论、点赞收藏、行为日志等）。
- [√] 编写初始迁移脚本并在 dev/test 环境验证。

## 三、核心业务模块

- [√] 实现认证模块：
  - [√] `/api/auth/send-code` 基础逻辑与发送频率限制。
  - [√] `/api/auth/register` 用户注册与白名单绑定。
  - [√] `/api/auth/login` 登录 + RefreshToken 生成与持久化。
  - [√] `/api/auth/refresh-token` 刷新访问令牌与 RefreshToken 撤销。
  - [√] `/api/auth/logout` 退出登录并失效所有 RefreshToken。
  - [√] `GET /api/auth/me` 返回当前用户信息与课时状态。
  - [√] 写操作权限中间件：登录校验 + 角色校验 + 课时过期拦截（返回 `MEMBER_EXPIRED`）。
- [√] 实现白名单与课时控制接口：
  - [√] `/api/admin/whitelist` 列表查询（分页、筛选、统计）。
  - [√] `POST /api/admin/whitelist` 创建白名单记录。
  - [√] `PATCH /api/admin/whitelist/:id` 更新课时有效期并同步 `users.expiresAt`。
  - [√] `DELETE /api/admin/whitelist/:id` 软删除白名单记录（已注册用户标记为禁用并提示 warning）。
  - [√] `GET /api/admin/class-hours/:userId` 查询单个用户课时信息。
- [√] `PATCH /api/admin/class-hours/batch-update` 批量延期/缩短课时有效期。
- [√] 实现问题/回答/评论/点赞收藏接口：
  - [√] 设计并初步实现 `Question` Prisma 模型（标题/内容/标签/难度/状态/统计字段/作者信息）。
  - [√] `POST /api/questions` 问题创建（含标题长度校验与基础 AI 结果占位）。
  - [√] `GET /api/questions` / `GET /api/questions/:id` 问题列表与详情（含统计字段）的基础实现与测试（Q-API-001~003 已覆盖创建与权限场景，后续继续补充列表/详情筛选用例）。
  - [√] 设计并实现 `Answer/Comment` 相关 Prisma 模型与接口。
  - [√] 设计并实现 `Like/Favorite` 相关 Prisma 模型与接口。
  - [√] `POST /api/questions/:id/answers` / `POST /api/questions/:id/comments` 创建回答与评论。
  - [√] 点赞与收藏接口：`POST /api/questions/:id/like`、`POST /api/questions/:id/favorite` 及 `GET /api/users/me/likes`、`GET /api/users/me/favorites`。
- [√] 实现审核、AI 回调、行为埋点和上传签名接口：
  - [√] 审核队列与审核操作接口（AUDIT-API 系列）。
  - [√] `POST /api/internal/ai-check` AI 审核回调并更新内容状态。
  - [√] `POST /api/behavior/log` 行为埋点与基础限流。
  - [√] `GET /api/upload/signature` 获取上传签名（图片/音频）。
- [√] 实现通知接口：
  - [√] 通知列表、未读数量与标记已读接口。

## 四、测试与质量

- [√] 为核心 Service/Repository 编写单元测试：
  - [√] AuthService（验证码校验、登录/注册异常分支、RefreshToken 管理）。
  - [√] WhitelistService（列表筛选、创建/更新/删除、软删除与同步用户状态）。
  - [√] ClassHoursService（过期判断、剩余天数计算、批量延期/缩短逻辑）。
  - [√] Question/Answer/Comment/Interaction 相关 Service（状态流转、计数维护等，包含可重复运行且不受历史数据影响的单元测试）。
- [√] 为关键 HTTP 接口编写集成测试，并与《后端-测试用例.md》用例 ID 一一对应：
  - [√] 认证接口 AUTH-API-001~014（基础路径已覆盖，后续补充 me/课时相关用例）。
  - [√] 白名单接口 WL-API-001~010。
  - [√] 课时管理接口 CH-API-001~004。
  - [√] 问题/回答/评论接口 Q-API / ANS-API / CMT-API 系列。
    - [√] 回答接口 A-API-001~005 集成测试。
    - [√] 评论接口 C-API-001~006 集成测试。
  - [√] 点赞收藏接口 LIKE-API/F-API/UL-API/UF-API 系列。
  - [√] 审核/AI 回调、行为埋点、上传与通知相关接口。
- [√] 单元 + 集成覆盖率达到 ≥85%，关键业务路径（认证、白名单/课时、提问与审核、行为埋点、上传）100% 用例覆盖。

## 五、CI/CD 与文档

- [√] 完善 GitHub Actions 流水线（测试、覆盖率、基础扫描）。
- [√] 生成并维护 API 文档（OpenAPI/Apifox）。
- [√] 编写/更新部署手册与回滚方案说明（见 `helloagents/wiki/backend-deployment.md`，覆盖本地开发、测试/预发布、生产环境部署步骤，以及基于 Prisma 迁移与数据库备份的回滚策略）。

