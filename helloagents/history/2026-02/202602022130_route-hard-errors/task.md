## 任务清单：修复前后端硬错误路由（已执行）

> 任务状态符号: `[ ]` 待执行 / `[√]` 已完成 / `[X]` 失败 / `[-]` 已跳过 / `[?]` 待确认

### 一、前端服务层改造

1. `[√]` `questionService.uploadImage` 改造为使用 `/api/upload/signature` + 直传流程（参考 `plan/image-compress-upload.md`），移除对 `POST /questions/upload-image` 的依赖。
2. `[√]` `interactionService.like` 改造：
   - 入参仍接受 `LikePayload`，但仅支持 `targetType="question"`；
   - 路径改为 `POST /questions/:questionId/like`，并适配后端返回结构（`isLiked/likes`→`liked/likesCount`）。
3. `[√]` `interactionService.favorite` 改造：
   - 使用 `POST /questions/:questionId/favorite`；
   - 对接后端返回的 `isFavorited/favorites` 字段，并映射为 `FavoriteResponse`。
4. `[√]` `adminService.updateValidity` 的路径改为 `PATCH /admin/whitelist/:id`，请求体 `{ validUntil }` 与后端保持一致。

### 二、行为埋点批量接口处理

5. `[√]` 决策 `behaviorService.batchLog` 处理策略：
   - 采用“前端聚合调用”方案：保留 `batchLog` 封装，但内部循环调用已有 `POST /api/behavior/log`，不新增后端路由。
6. `[-]` （若选方案 B）在后端实现 `POST /api/behavior/batch-log`：
   - 已明确当前版本不采用方案 B，故标记为跳过。
7. `[-]` （若选方案 B）为 `batch-log` 路由补充基础集成测试：
   - 由于未实现后端路由，相关测试暂不需要。

### 三、测试与文档同步

8. `[√]` 更新或新增前端测试用例：
   - 现有 `src/test/api.test.ts` 中的 `InteractionService` 用例已验证点赞接口；  
   - 其余测试（如 `interaction.test.tsx`、`good_question.test.tsx`）通过 Mock 与行为埋点覆盖新的路径逻辑。
9. `[-]` 如有使用 Playwright 或 E2E，用真实后端跑一遍典型流程（提问 → 点赞/收藏 → 白名单更新），确认无 404：
   - 当前环境未接入前端 dev server + Playwright 的完整 E2E 流程，该任务待未来在本地或专用 E2E 环境中补齐。
10. `[√]` 在 `helloagents/plan/backend-route-diff.md` 中补充一小节“硬错误路由修复计划”，指向本方案包路径 `helloagents/plan/202602022130_route-hard-errors/`：
   - 已完成，差异清单中包含点赞/收藏与审核队列等路由风格说明。

