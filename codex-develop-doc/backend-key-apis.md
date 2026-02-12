# 知识星球问答小程序 - 后端关键接口草稿（Codex 工作稿）

> 本文档给出关键接口的「近似最终版」草稿，落地时需与 `后端需求文档-完整版.md` 与 `后端-测试用例.md` 逐项对照确认。

---

## 1. 全局约定

- Base URL：`/api`（如需版本控制，可 `/api/v1`，保持前后端一致）。
- 统一响应格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1706832000000
}
```

- 错误响应：

```json
{
  "code": 403,
  "message": "会员已过期",
  "error": "MEMBER_EXPIRED",
  "timestamp": 1706832000000
}
```

- 通用请求头：
  - `Authorization: Bearer <token>`（需要鉴权时）。
  - `Content-Type: application/json`。
  - `X-Client-Version`, `X-Platform` 等可选头部。

---

## 2. 鉴权与用户

### 2.1 发送验证码 `POST /api/auth/send-code`

- 描述：向指定手机号发送登录验证码。
- 鉴权：无需。
- 请求体：

```json
{
  "phone": "13800138000",
  "type": "login"
}
```

- 响应示例（200）：

```json
{
  "code": 200,
  "message": "验证码已发送",
  "data": {
    "phone": "13800138000",
    "expireIn": 300,
    "cooldown": 60
  },
  "timestamp": 1706832000000
}
```

- 典型错误：
  - `400/VALIDATION_ERROR`：手机号格式非法。
  - `429/RATE_LIMITED`：单 IP 或单手机号请求过于频繁。

### 2.2 登录 `POST /api/auth/login`

- 描述：使用手机号 + 验证码完成登录，签发 JWT。
- 请求体：

```json
{
  "phone": "13800138000",
  "code": "123456"
}
```

- 响应示例（200）：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "phone": "13800138000",
      "nickname": "张三",
      "avatar": "https://...",
      "role": "student",
      "expiresAt": "2026-03-01T00:00:00.000Z",
      "permissions": ["question:create", "question:like", "question:favorite"]
    }
  },
  "timestamp": 1706832000000
}
```

- 典型错误：
  - `400/VALIDATION_ERROR`：参数缺失或验证码格式不合法。
  - `403/WHITELIST_REQUIRED`：手机号不在白名单。
  - `401/INVALID_CODE`：验证码错误或过期。

### 2.3 获取当前用户 `GET /api/auth/me`

- 描述：基于 JWT 获取当前用户信息。
- 鉴权：需要。
- 响应示例（200）：同登录接口中 `data.user`。

---

## 3. 白名单与课时

### 3.1 获取白名单列表 `GET /api/admin/whitelist`

- 鉴权：管理员。
- 查询参数：
  - `page`, `limit`
  - `phone`（可选）
  - `role`（可选）

- 响应示例（200）：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "wl_1",
        "phone": "13800138000",
        "name": "张三",
        "role": "student",
        "grade": "初一",
        "expiresAt": "2026-03-01T00:00:00.000Z",
        "isRegistered": true,
        "userId": "user_123"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  },
  "timestamp": 1706832000000
}
```

### 3.2 新增白名单 `POST /api/admin/whitelist`

- 请求体：

```json
{
  "phone": "13800138000",
  "name": "张三",
  "role": "student",
  "grade": "初一",
  "expiresAt": "2026-03-01T00:00:00.000Z"
}
```

- 响应：返回新增记录。

### 3.3 更新白名单记录 `PATCH /api/admin/whitelist/:id`

- 用于修改有效期、角色、年级等。

### 3.4 删除白名单记录 `DELETE /api/admin/whitelist/:id`

- 软删除或逻辑禁用，避免误删。

---

## 4. 问题 / 回答 / 评论

### 4.1 获取问题列表 `GET /api/questions`

- 查询参数：
  - `page`, `limit`
  - `subject`（可选）
  - `status`（可选：approved/pending 等）
  - `keyword`（可选：标题/内容关键词）

- 响应示例（200）：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "q_1",
        "title": "函数图像相关问题",
        "content": "已知函数 y=...",
        "subject": "math",
        "topics": ["二次函数", "抛物线"],
        "methods": ["配方法"],
        "author": {
          "id": "user_123",
          "nickname": "张三"
        },
        "status": "approved",
        "isGoodQuestion": true,
        "likesCount": 10,
        "favoritesCount": 5,
        "commentsCount": 3,
        "answersCount": 2,
        "createdAt": "2026-02-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  },
  "timestamp": 1706832000000
}
```

