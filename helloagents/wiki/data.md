# 数据模型（Data Model）

## 一、核心实体（后端视角）

- User（用户）
  - 字段：`id, phone, nickname, avatar, role, grade, age, school, expiresAt, isActive, isBanned, createdAt, updatedAt`。
  - 关系：可关联一条 `UserWhitelist` 记录与多条 `LoginLog` 记录。

- UserWhitelist（白名单）
  - 字段：`id, phone, name, role, grade, validUntil, notes, isRegistered, userId, createdAt, registeredAt`。
  - 用途：控制允许注册和登录的手机号、默认角色与课时有效期。

- VerificationCode（验证码）
  - 字段：`id, phone, code, type, expireAt, used, errorCount, lockedUntil, createdAt, usedAt`。
  - 用途：支持发送验证码与登录/注册验证逻辑，实现频率与错误次数控制。

## 二、问题/回答/评论与互动（逻辑层）

根据需求文档，后端还需设计如下表结构（在后续实现中会通过 Prisma schema 扩展）：

- Questions / QuestionImages / QuestionAudios / QuestionTags / QuestionDifficulties。
- Answers / AnswerImages / AnswerAudios。
- Comments。
- Likes（针对问题与回答的点赞记录）。
- Favorites（问题收藏记录）。

具体字段与索引设计请结合最新的 Prisma schema 与数据库迁移脚本查看。

