## 合同偏差类修复任务清单（Contract Consistency）

> 说明：以下任务围绕 5 类典型合同偏差（行为埋点 / 分页列表 / 互动接口 / 通知合同 / 文档测试同步）展开，适合在 1 个小迭代内一次性完成。

- [√] T1 行为埋点合同统一  
  - [√] 调整 `backend/src/routes/behavior.routes.ts` 响应结构为 `ApiResponse<{ logId: string }>`  
  - [√] 更新 `backend/src/tests/integration/behavior.api.spec.ts` 断言逻辑  
  - [√] 同步更新埋点相关的需求文档与测试文档（完整版 + 埋点专用 + backend-key-apis + 后端-测试用例）  
  - [√] 更新 `helloagents/wiki/backend-section-8-9-review.md` 与 `helloagents/plan/backend-route-diff.md` 中关于 `data.id` vs `data.logId` 的评审结论  

- [-] T2 分页列表结构统一  
  > 备注: 本迭代未执行分页结构全面统一，仍保留部分 `{ list, pagination }` 返回结构，后续可单独起迭代处理。
  - [-] 为问题列表、我的点赞/收藏、后台白名单等列表接口，在路由层统一包装为 `PaginatedResponse<T>`  
  - [-] 检查并更新 `src/services/api.ts` / `src/types/api.ts` 中对应类型和返回值使用  
  - [-] 在需求文档与测试文档中，将所有 `{ list, pagination }` 示例替换为 `items/total/page/totalPages`  

- [√] T3 互动接口路由与数据结构统一  
  - [√] 新增 `backend/src/routes/interaction.routes.ts`，实现 `/api/interactions/like|favorite`（`my-likes/my-favorites` 仍使用 `/api/users/me/*` 路由）  
  - [-] 将 `interactionService.toggleQuestionLike/toggleQuestionFavorite/listUserLikes/listUserFavorites` 的返回值在路由层映射到 `LikeResponse/FavoriteResponse` 与 `PaginatedResponse`  
    > 备注: 点赞/收藏已按 `LikeResponse/FavoriteResponse` 映射，列表仍返回 `{ list, pagination }`，暂未切换为 `PaginatedResponse`。
  - [√] 调整 / 确认 `src/services/api.ts` 的 `interactionService` 与 `src/types/api.ts` 的互动相关类型与后端合同一致  
  - [√] 更新相关需求文档 / 前端 API 检查清单，使其以 `/api/interactions/*` 为主合同，标记 `/api/questions/:id/like|favorite` 为内部路径或计划废弃项  

- [-] T4 通知接口文档对齐  
  > 备注: 代码已采用统一 `ApiResponse<T>` 结构，通知相关文档将在后续文档专项中统一调整。
  - [√] 检查 `backend/src/routes/notification.routes.ts` 与 `notificationService` 的实现，确认已采用统一 `ApiResponse<T>` 结构  
  - [-] 更新 `codex-develop-doc/后端需求文档-完整版.md` 及 `backend-key-apis` 中通知模块的响应示例  
  - [-] 在统一响应格式章节明确“所有业务接口统一返回 ApiResponse<T>`  

- [-] T5 测试用例与 OpenAPI 同步  
  > 备注: 已补充行为埋点与互动相关自动化测试，OpenAPI 与测试用例的完全同步留待未来迭代。
  - [-] 根据 T1–T4 的改动完善 / 新增后端自动化测试（行为埋点、互动接口、典型列表）  
  - [-] 更新 `backend/openapi.yaml` 中行为埋点、互动、通知及列表接口的响应 schema  
  - [-] 按照更新后的自动化测试结果，统一修正 `codex-develop-doc/后端-测试用例.md` 的示例与验证点  

- [X] T6 综合回归与验收  
  > 备注: 本迭代未完成全量 `npm test` 修复（存在历史单测类型问题），仅对关键路径执行局部集成测试与状态码冒烟测试。
  - [X] 在本地环境中跑通后端测试命令（如 `npm test`），确保所有测试通过  
  - [-] 在前端运行类型检查与关键用户流程（查看问题列表、点赞收藏、查看通知、上报行为埋点），验证前后端合同完全一致  
  - [√] 在 HelloAGENTS 知识库中记录本次合同统一的最终决策与实施结果，更新 `helloagents/CHANGELOG.md`  