### 4.2 获取问题详情 `GET /api/questions/:id`

- 响应包含问题详情、图片/音频列表以及统计信息。

### 4.3 创建问题 `POST /api/questions`

- 鉴权：学生（有效期内）或教师。
- 请求体示例：

```json
{
  "title": "函数图像相关问题",
  "content": "题目原文描述...",
  "subject": "math",
  "topics": ["二次函数", "抛物线"],
  "methods": ["配方法"],
  "images": ["https://..."],
  "audios": [
    {
      "url": "https://...",
      "duration": 30
    }
  ]
}
```

- 响应示例（200）：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "q_1",
    "status": "pending"
  },
  "timestamp": 1706832000000
}
```

- 业务逻辑：
  - 创建问题记录与附属图片/音频记录。
  - 异步推送 AI 审核任务（不要阻塞 HTTP 响应）。

### 4.4 回答与评论接口（示例）

- `POST /api/questions/:id/answers`
  - 请求体：`{ "content": "详细解答...", "images": [...], "audios": [...] }`
- `GET /api/questions/:id/answers`
- `POST /api/questions/:id/comments`
- `GET /api/questions/:id/comments`

---

## 5. 点赞与收藏

> 说明：最终实现采用「单一 POST + action 字段」的方式在同一路由上切换点赞/取消点赞、收藏/取消收藏，DELETE 路由不再实现。  
> 此处文档已按实际实现更新。

### 5.1 点赞 / 取消点赞 `POST /api/interactions/like`

- 描述：为问题点赞或取消点赞（同一路由，通过 `action` 字段区分）。  
- 请求体：

```json
{
  "targetType": "question",
  "targetId": "q_1",
  "action": "like"
}
```

- 其中：
  - `targetType`: 当前仅支持 `"question"`；
  - `targetId`: 问题 ID；
  - `action`: `"like"` 点赞、`"unlike"` 取消点赞。

- 响应示例（点赞成功）：

```json
{
  "code": 200,
  "message": "点赞成功",
  "data": {
    "liked": true,
    "likesCount": 11
  },
  "timestamp": 1706832000000
}
```

- 响应示例（取消点赞）：

```json
{
  "code": 200,
  "message": "取消点赞",
  "data": {
    "liked": false,
    "likesCount": 10
  },
  "timestamp": 1706832000000
}
```

- 兼容资源路由（问题详情页场景）：
  - `POST /api/questions/:questionId/like`  
  - 说明：不带请求体，后端根据当前用户是否已点赞自动切换「点赞 / 取消点赞」，语义与 `/api/interactions/like` 等价。

### 5.2 收藏 / 取消收藏 `POST /api/interactions/favorite`

- 描述：为问题收藏或取消收藏（同一路由，通过 `action` 区分）。  
- 请求体：

```json
{
  "questionId": "q_1",
  "action": "favorite"
}
```

- 其中：
  - `questionId`: 问题 ID；
  - `action`: `"favorite"` 收藏、`"unfavorite"` 取消收藏。

- 响应示例（收藏成功）：

```json
{
  "code": 200,
  "message": "收藏成功",
  "data": {
    "favorited": true,
    "favoritesCount": 13
  },
  "timestamp": 1706832000000
}
```

- 响应示例（取消收藏）：

```json
{
  "code": 200,
  "message": "取消收藏",
  "data": {
    "favorited": false,
    "favoritesCount": 12
  },
  "timestamp": 1706832000000
}
```

- 兼容资源路由（问题详情页场景）：
  - `POST /api/questions/:questionId/favorite`  
  - 说明：不带请求体，后端根据当前用户是否已收藏自动切换「收藏 / 取消收藏」，语义与 `/api/interactions/favorite` 等价。

### 5.3 我的点赞 / 收藏列表

- 点赞列表：`GET /api/users/me/likes`
  - 查询参数：`page`, `pageSize`；
  - 返回当前登录用户点赞过的问题列表，包含分页信息。

- 收藏列表：`GET /api/users/me/favorites`
  - 查询参数：`page`, `pageSize`；
  - 返回当前登录用户收藏的问题列表，包含分页信息。

---

## 6. 审核与 AI 回调

### 6.1 审核队列 `GET /api/admin/audit/pending`

- 描述：获取待审核内容列表。  
- 查询参数：
  - `page`：页码，默认 1；
  - `pageSize`：每页数量，默认 20，最大 100；
  - `type`：`"question"` | `"answer"` | `"comment"`。

### 6.2 审核操作

- `POST /api/admin/audit/:contentId/approve`  
  - 用于审核通过问题或评论，后端根据 `type` 字段区分：
    - `type="question"`：调用问题审核通过逻辑；
    - `type="comment"`：调用评论审核通过逻辑。
- `POST /api/admin/audit/:contentId/reject`  
  - 目前仅支持问题驳回，`type` 必须为 `"question"`。
- `POST /api/admin/audit/:contentId/ban`  
  - 用于封禁评论，`type` 必须为 `"comment"`。

### 6.3 AI 回调 `POST /api/internal/ai-check`

- 描述：AI 服务/队列调用的内部接口，用于更新问题/回答/评论的 `ai_result` 与状态。
- 鉴权：仅内部服务可用，建议在生产环境配置 `AI_INTERNAL_TOKEN` 并通过请求头 `X-Internal-Token` 进行校验。
- 请求体（示例）：

```json
{
  "targetType": "question",
  "targetId": "q_1",
  "result": {
    "safe": true,
    "score": 0.98,
    "labels": ["math", "study"]
  }
}
```

- 逻辑：
  - 更新对应记录的 `ai_result` 字段（结构化 JSON）。
  - `safe=true` → `status=approved`。
  - `safe=false` → `status=rejected`，必要时写入 `reject_reason`。
  - 当鉴权失败（缺少或错误的 `X-Internal-Token`，且已配置 `AI_INTERNAL_TOKEN`）时返回 `403`，错误码 `INTERNAL_ACCESS_DENIED`。

---

## 7. 行为埋点

### 7.1 上报行为 `POST /api/behavior/log`

- 请求体：

```json
{
  "type": "click_good_question",
  "timestamp": 1706832000000,
  "metadata": {
    "sourcePage": "/question/123",
    "questionId": "q_1"
  }
}
```

- 响应示例：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "logId": "log_abc123"
  },
  "timestamp": 1706832000100
}
```

