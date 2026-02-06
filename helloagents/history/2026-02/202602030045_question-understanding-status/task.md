# 学生“弄懂了”个人理解标记功能 - 任务清单

## 数据库与模型层

- [√] 更新 Prisma 模型
  - [√] 在 `backend/prisma/schema.prisma` 的 `Question` 模型中新增 `understoodCount`、`notUnderstoodCount` 字段
  - [√] 新增 `QuestionUnderstanding` 模型，包含 `questionId`、`userId`、`status` 及索引/唯一约束
  - [-] 生成并应用数据库迁移（开发环境）

## 后端接口实现

- [√] 新增理解状态写入接口
  - [√] 在后端路由中新增 `POST /api/questions/:questionId/understanding`
  - [√] 鉴权与授权：仅允许 `question.authorId === currentUser.id`
  - [√] 实现插入/更新/删除个人状态记录，并在事务中更新 `Question` 聚合字段
  - [√] 返回当前用户状态和最新聚合计数

- [√] 扩展阅读接口返回理解状态
  - [√] 在 `GET /api/questions/:id` 中返回 `understoodCount`、`notUnderstoodCount` 以及 `currentUserUnderstandingStatus`
  - [√] 视需要在列表接口中返回 `currentUserUnderstandingStatus`
  - [√] 更新 `backend/openapi.yaml` 与相关类型定义

## 前端集成

- [√] 问答主页 UI 调整
  - [√] 在题目卡片“日期”旁渲染理解状态文案（红/绿/灰）
  - [√] 仅对提问学生展示该文案
  - [√] 添加点击交互，调用理解状态接口并乐观更新

- [-] 题目详情页（可选增强）
  - [-] 在详情页展示当前用户理解状态
  - [-] 保持与主页状态一致

## 测试与验证

- [-] 后端测试
  - [-] 为理解状态接口补充单元/集成测试（正常流 + 权限失败 + 边界情况）
  - [-] 回归现有 Question 相关接口，确保不受影响

- [-] 前端测试
  - [-] 补充或更新 Vitest/Playwright 测试用例，覆盖状态渲染与点击交互

- [-] 安全与性能检查
  - [-] 验证并发请求下计数是否正确
  - [-] 确认新增查询不会对列表性能产生明显负担
