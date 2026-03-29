# backend/src/services/ — 后端业务逻辑层

> **GEB Level: L3** | 父文档：[backend/src/CLAUDE.md](../CLAUDE.md)

## 职责

所有 Prisma 查询和业务规则的实现层。

## 文件清单

| 文件 | 职责 |
|---|---|
| `auth.service.ts` | 验证码发送、登录、注册、Token 刷新、密码重置 |
| `password.service.ts` | 密码设置、通过验证码重置密码 |
| `user.service.ts` | 用户信息查询与更新 |
| `question.service.ts` | 题目发布、查询、搜索、AI 审核触发 |
| `answer.service.ts` | 回答发布、查询、AI 审核触发 |
| `comment.service.ts` | 评论发布、查询、AI 审核触发 |
| `interaction.service.ts` | 点赞 / 收藏 / 取消操作 |
| `notification.service.ts` | 通知创建、查询、已读标记 |
| `behavior-log.service.ts` | 学生行为日志记录 |
| `audit.service.ts` | 人工审核流程（通过 / 拒绝 / 队列管理） |
| `ai-audit.service.ts` | AI 内容审核（文本 + 图片，供多 service 调用） |
| `whitelist.service.ts` | 白名单用户管理（增删查） |
| `class-hours.service.ts` | 课时记录管理 |
| `question-dimension.service.ts` | 题目维度标签管理 |
| `parent.service.ts` | 家长端：孩子绑定、学习报告生成 |
| `audit-callback.service.ts` | AI 审核回调写回（question/answer/comment 状态机） |
| `test-token.service.ts` | 测试环境令牌生成（仅 Playwright / E2E，非生产） |

## 规则

- 每个 service 函数只做**一件**事
- 所有 Prisma 操作放在此层，routes 层和 utils 层不得直接访问数据库
- 函数体 ≤ 30 行（复杂流程拆分为私有 helper 函数）
- 使用事务（`prisma.$transaction`）保证原子性

## FORBIDDEN

- 禁止在 service 层直接访问 `req`/`res`（只传纯参数）
- 禁止硬编码 SQL 字符串（必须通过 Prisma ORM）
