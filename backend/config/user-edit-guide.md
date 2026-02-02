# 后端常用修改点速查（给自己的简版）

> 只列出你日常可能需要改的“入口”，底层 Prisma/数据库设计等细节可以忽略。

## 1. 环境变量（backend/.env）

这些是最常改的：

- `PORT`：后端服务监听端口（默认 3000）。  
- `DATABASE_URL`：PostgreSQL 数据库连接字符串。  
- `REDIS_URL`：Redis 连接地址。  
- `JWT_SECRET`：JWT 密钥，字符串越长越安全。  
- `JWT_EXPIRES_IN`：登录有效期，例如 `7d`。  
- `AI_AUDIT_BASE_URL`：可选，外部 AI 审核服务地址，留空则关闭外部调用。  
- `AI_AUDIT_PROVIDER_NAME`：可选，标记当前使用的审核服务名称。  
- `AI_INTERNAL_TOKEN`：可选，配置后 AI 回调接口会校验 `X-Internal-Token`。  
- `AUDIO_BASE_DIR`：本地音频文件真实存放目录，例如：  
  - 开发环境：`static/audio`（相对路径，会映射为 `/static/audio/*`）  
  - 生产环境：`/data/audio`

> 加载逻辑在 `src/config/env.ts`，如需切换不同环境文件，可通过 `BACKEND_ENV_PATH` 指定 `.env` 路径。

## 2. 媒体与静态资源相关

- 本地录音访问 URL：  
  - 设置 `AUDIO_BASE_DIR` 后，`src/app.ts` 会做映射：  
    - `app.use('/static/audio', express.static(AUDIO_BASE_DIR 解析后的目录));`  
  - 数据库/接口里只存 `audioUrl: '/static/audio/xxx.m4a'`，前端直接拿这个 URL 播放。  
- 上传签名策略：  
  - 文件位置：`src/routes/upload.routes.ts`  
  - 如果需要调整上传类型、权限（例如谁可以拿到音频上传签名），改这里的逻辑即可。

## 3. AI 审核与回调

- AI 审核配置集中在：`src/config/ai-audit.ts`  
  - 一般只需要通过 `.env` 配 `AI_AUDIT_BASE_URL` / `AI_AUDIT_PROVIDER_NAME` 即可。  
- AI 审核回调接口：`POST /api/internal/ai-check`  
  - 路由文件：`src/routes/internal.routes.ts`  
  - 如果需要修改 AI 回调结果如何影响题目/回答/评论状态，可以在这里调整。  
  - 如开启 `AI_INTERNAL_TOKEN`，记得在外部审核服务调用时带上正确的 Header。

## 4. 核心业务接口常用修改入口

> 当你想改“接口行为/返回字段/权限限制”等，一般改下面这些文件：

- 问题相关：  
  - Service：`src/services/question.service.ts`（列表、详情、创建校验规则等）。  
  - 路由：`src/routes/question.routes.ts`（URL、请求参数、权限控制）。  
- 回答相关：  
  - Service：`src/services/answer.service.ts`。  
  - 路由：`src/routes/question.routes.ts` 中 `/questions/:questionId/answers` 相关部分。  
- 评论相关：  
  - Service：`src/services/comment.service.ts`。  
  - 路由：`src/routes/question.routes.ts` 中评论相关部分。  
- 审核相关（人工审核后台）：  
  - Service：`src/services/audit.service.ts`。  
  - 路由：`src/routes/admin-audit.routes.ts`。  
- 行为埋点：  
  - Service：`src/services/behavior-log.service.ts`。  
  - 路由：`src/routes/behavior.routes.ts`（`POST /api/behavior/log`）。  

## 5. 登录与权限相关

- 登录/注册、短信验证码逻辑：`src/routes/auth.routes.ts` + `src/services/auth.service.ts`。  
- 会员有效期/课时校验：  
  - 中间件：`src/middlewares/membership.middleware.ts`。  
  - 白名单管理：`src/routes/admin-whitelist.routes.ts`。  
- 用户信息接口：`src/routes/user-me.routes.ts`。

> 一般来说：**改业务 = 改对应的 Service + 路由；改运行环境/依赖 = 改 `.env` 和 `deploy/*`。**

