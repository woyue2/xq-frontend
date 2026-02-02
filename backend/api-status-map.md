# API 状态码对照表（后端主要路由）

> 说明：本表仅列出当前项目中对前后端联调影响最大的核心接口及其“成功场景”下的 HTTP 状态码与 JSON `code` 字段约定。错误场景统一通过 `AppError` + `errorMiddleware` 输出，对应的 HTTP 状态码与 `code` 保持一致（例如 400/401/403/404/429/500 等）。

## 1. 认证与用户

| 接口 | 路径 | 成功 HTTP 状态 | 成功 `code` | 说明 |
|------|------|----------------|-------------|------|
| 发送验证码 | `POST /api/auth/send-code` | 200 | 200 | 发送短信验证码 |
| 登录 | `POST /api/auth/login` | 200 | 200 | 登录并返回 token + 用户信息 |
| 注册 | `POST /api/auth/register` | 201 | 201 | 注册成功 |
| 刷新 token | `POST /api/auth/refresh-token` | 200 | 200 | 刷新访问令牌 |
| 退出登录 | `POST /api/auth/logout` | 200 | 200 | 撤销 refresh token |
| 当前用户信息 | `GET /api/auth/me` | 200 | 200 | 返回当前登录用户信息 |
| 我的基础信息 | `GET /api/users/me` | 200 | 200 | 含课时状态等扩展信息 |

## 2. 白名单与课时管理（管理端）

| 接口 | 路径 | 成功 HTTP 状态 | 成功 `code` | 说明 |
|------|------|----------------|-------------|------|
| 查询白名单 | `GET /api/admin/whitelist` | 200 | 200 | 分页列表 |
| 新增白名单 | `POST /api/admin/whitelist` | 201 | 201 | 创建记录 |
| 更新白名单 | `PATCH /api/admin/whitelist/:id` | 200 | 200 | 更新记录 |
| 删除白名单 | `DELETE /api/admin/whitelist/:id` | 200 | 200 | 软删除 |
| 查询课时 | `GET /api/admin/class-hours/:userId` | 200 | 200 | 用户课时详情 |
| 批量更新课时 | `PATCH /api/admin/class-hours/batch-update` | 200 | 200 | 批量延长/减少课时 |

## 3. 问题 / 回答 / 评论

| 接口 | 路径 | 成功 HTTP 状态 | 成功 `code` | 说明 |
|------|------|----------------|-------------|------|
| 创建问题 | `POST /api/questions` | 201 | 201 | 提问，等待审核 |
| 问题列表 | `GET /api/questions` | 200 | 200 | 分页问题列表 |
| 问题详情 | `GET /api/questions/:id` | 200 | 200 | 含当前用户点赞/收藏状态 |
| 问题回答列表 | `GET /api/questions/:questionId/answers` | 200 | 200 | 仅已审核回答 |
| 创建回答 | `POST /api/questions/:questionId/answers` | 201 | 201 | 教师回答，等待审核 |
| 删除回答 | `DELETE /api/answers/:id` | 200 | 200 | 作者/教师删除回答 |
| 问题评论列表 | `GET /api/questions/:questionId/comments` | 200 | 200 | 仅已审核评论 |
| 创建评论（按 questionId） | `POST /api/questions/:questionId/comments` | 201 | 201 | 在问题详情页创建评论 |
| 创建评论（全局入口） | `POST /api/comments` | 201 | 201 | 通过 body 中 questionId 创建评论 |
| 删除评论 | `DELETE /api/comments/:id` | 200 | 200 | 作者/管理员删除评论 |

## 4. 点赞 / 收藏（互动）

| 接口 | 路径 | 成功 HTTP 状态 | 成功 `code` | 说明 |
|------|------|----------------|-------------|------|
| 点赞 / 取消点赞 | `POST /api/interactions/like` | 200 | 200 | `data.liked` + `data.likesCount` |
| 收藏 / 取消收藏 | `POST /api/interactions/favorite` | 200 | 200 | `data.favorited` + `data.favoritesCount` |
| 我的点赞列表 | `GET /api/users/me/likes` | 200 | 200 | 分页，带问题摘要信息 |
| 我的收藏列表 | `GET /api/users/me/favorites` | 200 | 200 | 分页，带问题摘要信息 |

（说明：保留的 `/api/questions/:id/like|favorite` 端点目前主要用于内部测试与兼容，推荐前端统一使用 `/api/interactions/*` 系列接口。）

## 5. 审核与内部回调

| 接口 | 路径 | 成功 HTTP 状态 | 成功 `code` | 说明 |
|------|------|----------------|-------------|------|
| 待审核列表 | `GET /api/admin/audit/pending` | 200 | 200 | 支持 type=question/answer/comment |
| 审核通过 | `POST /api/admin/audit/:contentId/approve` | 200 | 200 | 问题/评论通过 |
| 审核驳回 | `POST /api/admin/audit/:contentId/reject` | 200 | 200 | 仅问题驳回 |
| 封禁评论 | `POST /api/admin/audit/:contentId/ban` | 200 | 200 | 评论封禁 |
| 置顶/取消置顶问题 | `POST /api/admin/audit/questions/:questionId/pin` | 200 | 200 | 置顶状态切换 |
| AI 审核回调 | `POST /api/internal/ai-check` | 200 | 200 | 内部回调用于更新审核结果 |

## 6. 通知

| 接口 | 路径 | 成功 HTTP 状态 | 成功 `code` | 说明 |
|------|------|----------------|-------------|------|
| 通知列表 | `GET /api/notifications` | 200 | 200 | `data.notifications/unreadCount/total` |
| 未读数量 | `GET /api/notifications/unread-count` | 200 | 200 | `data.count` |
| 标记已读 | `POST /api/notifications/read` | 200 | 200 | `data.success` + `data.updatedCount` |

## 7. 行为埋点与上传

| 接口 | 路径 | 成功 HTTP 状态 | 成功 `code` | 说明 |
|------|------|----------------|-------------|------|
| 上报行为日志 | `POST /api/behavior/log` | 200 | 200 | `data.logId` 为日志唯一标识 |
| 获取上传签名 | `GET /api/upload/signature` | 200 | 200 | `data.uploadUrl/key/policy/signature/expireAt` |

## 8. 其他

| 接口 | 路径 | 成功 HTTP 状态 | 成功 `code` | 说明 |
|------|------|----------------|-------------|------|
| 健康检查 | `GET /health` | 200 | — | 不走统一 `ApiResponse`，仅用于本地/监控 |

