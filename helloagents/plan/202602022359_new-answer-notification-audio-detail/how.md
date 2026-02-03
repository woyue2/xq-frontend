# 技术方案：新回答通知直达语音回答详情（仅规划，暂不实施）

> 本文是对 `202602022350_answer-notification-on-answer-created` 的增强方案，仅描述未来实现路径，当前代码未做任何改动。

## 一、整体思路

- 核心：在“新回答通知”中补充回答维度的定位信息，并在前端路由中完整携带与消费这部分信息。
- 关键点：
  1. **后端** 在创建通知时额外记录 `answerId`（通过约定字段或扩展字段）；
  2. **前端通知中心** 点击时带上 `answerId` 跳转；
  3. **问题详情页** 在回答列表加载完毕后滚动并高亮对应回答卡片。

## 二、后端设计（未来扩展）

### 2.1 Notification 模型扩展方式（两阶段设计）

短期（本方案推荐的第一阶段）：

- 不立即修改 `prisma` 模型，避免引入迁移负担；
- 采用“弱约定 + 文档记录”的方式：
  - `Notification.targetType = 'question'`，`targetId = questionId` 保持不变；
  - 在 `Notification.content` 中以 JSON 字符串形式存储扩展信息，例如：
    - `{"answerId":"xxx","title":"你的问题有新的回答"}`；
  - 文档中明确：`type='new_answer'` 时，`content` 字段如能解析为 JSON，则尝试从中读取 `answerId`。

中长期（可选第二阶段）：

- 为 `Notification` 模型新增 `meta Json?` 字段：
  - 用于统一存放结构化元信息（如 `answerId`、`commentId` 等）；
  - 需要配套 Prisma 迁移与数据兼容逻辑；
  - 该部分仅在方案中记录，不在当前任务中执行。

### 2.2 AnswerService 通知创建扩展

- 文件位置：`backend/src/services/answer.service.ts`
- 在当前“创建 new_answer 通知”的基础上，未来扩展为：
  - 在事务中拿到 `createdAnswer.id`；
  - 构造内容：
    - `content = JSON.stringify({ answerId: createdAnswer.id, questionTitle: question.title })`；
  - 继续写入 `Notification`：
    - `userId = question.authorId`
    - `type = 'new_answer'`
    - `title = '你的问题有新的回答'`
    - `targetType = 'question'`
    - `targetId = question.id`
- 错误处理：
  - 如果 JSON 构造失败，退回到简单字符串内容（例如仅问题标题），不影响回答与通知创建。

## 三、前端设计

### 3.1 通知中心跳转参数设计

- 文件：`src/pages/NotificationsPage.tsx`（实际文件名供未来实现时确认）
- 当前行为（规划中）：`type='new_answer'` 时点击跳转到 `/question/:id`。
- 未来增强：
  - 从 `notification.content` 中解析 `answerId`（尝试 `JSON.parse`，失败则忽略）；
  - 将 `answerId` 一并编码到跳转中：
    - 方案 A（推荐）：使用查询参数  
      - 路由：`/question/:questionId?answerId=xxx`；
    - 方案 B：使用 `state` 传递  
      - `navigate('/question/' + questionId, { state: { answerId } })`。
  - 两方案可并存（state 优先、query 兜底），以便在浏览器刷新后仍能从 URL 找回 `answerId`。

### 3.2 QuestionDetailPage 定位逻辑

- 文件：`src/pages/QuestionDetailPage.tsx`
- 目标行为：
  1. 解析 URL 查询参数与 `location.state`，获取 `answerId`（如有）；
  2. 在回答列表加载完成之后：
     - 找到 `answers` 中 `id === answerId` 的回答；
     - 使用 `ref` 系统或 `document.querySelector` + `scrollIntoView` 滚动到该卡片；
     - 对该卡片增加短暂高亮（例如添加带淡色背景的 class，几秒后恢复）。
- 建议实现方式（未来迭代时采纳）：
  - 为回答卡片增加 `data-answer-id` 属性，如 `data-answer-id={answer.id}`；
  - 使用 `useEffect` 监听 `answers` 数组变化与 `answerId`：
    - 当 `answers.length > 0 && answerId` 时，查找 DOM 元素并滚动；
    - 可用 `setTimeout` 延迟几十毫秒，确保 DOM 已渲染。
  - 语音播放器组件本身无需特殊处理，只要卡片在视口中可见即可由学生点击播放。

## 四、测试方案（未来）

### 4.1 后端集成测试

- 新增/扩展测试文件（示例）：`backend/src/tests/integration/notification-new-answer-flow.api.spec.ts`
- 在现有“创建 new_answer 通知”用例基础上增加断言：
  - `Notification.content` 可被成功解析为 JSON；
  - JSON 中包含 `answerId` 且与真实回答 ID 匹配。

### 4.2 前端 E2E 测试

- 在现有 `student-notification-answer-flow.spec.ts` 基础上扩展，或新增新的用例：
  - 场景大纲：
    1. 学生通过后端/前端创建问题；
    2. 老师创建包含语音的回答；
    3. 学生打开通知中心，看到“有新回答”通知；
    4. 点击通知后跳转到 `/question/:id?answerId=xxx`；
    5. 断言页面加载完成后：
       - 对应回答卡片在视口中且有高亮效果；
       - 该回答卡片中存在语音播放器按钮。

## 五、风险与兼容性

- 若短期仅采用 “content 中 JSON” 方式：
  - 需要在前端解析时优雅处理解析失败的情况，保证基本跳转仍然可用；
  - 旧数据（无 `answerId` 的通知）自动退化为“仅跳转到问题详情不定位”。
- 如后续引入 `meta Json` 字段：
  - 需进行一次性数据迁移，将 `content` 中的结构化部分迁移到 `meta`；
  - 前端解析逻辑需同时兼容新旧字段一段时间。+
