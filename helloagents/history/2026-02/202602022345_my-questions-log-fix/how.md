## 实施方案 - 202602022345_my-questions-log-fix

本方案最终通过以下方式落地或等价完成：

1. **后端列表语义与 authorId 支持（A 组）**
   - 在 `backend/src/services/question.service.ts` 中新增并落实现有的 `authorId?: string` 查询参数逻辑：
     - 未指定 `authorId` 时默认按 `status='approved'` 过滤，用于首页公开列表；
     - 指定 `authorId` 时不再强制过滤状态，由调用方自行按 `pending/approved/...` 分组展示。
   - 在 `backend/src/routes/question.routes.ts` 的 `GET /api/questions` 中，从 `req.query.authorId` 解析作者 ID，并传递给服务层。
   - 通过集成测试 `backend/src/tests/integration/question.api.spec.ts` 中新增的 `Q-API-010` 用例验证：
     - 同一作者在 `pending` 与 `approved` 状态下的问题都可以通过 `authorId` 查询到；
     - 其他作者的问题不会混入该结果集。

2. **前端“我的提问”与 E2E 对齐（C 组）**
   - `QuestionListParams` / `QuestionParams` 类型已支持 `authorId` 字段，`useQuestions` 在“我的提问”相关页面（`MyQuestionsPage` / `StatusListPage`）中按当前用户 `id` 传入该字段，从而触发后端返回全状态问题集。
   - 通过 Playwright 用例（如 `tests/e2e/main-flow.spec.ts` 与 `student-question-audit-flow.spec.ts`）验证：
     - 学生通过 `/create` 创建问题后，在“我的提问”列表中可以立刻看到该问题（即使仍为 `pending` 状态）；
     - 列表项可顺利跳转到详情页，继续完成点赞/收藏与审核后回看等操作。

3. **日志与知识库（B/D 组）处理策略**
   - 本轮未强制落地 B/D 组中关于“新增专用业务日志字段”和“扩展 scan-error-logs 脚本”的增强项，而是在既有 Pino 结构化日志与现有测试覆盖之上先保证主链路稳定。
   - B1/B2/B3 与 D1/D2/D3 在 `task.md` 中标记为 `[-]`（已跳过），保留为后续“日志排查体验优化”和“文档补全”的独立增强方向，如后续需要可单独立项。

4. **验证方式**
   - 后端：运行 `cd backend && npm test`，确保 `question.api.spec.ts` 中 Q-API-005/006/007/010 等用例全部通过，`QuestionService.list` 的分支覆盖率满足要求。
   - 前端：
     - 使用 `npm test` 运行 Vitest，验证 `full_p0_coverage.test.tsx` / `comprehensive.test.tsx` 中与“我的提问 + 详情页”相关的断言通过；
     - 使用 `npx playwright test` 运行所有 E2E，观察 `学生完整链路：提问 → 我的问题 → 点赞/收藏 → 问题详情` 不再间歇性失败。

