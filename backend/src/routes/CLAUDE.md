# backend/src/routes/ — Express 路由层

> **GEB Level: L3** | 父文档：[backend/src/CLAUDE.md](../CLAUDE.md)

## 职责

接受 HTTP 请求，做参数校验 + 权限鉴别（JWT guard），调用 service，返回标准响应。

## 文件清单

| 文件 | 职责 |
|---|---|
| `auth.routes.ts` | 登录 / 注册 / 验证码 / Token 刷新 |
| `user-me.routes.ts` | 当前登录用户信息查询与更新 |
| `profile.routes.ts` | 用户主页信息 |
| `question.routes.ts` | 题目发布 / 查询 / 搜索 / 理解标记 |
| `answer.routes.ts` | 回答发布 / 查询 |
| `comment.routes.ts` | 评论发布 / 查询 |
| `interaction.routes.ts` | 点赞 / 收藏交互 |
| `notification.routes.ts` | 通知列表 / 已读标记 |
| `behavior.routes.ts` | 学生行为日志上报 |
| `upload.routes.ts` | 图片 / 音频文件上传 |
| `config.routes.ts` | 前端配置数据下发（学科 / 标签等） |
| `parent.routes.ts` | 家长端：孩子信息 / 学习报告 |
| `admin-audit.routes.ts` | 管理员：内容人工审核 |
| `admin-whitelist.routes.ts` | 管理员：白名单管理 |
| `admin-class-hours.routes.ts` | 管理员：课时管理 |
| `admin-question-dimensions.routes.ts` | 管理员：题目维度管理 |
| `internal.routes.ts` | 内部接口（Playwright 测试用，非生产） |
| `admin-subjects.routes.ts` | 管理员：科目/考点管理 |

## 规则

- 路由文件只能调用同名 service（auth.routes.ts → auth.service.ts）
- 禁止在路由层写任何业务逻辑（SQL/Prisma/计算等）
- 每个 route handler ≤ 15 行
- 统一使用 `ApiResponse<T>` 标准响应格式：`{ code: 200, message: 'success', data }`

## FORBIDDEN

- 禁止在路由内直接 `import { PrismaClient }`
- 禁止跨路由文件互相调用
