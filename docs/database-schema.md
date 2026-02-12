# 数据库表结构文档

> 生成时间: 2025-02-12
> 数据来源: `backend/prisma/schema.prisma`
> 数据库类型: PostgreSQL

---

## 📊 数据库表结构总览

本项目数据库共包含 **17 个表**，涵盖用户管理、问题问答、审核系统、通知系统、行为追踪等核心业务模块。

---

### 1. User (用户表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| phone | String | @unique | 手机号 |
| name | String? | 可选 | 真实姓名 |
| nickname | String | 必填 | 昵称 |
| avatar | String? | 可选 | 头像 |
| role | String | 必填 | 角色 |
| passwordHash | String? | 可选 | 密码哈希 |
| grade | String? | 可选 | 年级 |
| age | Int? | 可选 | 年龄 |
| school | String? | 可选 | 学校 |
| expiresAt | DateTime? | 可选 | 过期时间 |
| createdAt | DateTime | @default(now()) | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |
| isActive | Boolean | @default(true) | 是否激活 |
| isBanned | Boolean | @default(false) | 是否封禁 |

**关联关系:**
- 一对一: `whitelist` → UserWhitelist
- 一对多: `loginLogs` → LoginLog[]
- 多对多: `children`/`parents` → ParentChild[]

**索引:** `[phone]`, `[role]`

---

### 2. VerificationCode (短信验证码记录表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| phone | String | 必填 | 手机号 |
| code | String | 必填 | 验证码 |
| type | String | 必填 | 类型: login \| register |
| expireAt | DateTime | 必填 | 过期时间 |
| used | Boolean | @default(false) | 是否已使用 |
| errorCount | Int | @default(0) | 错误次数 |
| lockedUntil | DateTime? | 可选 | 锁定时间 |
| createdAt | DateTime | @default(now()) | 创建时间 |
| usedAt | DateTime? | 可选 | 使用时间 |

**索引:** `[phone, type]`

---

### 3. UserWhitelist (白名单表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| phone | String | @unique | 手机号 |
| name | String | 必填 | 姓名 |
| role | String | 必填 | 角色 |
| grade | String? | 可选 | 年级 |
| validUntil | DateTime? | 可选 | 有效期至 |
| notes | String? | 可选 | 备注 |
| isRegistered | Boolean | @default(false) | 是否已注册 |
| userId | String? | @unique | 关联用户ID |
| createdAt | DateTime | @default(now()) | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |
| registeredAt | DateTime? | 可选 | 注册时间 |
| deletedAt | DateTime? | 可选 | 删除时间 |
| deletedBy | String? | 可选 | 删除人 |

**关联关系:** `user` → User?

**索引:** `[role]`, `[isRegistered]`

---

### 4. RefreshToken (刷新令牌表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| userId | String | 必填 | 用户ID |
| token | String | @unique | 令牌 |
| expiresAt | DateTime | 必填 | 过期时间 |
| revoked | Boolean | @default(false) | 是否撤销 |
| createdAt | DateTime | @default(now()) | 创建时间 |

**索引:** `[userId]`

---

### 5. LoginLog (登录日志表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| userId | String | 必填 | 用户ID |
| ip | String? | 可选 | IP地址 |
| userAgent | String? | 可选 | 用户代理 |
| success | Boolean | 必填 | 是否成功 |
| createdAt | DateTime | @default(now()) | 创建时间 |

**关联关系:** `user` → User

**索引:** `[userId, createdAt]`

---

### 6. Question (问题表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| title | String | 必填 | 标题 |
| content | String? | 可选 | 内容 |
| subject | String? | 可选 | 学科 |
| tags | String[] | 数组 | 标签 |
| images | String[] | 数组 | 图片URL |
| difficulty | String? | 可选 | 难度 |
| status | String | @default("pending") | 状态 |
| isGoodQuestion | Boolean | @default(false) | 是否优质问题 |
| isPinned | Boolean | @default(false) | 是否置顶 |
| score | Int? | 可选 | 分数 |
| aiResult | String? | 可选 | AI审核结果 |
| likes | Int | @default(0) | 点赞数 |
| favorites | Int | @default(0) | 收藏数 |
| comments | Int | @default(0) | 评论数 |
| answers | Int | @default(0) | 回答数 |
| understoodCount | Int | @default(0) | 已理解数 |
| notUnderstoodCount | Int | @default(0) | 不理解数 |
| authorId | String | 必填 | 作者ID |
| authorName | String | 必填 | 作者名 |
| authorAvatar | String? | 可选 | 作者头像 |
| createdAt | DateTime | @default(now()) | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |

**关联关系:**
- `commentList` → Comment[]
- `answerList` → Answer[]
- `understandingList` → QuestionUnderstanding[]

**索引:** `[status, createdAt]`, `[isGoodQuestion]`

---

### 7. Answer (回答表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| questionId | String | 必填 | 问题ID |
| content | String | 必填 | 内容 |
| images | String[] | 数组 | 图片URL |
| audioUrl | String? | 可选 | 音频URL |
| authorId | String | 必填 | 作者ID |
| authorName | String | 必填 | 作者名 |
| authorAvatar | String? | 可选 | 作者头像 |
| likes | Int | @default(0) | 点赞数 |
| status | String | @default("pending") | 状态 |
| aiResult | String? | 可选 | AI审核结果 |
| createdAt | DateTime | @default(now()) | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |
| deletedAt | DateTime? | 可选 | 删除时间 |

**关联关系:** `question` → Question (级联删除)

**索引:** `[questionId, status, createdAt]`

---

