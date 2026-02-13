# 后端使用风险证据索引（仅文件+行号）

- 生成时间：2026-02-13
- 说明：仅列证据索引，不含改造建议。

## 1) 路由层直连数据库（Route -> Prisma）

- `backend/src/routes/question.routes.ts:216`
- `backend/src/routes/question.routes.ts:562`
- `backend/src/routes/question.routes.ts:581`
- `backend/src/routes/question.routes.ts:711`
- `backend/src/routes/question.routes.ts:726`
- `backend/src/routes/question.routes.ts:860`
- `backend/src/routes/question.routes.ts:869`
- `backend/src/routes/question.routes.ts:877`
- `backend/src/routes/internal.routes.ts:131`
- `backend/src/routes/internal.routes.ts:138`
- `backend/src/routes/internal.routes.ts:151`
- `backend/src/routes/internal.routes.ts:163`
- `backend/src/routes/internal.routes.ts:171`
- `backend/src/routes/internal.routes.ts:177`
- `backend/src/routes/internal.routes.ts:184`
- `backend/src/routes/internal.routes.ts:290`
- `backend/src/routes/internal.routes.ts:306`
- `backend/src/routes/internal.routes.ts:329`
- `backend/src/routes/profile.routes.ts:58`
- `backend/src/routes/profile.routes.ts:69`
- `backend/src/routes/profile.routes.ts:84`
- `backend/src/routes/user-me.routes.ts:67`
- `backend/src/routes/comment.routes.ts:57`

## 2) 路由层事务与状态差量计算

- `backend/src/routes/question.routes.ts:581`（事务开始）
- `backend/src/routes/question.routes.ts:591`（差量变量）
- `backend/src/routes/question.routes.ts:603`
- `backend/src/routes/question.routes.ts:608`
- `backend/src/routes/question.routes.ts:614`
- `backend/src/routes/question.routes.ts:620`
- `backend/src/routes/question.routes.ts:627`（事务内更新计数）

## 3) 路由层业务规则密集（权限/状态/分支）

- `backend/src/routes/question.routes.ts:554`
- `backend/src/routes/question.routes.ts:570`
- `backend/src/routes/question.routes.ts:719`
- `backend/src/routes/question.routes.ts:724`
- `backend/src/routes/question.routes.ts:729`
- `backend/src/routes/question.routes.ts:853`

- `backend/src/routes/internal.routes.ts:49`（IP 白名单）
- `backend/src/routes/internal.routes.ts:77`（内部 token 校验）
- `backend/src/routes/internal.routes.ts:100`（回调参数校验）
- `backend/src/routes/internal.routes.ts:129`（按 targetType 分支）
- `backend/src/routes/internal.routes.ts:146`（状态决策）
- `backend/src/routes/internal.routes.ts:160`
- `backend/src/routes/internal.routes.ts:168`

- `backend/src/routes/comment.routes.ts:65`
- `backend/src/routes/comment.routes.ts:67`
- `backend/src/routes/comment.routes.ts:77`

- `backend/src/routes/user-me.routes.ts:156`（字段白名单与规则）
- `backend/src/routes/user-me.routes.ts:165`
- `backend/src/routes/user-me.routes.ts:186`
- `backend/src/routes/user-me.routes.ts:215`

## 4) 跨层混用（Route 同时调 Service + 直连 DB）

- `backend/src/routes/question.routes.ts:197`（service） + `backend/src/routes/question.routes.ts:216`（prisma）
- `backend/src/routes/question.routes.ts:747`（service） + `backend/src/routes/question.routes.ts:711`（prisma）
- `backend/src/routes/question.routes.ts:848`（service） + `backend/src/routes/question.routes.ts:860`（prisma）
- `backend/src/routes/user-me.routes.ts:80`（service） + `backend/src/routes/user-me.routes.ts:67`（prisma）

## 5) 点赞收藏双入口（接口路径并存）

- `backend/src/routes/question.routes.ts:447`（`/questions/:questionId/like`）
- `backend/src/routes/question.routes.ts:491`（`/questions/:questionId/favorite`）
- `backend/src/routes/interaction.routes.ts:56`（`/interactions/like`）
- `backend/src/routes/interaction.routes.ts:150`（`/interactions/favorite`）

## 6) 埋点路由内存限流与框架耦合

- `backend/src/routes/behavior.routes.ts:9`（内存 Map）
- `backend/src/routes/behavior.routes.ts:10`
- `backend/src/routes/behavior.routes.ts:11`
- `backend/src/routes/behavior.routes.ts:85`（在 route 解析 token）
- `backend/src/routes/behavior.routes.ts:102`（限流逻辑）
- `backend/src/routes/behavior.routes.ts:108`
- `backend/src/routes/behavior.routes.ts:111`

## 7) 上传路由基础设施耦合（文件系统）

- `backend/src/routes/upload.routes.ts:32`（diskStorage）
- `backend/src/routes/upload.routes.ts:35`
- `backend/src/routes/upload.routes.ts:39`
- `backend/src/routes/upload.routes.ts:56`（multer 配置）
- `backend/src/routes/upload.routes.ts:61`（fileFilter）

