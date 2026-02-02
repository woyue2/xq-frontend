# API 手册 & OpenAPI 说明

> 详细接口规范以 `codex-develop-doc/backend-key-apis.md`、
> 《后端需求文档-完整版.md》以及最新实现代码为准，本文件作为网关级概览，
> 并记录 OpenAPI / Apifox 的维护方式。

## 一、OpenAPI 规范文件

- 位置：`backend/openapi.yaml`
- 版本：OpenAPI 3.1.0
- 当前已覆盖模块（摘要）：
  - 认证：`POST /api/auth/send-code`、`POST /api/auth/login`
  - 审核（Admin Audit）：
    - `GET /api/admin/audit/pending`
    - `POST /api/admin/audit/{contentId}/approve`
    - `POST /api/admin/audit/{contentId}/reject`
    - `POST /api/admin/audit/{contentId}/ban`
    - `POST /api/admin/audit/questions/{questionId}/pin`
  - 通知：`GET /api/notifications`、`GET /api/notifications/unread-count`、`POST /api/notifications/read`
  - 行为埋点：`POST /api/behavior/log`
  - 上传签名：`GET /api/upload/signature`

> 后续新增/修改路由时，必须同步更新 `backend/openapi.yaml`，并在对应 MR 中明确注明。

## 二、Apifox 使用说明

1. 在 Apifox 中创建/打开项目。
2. 选择「导入」→「OpenAPI (Swagger)」。
3. 导入方式：
   - 本地文件导入：选择 `backend/openapi.yaml`。
   - 或配置 Git 仓库同步（推荐在 CI 中增加导出工步后再接入）。
4. 每次后端合并变更后：
   - 先运行 `npm test` 确认用例通过。
   - 如有 API 变更，更新 `backend/openapi.yaml` 并重新导入 Apifox。

## 三、模块级 API 概览（快速索引）

### 1. 认证与用户（/api/auth, /api/users/me）

- `POST /api/auth/send-code`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/logout`
- `GET /api/users/me`

### 2. 白名单与课时（/api/admin/whitelist, /api/admin/class-hours）

- `GET /api/admin/whitelist` / `POST /api/admin/whitelist`
- `PATCH /api/admin/whitelist/:id` / `DELETE /api/admin/whitelist/:id`
- `GET /api/admin/class-hours/:userId`
- `PATCH /api/admin/class-hours/batch-update`

### 3. 问题 / 回答 / 评论

- `POST /api/questions`、`GET /api/questions`、`GET /api/questions/:id`
- `POST /api/questions/:questionId/answers`、`GET /api/questions/:questionId/answers`
- `POST /api/questions/:questionId/comments`、`GET /api/questions/:questionId/comments`

### 4. 点赞收藏与我的列表

- `POST /api/questions/:questionId/like`
- `POST /api/questions/:questionId/favorite`
- `GET /api/users/me/likes`
- `GET /api/users/me/favorites`

### 5. 审核与 AI 回调

- `GET /api/admin/audit/pending`
- `POST /api/admin/audit/:contentId/approve`
- `POST /api/admin/audit/:contentId/reject`
- `POST /api/admin/audit/:contentId/ban`
- `POST /api/admin/audit/questions/:questionId/pin`
- `POST /api/internal/ai-check`

### 6. 行为埋点、通知与上传

- `POST /api/behavior/log`
- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/read`
- `GET /api/upload/signature`

> 更细粒度的字段、错误码与边界条件，请参考 OpenAPI 文件、集成测试
> (`backend/src/tests/integration/*.api.spec.ts`) 以及需求文档。