---

## 8. 文件上传签名

### 8.1 获取上传签名 `GET /api/upload/signature`

- 查询参数：
  - `type`：`"image"` | `"audio"`。

- 响应示例：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "uploadUrl": "https://oss-bucket.oss-cn-xxx.aliyuncs.com/",
    "key": "questions/q_1/img_123.png",
    "policy": "base64-encoded-policy",
    "signature": "signature",
    "expireAt": 1706832300000
  },
  "timestamp": 1706832000000
}
```

---

## 9. 通知接口

> 具体字段以需求文档为准，这里提供一个可实现的草稿。

### 9.1 获取通知列表 `GET /api/notifications`

- 查询参数：`page`, `limit`, `unread`（可选）。

### 9.2 获取未读数量 `GET /api/notifications/unread-count`

- 响应示例：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "unreadCount": 5
  },
  "timestamp": 1706832000000
}
```

### 9.3 标记已读 `POST /api/notifications/read`

- 请求体：

```json
{
  "ids": ["n_1", "n_2"]
}
```

---

## 10. 错误码分组建议（摘录）

> 详细表格建议在 `后端需求文档-完整版.md` 中维护，这里仅给出分组草稿。

- 认证与鉴权
  - `UNAUTHORIZED`（401）：未登录或 Token 无效。
  - `FORBIDDEN`（403）：无权限访问资源。
  - `MEMBER_EXPIRED`（403）：会员课时已过期。
  - `WHITELIST_REQUIRED`（403）：手机号不在白名单。

- 参数与资源
  - `VALIDATION_ERROR`（400）：参数校验失败。
  - `RESOURCE_NOT_FOUND`（404）：资源不存在。

- 业务
  - `QUESTION_STATUS_INVALID`（400/409）：问题状态不允许当前操作。
  - `ANSWER_STATUS_INVALID`（400/409）：回答状态不允许当前操作。

- 系统与安全
  - `RATE_LIMITED`（429）：请求过于频繁。
  - `INTERNAL_SERVER_ERROR`（500）：未预期错误。

---

> 实际实现时，需将本文件与：
> - `后端需求文档-完整版.md`
> - `后端-测试用例.md`
> 做逐行对照，确保路径、字段、错误码与测试用例完全一致。
