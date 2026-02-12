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
 - `POST /api/auth/password-login`
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

## 四、语义等价类分类规则

> 仅针对“实现与文档不完全同名，但效果一致”的差异进行归类；路径缺失、状态码错误、必填字段缺失等硬错误由 `helloagents/plan/202602022130_route-hard-errors/` 方案负责。

### 1. 分类定义

- **A 类（命名/文案差异）**  
  HTTP 状态码与业务含义正确，只是字段名或 message 文案不同，例如文档示例为 `data.logId` + `"success"`，实现为 `data.id` + `"Logged successfully"`，前端只关心“是否成功 + 日志标识”即可。

- **B 类（返回体扩展字段）**  
  在文档约定的基础上增加了字段，不会破坏旧调用方，例如在发送验证码/登录/注册中额外返回 `expireIn/cooldown/refreshToken` 或更丰富的用户字段，这些字段是扩展能力而非合同刚性字段。

- **C 类（扩展接口/参数）**  
  新增接口或参数，但对已有合同完全兼容，例如在原有 `send-code/login` 之外新增 `/api/auth/register`、`/api/auth/refresh-token`、`/api/auth/logout`，以及 `/api/users/me/likes`、`/api/users/me/favorites` 等接口。

- **D 类（硬错误负例）**  
  满足任一条件即为硬错误：文档声明存在的路由在实现中完全不存在、HTTP 状态码与语义明显不符、缺失必填字段、路径/HTTP 方法严重不匹配等。这类问题不属于语义等价类，由硬错误方案包处理。

### 2. 典型接口清单（语义等价 / 扩展能力）

| 接口 | 模块 | 类别 | 说明 |
|------|------|------|------|
| `POST /api/auth/register` | 认证 | C | 文档早期版本未显式列出，实际实现已稳定并由测试覆盖，视为对登录体系的扩展能力。 |
| `POST /api/auth/refresh-token` | 认证 | C | 使用 RefreshToken 刷新访问令牌与 RefreshToken 本身，文档/前端清单需同步补充说明。 |
| `POST /api/auth/logout` | 认证 | C | 登出接口在实现与测试中已存在，早期需求文档仅简要提及，属于扩展能力。 |
| `GET /api/users/me/likes` / `GET /api/users/me/favorites` | 用户互动 | C | “我的点赞/收藏列表”接口在实现与测试中稳定存在，用于配合问题点赞/收藏路由，需在产品/API 文档中显式暴露。 |
| `POST /api/behavior/log` | 行为埋点 | A/B | 文档示例与实现的字段命名/文案略有差异，但 HTTP 状态码与“埋点成功写入”语义一致，且实现额外返回 `success/receivedAt` 等辅助字段。 |

> 当在路由对照或 API 评审中发现差异时，可先按上述规则判断是否属于 A/B/C 类语义等价；如触及 D 类条件，则应归入“硬错误路由”并参考 `202602022130_route-hard-errors` 方案进行处理。
