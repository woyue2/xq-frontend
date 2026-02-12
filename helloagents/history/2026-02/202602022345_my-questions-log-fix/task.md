## 任务清单 - 202602022345_my-questions-log-fix

### A. 后端接口与语义调整

- [√] A1. 为 `QuestionService.list` 新增可选参数 `authorId`，实现“指定作者时不过滤状态”的查询逻辑。
- [√] A2. 调整 `question.routes.ts` GET `/api/questions`，从 `req.query` 解析 `authorId` 并传入服务层。
- [√] A3. 补充/调整 `question.api.spec.ts`，新增用例覆盖“带 `authorId` 参数时能返回 pending 状态问题”的场景。

### B. 日志与错误码诊断增强

- [-] B1. 确认 `AppError` 统一错误处理仍然为 `/api/questions` 写入结构化错误日志（含 `status`、`error`、`code`、`path` 等字段）。
- [-] B2. 在问题创建/列表关键路径按需补充 info 级业务日志（如 `question_created`、`question_list`），记录 `userId`、`authorId`、`statusFilter`、`resultCount` 等关键指标。
- [-] B3. 基于 `backend/script/scan-error-logs.ts` 扩展路径和错误码过滤能力，支持按 `/api/questions` 聚类统计错误码分布。

### C. 前端与 E2E 对齐

- [√] C1. 检查并确认 `useQuestions` 与 `QuestionListParams` 类型支持 `authorId` 字段，并在 `MyQuestionsPage` / `StatusListPage` 中正确传入当前用户 `id`。
- [√] C2. 手动或通过调试确认：E2E 主流程运行时，`/api/questions?authorId=...` 返回列表中包含刚刚通过 `/create` 提交的问题。
- [√] C3. 复跑 `tests/e2e/main-flow.spec.ts`，确保“学生完整链路”用例稳定通过。

### D. 文档与知识库同步

- [-] D1. 更新后端需求文档中 `/api/questions` 与“我的提问”相关章节，记录 `authorId` 查询语义与常见错误码。
- [-] D2. 更新前端 API 对接检查清单，加入“主流程 E2E + 日志扫描”的联合验收条目。
- [-] D3. 在 `helloagents/wiki` 中补充“问题模块日志与错误码排查指南”，总结操作步骤与常见错误码。

