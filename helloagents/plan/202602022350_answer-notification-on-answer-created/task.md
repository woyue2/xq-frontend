# 任务清单：老师回答完成后生成“有新回答”通知（仅规划，未执行）

> 说明：本任务清单仅作为未来迭代的执行计划，当前状态为**未开始**，禁止直接视为已落地功能。

## 一、后端任务

- [ ] T1. AnswerService 中追加通知逻辑
  - 文件：`backend/src/services/answer.service.ts`
  - 在 `create` 方法事务中追加 `Notification` 创建；`type='new_answer'`，`targetType='question'`，`targetId=question.id`。
  - 确保异常回滚一致性。

- [ ] T2. 更新通知类型文档与注释
  - 文件：`backend/prisma/schema.prisma`（`Notification.type` 注释）、`helloagents/wiki/backend-auth` 或通知相关模块文档。
  - 补充 `new_answer` 类型说明及语义。

- [ ] T3. 新增后端集成测试
  - 文件建议：`backend/src/tests/integration/notification-new-answer-flow.api.spec.ts`
  - 覆盖“学生提问 → 教师回答 → Notification 表新增 new_answer 记录”的完整链路。

## 二、前端任务

- [ ] F1. 通知中心 UI 区分“有新回答”类型
  - 文件：`src/pages/NotificationsPage.tsx`
  - 对 `notification.type === 'new_answer'` 使用专属图标/标题文案。

- [ ] F2. 通知点击跳转行为确认
  - 文件：`src/pages/NotificationsPage.tsx`
  - 约定 `targetType='question'` 时跳转 `/question/:id`，并在设计评审中确认是否需要后续支持 answer 定位。

## 三、端到端测试任务

- [ ] E1. 新增 Playwright E2E 用例：新回答通知链路
  - 文件：`tests/e2e/student-notification-new-answer-flow.spec.ts`
  - 场景：学生提问 → 教师回答 → 学生在通知中心看到“有新回答”并点击进入问题详情。

## 四、风险与后续工作

- [ ] R1. 通知数量增长评估
  - 确认高频回答场景下通知量是否可接受，必要时设计聚合策略。

- [ ] R2. 与“回答审核”联动的后续方案
  - 如未来引入回答审核流程，评估是否改为“审核通过时发送通知”，或同时保留创建时通知 + 审核结果通知。

