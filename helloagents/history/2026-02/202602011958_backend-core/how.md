# 知识星球问答小程序 - 后端整体架构方案（HOW）

> 方案包: backend-core  
> 版本: v1.0  
> 日期: 2026-02-01

## 一、技术方案

- **运行时与语言**: Node.js 20 + TypeScript，ESM 模块。
- **Web 框架**: Express.js，按 `BACKEND-CODING_STANDARDS.md` 分层。
- **数据库**: PostgreSQL（通过 Prisma 访问）。
- **缓存与限流**: Redis 7，用于验证码、限流、可能的队列。
- **验证与安全**: Zod 请求参数校验、JWT 认证中间件、基础限流与安全头。
- **测试**: Jest + Supertest，整体覆盖率不低于 85%。
- **CI/CD**: GitHub Actions 工作流，拉起 Postgres/Redis 服务执行测试。

## 二、模块划分

- 鉴权与认证：auth（验证码发送、登录、`/auth/me`）。
- 白名单与课时：whitelist/lesson 模块，负责注册控制与有效期判断。
- 问题/回答/评论：questions/answers/comments 相关接口与业务逻辑。
- 点赞收藏：interactions 模块（like/favorite）。
- 审核与 AI 回调：audit/internal 接口。
- 行为埋点：behavior 模块。
- 上传签名与通知：upload/notifications 模块。

## 三、数据模型与迁移

- 在 Prisma 模型中描述 users、user_whitelist、questions、answers、comments、likes、favorites、behavior_logs 等表。
- 使用 `prisma migrate dev` 管理迁移，dev/test/prod 环境分离。

## 四、安全与性能

- 实现基础 rate limit 与 IP/手机号双重限流，防止暴力破解。
- 针对高频查询（问题列表、搜索）添加必要索引。
- 通过简单缓存机制缓解热点查询压力。

## 五、演进与兼容

- 按模块拆分实现，确保可以逐步接入其他前端或第三方系统。
- 所有对外 API 使用版本化前缀（如 `/api` 或 `/api/v1`），为未来升级预留空间。

