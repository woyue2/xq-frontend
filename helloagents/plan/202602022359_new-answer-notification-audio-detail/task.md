# 任务清单：新回答通知直达语音回答详情（方案2，仅规划，不执行）

> 状态说明：本任务清单仅作为未来开发迭代的执行计划，当前阶段**不落地代码实现**。所有任务状态初始均为 `[ ]`。

## 一、后端任务

- [ ] B1. 扩展 AnswerService 中 new_answer 通知内容
  - 在 `AnswerService.create` 的通知创建逻辑中附加 `answerId` 信息（例如写入 `content` 的 JSON）。
  - 确保异常时回滚一致，不影响回答创建主流程。

- [ ] B2. 更新 Notification 类型文档与约定
  - 在 `helloagents/wiki/api.md` 或通知相关模块文档中补充：
    - `type='new_answer'` 时 `content` 的 JSON 结构约定（含 `answerId`）。
  - 明确后续可能引入 `meta Json` 字段的演进路径。

- [ ] B3. 新增/补充后端集成测试
  - 在 `backend/src/tests/integration/notification-new-answer-flow.api.spec.ts`（或等价文件）中增加对 `answerId` 写入与解析的断言。

## 二、前端任务

- [ ] F1. 通知中心点击行为带上 answerId
  - 在 `NotificationsPage` 中解析 `notification.content`（尝试 JSON 解析）；
  - 如存在 `answerId`，则在 `navigate` 时通过 URL 查询参数或 state 传递。

- [ ] F2. QuestionDetailPage 中实现回答定位与高亮
  - 在 `QuestionDetailPage` 中解析 `answerId`；
  - 在回答列表渲染完成后，根据 `answerId` 查找 DOM 元素并滚动；
  - 为目标回答卡片增加短暂的高亮样式（如背景色或边框）。

## 三、端到端测试任务

- [ ] E1. 扩展学生通知 E2E 用例
  - 以 `student-notification-answer-flow.spec.ts` 为基础，新增步骤：
    - 从通知中心点击“有新回答”后，断言页面滚动到目标回答卡片；
    - 若该回答包含语音播放器，验证相关按钮存在。

## 四、风险与后续工作

- [ ] R1. 数据兼容与迁移方案评估
  - 评估是否需要引入 `Notification.meta` JSON 字段；
  - 设计从 `content` JSON 迁移到 `meta` 的一次性脚本（仅在决定实施时执行）。

- [ ] R2. 联动其他通知类型的统一设计
  - 当“评论通知直达评论”等需求出现时，可复用本方案模式；
  - 根据实际使用情况评估是否需要一套通用的“通知 → 目标节点定位”机制。+
