# 技术方案：老师回答完成后生成“有新回答”通知（回答创建即发送通知）

> 状态说明：本方案仅为**未来迭代规划**，当前代码尚未实施；任何实现性描述均为目标设计，而非现状说明。

## 一、整体设计概览

- 触发点：后端 `AnswerService.create` 成功创建一条回答记录（不依赖审核通过）；
- 行为：
  1. 通过 `questionId` 查到问题及其作者 `authorId`；
  2. 使用同一事务内或紧随其后的调用向 `Notification` 表插入一条 `type='new_answer'` 的通知；
  3. 通知载荷中携带足够的定位信息（至少 `targetType` + `targetId`），以便前端跳转到问题详情；
  4. 前端通知中心将该通知渲染为“新回答”类型，点击后打开问题详情。

## 二、后端设计

### 2.1 数据模型与约束

- `prisma/schema.prisma` 中 `Notification` 模型当前定义：
  - `type: String // 'answer' | 'comment' | 'audit_result' | 'system'`
  - `targetType: String?`
  - `targetId: String?`
- 方案选择：
  - **不改动数据库 Schema**，仅约定新的 `type` 取值 `'new_answer'`，并在代码与文档中更新说明；
  - `targetType` 建议使用 `'question'`，`targetId` 填写问题 ID：
    - 优点：前端点击通知后统一跳转到 `/question/:id`；
    - 回答 ID 如需用于精细定位，可后续通过扩展 `content` 或追加 JSON 字段处理（本轮不做 DB 变更）。

### 2.2 AnswerService 扩展

- 文件：`backend/src/services/answer.service.ts`
- 在 `create` 方法中当前逻辑：
  - 校验问题存在；
  - 校验回答内容非空；
  - 校验作者存在；
  - 使用事务创建 `Answer` + 更新 `Question.answers` 计数。
- 预期改动（目标设计）：
  - 在事务中追加创建 `Notification` 的步骤，例如：
    - 查询问题记录 `question`（已经在 create 中获取，可复用）；
    - 调用 `tx.notification.create`：
      - `userId: question.authorId`
      - `type: 'new_answer'`
      - `title: '你的问题有新的回答'`
      - `content: answer.content` 的摘要（例如前 50 字，后端负责裁剪）或问题标题
      - `targetType: 'question'`
      - `targetId: question.id`
  - 确保 `AnswerService.create` 异常时整个事务全部回滚，包括通知。

### 2.3 权限与频率控制

- 权限：
  - 回答创建已有角色限制：仅教师可回答（由路由和中间件控制）；
  - 通知创建不增加额外权限判断，完全依赖回答创建的前置约束。
- 频率与去重（本轮不做复杂处理）：
  - 不对同一问题的多条回答做合并，学生每收到一次回答就产生一条通知；
  - 后续如有“通知噪声”问题可再设计批量汇总策略（例如按问题聚合）。

## 三、前端设计

### 3.1 通知列表展现

- 现有通知中心页面：`src/pages/NotificationsPage.tsx`
  - 已基于 `notificationService.getNotifications` 渲染 `notifications` 列表。
- 新增 UI 规则（不必立即落地，仅在本方案中定义）：
  - 当 `notification.type === 'new_answer'` 时：
    - 左侧图标：使用与“回答/老师”相关的图标（如 `MessageSquare` 或带勾的对话框）；
    - 标题：例如“你的问题有新的回答”；
    - 内容：展示问题标题或回答摘要；
    - 点击行为：如果 `targetType === 'question' && targetId`，则 `navigate('/question/' + targetId)`。

### 3.2 问题详情页配合（可选增强）

- 现状：`QuestionDetailPage` 已通过 `answerService.listByQuestion` 拉取后端通过审核的回答列表。
- 未来可选增强（本次不做实现，只记录思路）：
  - 当从“有新回答”通知进入问题详情时，在 URL 或状态中带上 `answerId`：
    - 方案 A：通知的 `targetType='answer'` + `targetId=answerId`，前端请求问题详情 + 回答列表后，在列表中 `scrollIntoView` 指定回答；
    - 方案 B：在通知内容中编码 `answerId`，前端解析后同样滚动定位。
  - 本轮方案仍使用 `targetType='question'`，保持实现成本可控。

## 四、测试方案

### 4.1 后端测试（Jest + supertest）

- 新增集成测试文件建议：`backend/src/tests/integration/notification-new-answer-flow.api.spec.ts`：
  - 场景：学生提问 + 老师回答 → Notification 表生成 `new_answer` 记录；
  - 校验字段：
    - `userId` 等于问题作者；
    - `type='new_answer'`；
    - `targetType='question'` 且 `targetId=questionId`；
    - 标题与内容符合预期模板。

### 4.2 前端测试（Playwright）

- 设计新的 E2E 用例文件：`tests/e2e/student-notification-new-answer-flow.spec.ts`（与现有“审核通知”用例区分）：
  1. 使用后端 `/api/internal/test-token` 获取 `student` 与 `teacher` token；
  2. 学生通过后端接口 `POST /api/questions` 创建问题；
  3. 教师通过前端 UI 或后端接口 `POST /api/questions/:id/answers` 创建回答；
  4. 学生登录前端，打开首页；
  5. 点击 Header 铃铛进入 `/notifications`，断言列表中出现 `type='new_answer'` 的通知；
  6. 点击该通知，跳转到 `/question/:id`，在“全部回答”区域看到回答数量增加（或特定回答内容）。

## 五、安全与性能考量

- 安全：
  - 不新增对外接口，仅复用内部 `AnswerService.create` 与通知表；
  - 通知内容以问题标题和回答摘要为主，不包含敏感信息；
  - 依旧遵循现有的鉴权中间件，避免越权创建回答。
- 性能：
  - 每次回答创建增加一次 `notification.create` 操作，属于轻量级写入；
  - 无大规模批量操作，预计对整体性能影响可忽略。

