# 架构设计（Architecture）

## 一、整体架构

- 前端：React + TypeScript 单页应用，通过 Axios 调用后端 REST API。
- 后端：Node.js + Express + TypeScript，采用分层架构（Controller/Service/Repository+Prisma）。
- 数据存储：
  - PostgreSQL：存储用户、白名单、问题、回答、评论、点赞、收藏、日志等结构化数据。
  - Redis：验证码发送频率控制、后续会话与热点数据缓存。
- AI 服务：通过单独的回调接口 `/api/internal/ai-check` 接收外部分析结果并更新问题状态。

## 二、关键后端模块

- `auth` 模块：处理验证码发送、注册、登录、Token 刷新与登出。
- `whitelist` 模块：维护可注册/登录的手机号与角色、课时有效期。
- `questions/answers/comments` 模块：问题、回答与评论的管理与统计。
- `audit` 模块：审核队列、人工审核操作与 AI 审核结果落地。
- `behavior` 模块：用户行为埋点上报接口。
- `notifications` 模块：通知列表、未读数、标记已读。

更详细的模块说明见 `wiki/modules/backend-auth.md`、`backend-questions.md` 等。