### 8. Comment (评论表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| questionId | String | 必填 | 问题ID |
| content | String | 必填 | 内容 |
| image | String? | 可选 | 图片URL |
| authorId | String | 必填 | 作者ID |
| authorName | String | 必填 | 作者名 |
| authorAvatar | String? | 可选 | 作者头像 |
| status | String | @default("pending") | 状态 |
| aiResult | String? | 可选 | AI审核结果 |
| createdAt | DateTime | @default(now()) | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |
| deletedAt | DateTime? | 可选 | 删除时间 |

**关联关系:** `question` → Question (级联删除)

**索引:** `[questionId, status, createdAt]`

---

### 9. Like (点赞表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| userId | String | 必填 | 用户ID |
| targetType | String | 必填 | 目标类型: 'question' \| 'answer' |
| targetId | String | 必填 | 目标ID |
| createdAt | DateTime | @default(now()) | 创建时间 |

**复合唯一约束:** `[userId, targetType, targetId]`

**索引:** `[userId]`, `[targetType, targetId]`

---

### 10. Favorite (收藏表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| userId | String | 必填 | 用户ID |
| questionId | String | 必填 | 问题ID |
| createdAt | DateTime | @default(now()) | 创建时间 |

**复合唯一约束:** `[userId, questionId]`

**索引:** `[userId]`, `[questionId]`

---

### 11. Notification (通知表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| userId | String | 必填 | 用户ID |
| type | String | 必填 | 类型: 'answer' \| 'comment' \| 'audit_result' \| 'system' \| 'new_answer' |
| title | String | 必填 | 标题 |
| content | String? | 可选 | 内容 |
| targetType | String? | 可选 | 目标类型 |
| targetId | String? | 可选 | 目标ID |
| isRead | Boolean | @default(false) | 是否已读 |
| readAt | DateTime? | 可选 | 已读时间 |
| createdAt | DateTime | @default(now()) | 创建时间 |

**索引:** `[userId]`, `[isRead]`

---

### 12. BehaviorLog (行为日志表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| userId | String? | 可选 | 用户ID |
| sessionId | String? | 可选 | 会话ID |
| eventType | String | 必填 | 事件类型 |
| metadata | Json? | 可选 | 元数据(JSON) |
| path | String? | 可选 | 路径 |
| referrer | String? | 可选 | 来源页面 |
| userAgent | String? | 可选 | 用户代理 |
| ipAddress | String? | 可选 | IP地址 |
| clientTime | DateTime? | 可选 | 客户端时间 |
| createdAt | DateTime | @default(now()) | 创建时间 |

**索引:** `[userId]`, `[eventType]`, `[createdAt]`

---

### 13. AuditLog (审核日志表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| auditorId | String | 必填 | 审核人ID |
| targetType | String | 必填 | 目标类型: 'question' \| 'answer' \| 'comment' |
| targetId | String | 必填 | 目标ID |
| action | String | 必填 | 操作: 'approve' \| 'reject' \| 'ban' |
| reason | String? | 可选 | 原因 |
| createdAt | DateTime | @default(now()) | 创建时间 |

**索引:** `[auditorId]`, `[targetType, targetId]`

---

### 14. QuestionDimension (题目维度定义表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| key | String | @unique | 维度键 |
| name | String | 必填 | 维度名称 |
| enabled | Boolean | @default(true) | 是否启用 |
| multiSelect | Boolean | @default(false) | 是否多选 |
| description | String? | 可选 | 描述 |
| order | Int | @default(0) | 排序 |
| createdAt | DateTime | @default(now()) | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |

**关联关系:** `options` → QuestionDimensionOption[]

---

### 15. QuestionDimensionOption (题目维度选项表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| dimensionKey | String | 必填 | 维度键 |
| value | String | 必填 | 值 |
| label | String | 必填 | 标签 |
| order | Int | @default(0) | 排序 |
| enabled | Boolean | @default(true) | 是否启用 |
| createdAt | DateTime | @default(now()) | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |

**关联关系:** `dimension` → QuestionDimension (级联删除)

**索引:** `[dimensionKey]`, `[value]`

---

### 16. ParentChild (家长-孩子绑定关系表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| parentId | String | 必填 | 家长ID |
| childId | String | 必填 | 孩子ID |
| createdAt | DateTime | @default(now()) | 创建时间 |

**关联关系:**
- `parent` → User (ParentToChildren)
- `child` → User (ChildToParents)

**复合唯一约束:** `[parentId, childId]`

**索引:** `[parentId]`, `[childId]`

---

### 17. QuestionUnderstanding (题目理解状态表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | String | @id @default(cuid()) | 主键 |
| questionId | String | 必填 | 问题ID |
| userId | String | 必填 | 用户ID |
| status | String | 必填 | 状态: 'understood' \| 'not_understood' |
| createdAt | DateTime | @default(now()) | 创建时间 |
| updatedAt | DateTime | @updatedAt | 更新时间 |

**关联关系:** `question` → Question (级联删除)

**复合唯一约束:** `[questionId, userId]`

**索引:** `[userId]`

---

## 🔑 关键特性总结

- **数据库类型:** PostgreSQL
- **总表数:** 17
- **核心业务模块:** 用户管理、问题问答、审核系统、通知系统、行为追踪
- **关系类型:** 一对一、一对多、多对多
- **软删除支持:** Answer, Comment, QuestionUnderstanding 等表包含 `deletedAt` 字段
- **审计字段:** 大部分表包含 `createdAt` 和 `updatedAt`
- **索引优化:** 针对查询频繁的字段建立了复合索引

---

## 📝 备注

- 所有主键使用 `String` 类型，采用 `cuid()` 作为默认值
- 时间戳字段统一使用 `DateTime` 类型
- 布尔字段默认值通常为 `false` 或 `true`
- 数组类型使用 `String[]` 表示
- JSON 类型使用 `Json` 表示
- 级联删除用于确保数据一致性
