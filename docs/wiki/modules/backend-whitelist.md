# 模块文档：白名单与课时（backend-whitelist）

## 一、模块职责

- 管理允许注册/登录的手机号及其角色、年级与课时有效期。
- 为认证模块提供白名单校验与课时过期判断依据。

## 二、关键概念

- 白名单（UserWhitelist）：记录手机号、角色、年级与有效期。
- 课时有效期（expiresAt）：后端是唯一真理来源，用于拦截写操作请求。

## 三、接口规划摘要

- `GET /api/admin/whitelist`：分页查询白名单，支持按角色、注册状态、姓名/手机号搜索，并返回统计信息。
- `POST /api/admin/whitelist`：新增白名单记录，记录手机号、姓名、角色、有效期与备注。
- `PATCH /api/admin/whitelist/:id`：更新白名单记录（当前主要为课时有效期），若用户已注册则同步更新 `users.expiresAt`。
- `DELETE /api/admin/whitelist/:id`：软删除白名单记录；如已注册用户存在，则标记用户为禁用并返回 warning 提示。
- `GET /api/admin/class-hours/:userId`：查询指定用户的课时信息（包含 `isExpired` / `remainingDays` / `status` 等字段）。
- `PATCH /api/admin/class-hours/batch-update`：按用户 ID 列表批量延期或缩短课时有效期，并返回每个用户的处理结果与成功/失败统计。
