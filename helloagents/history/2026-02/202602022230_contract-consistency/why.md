## 合同偏差类 Bug 修复方案（开发阶段）

> 目标：在接口正式对外之前，统一「文档 / 前端类型 / 后端实现」三方的 API 合同，消除当前已知的请求 / 响应结构偏差，避免后续联调阶段出现大面积返工。

### 一、背景与上下文

- 当前仓库中关于接口合同的来源包括：
  - 需求文档：`codex-develop-doc/后端需求文档-完整版.md`、`codex-develop-doc/后端需求文档-埋点分析API.md`
  - 测试文档：`codex-develop-doc/后端-测试用例.md`
  - 摘要与对照：`codex-develop-doc/backend-key-apis.md`、`helloagents/plan/backend-route-diff.md`
  - 评审稿：`helloagents/wiki/backend-section-8-9-review.md`
  - 前端规范：`gemini-frontend-doc/前端API对接检查清单.md`、`gemini-frontend-doc/FRONTEND_REQUIREMENTS.md`
  - 前端实现：`src/services/api.ts` + `src/types/api.ts`
  - 后端实现：`backend/src/routes/*.routes.ts` + `backend/src/services/*` + `backend/openapi.yaml`
- 这几类文档之间已经存在多处「合同偏差」：
  - **行为埋点**：文档示例是 `data.logId` + `message: "success"`，而当前实现与部分文档 / 测试仍使用 `data.id` + `message: "Logged successfully"`；
  - **分页列表**：部分文档和前端统一使用 `PaginatedResponse<T> { items, total, page, totalPages }`，而后端多个服务返回 `{ list, pagination }`；
  - **互动接口**：文档与前端使用 `/api/interactions/*` 路由 + `LikeResponse/FavoriteResponse` 类型，后端则实现为 `/api/questions/:id/like|favorite` + `{ isLiked, likes } / { isFavorited, favorites }`；
  - **通知接口**：后端返回 `data.{ notifications, unreadCount, total }`，而需求文档示例缺少统一响应包裹；
  - **测试用例与实现**：`后端-测试用例.md` 中部分示例仍停留在旧结构（例如行为埋点只断言 `data.success`），与现有路由行为不完全一致。

⚠️ 不确定因素: 用户提到的「上面5个问题」在当前上下文中未给出精确编号；本方案假设主要聚焦上述五类典型合同偏差。如实际范围更大，可在执行阶段扩展任务清单。

### 二、总体决策原则

1. **当前实现 ≠ 永久合同**  
   - 所有相关接口尚未正式对外发布，可在本迭代中自由调整接口结构，而无需考虑兼容旧客户端；
   - 允许在不增加兼容字段的前提下，直接重命名字段或调整响应结构。

2. **统一「三方一致」作为唯一标准**  
   - 每个接口最终都要做到：**需求文档 + 前端类型定义 + 后端实现 + 测试用例** 四者完全对齐；
   - OpenAPI (`backend/openapi.yaml`) 作为机器可读合同，需同步更新，避免文档漂移。

3. **优先对齐“最新需求 + 前端设计”**  
   - 对于存在冲突的场景，以「最新版需求文档 + `src/types/api.ts` + `src/services/api.ts`」为主，视作当前的产品意图；
   - 后端实现与旧测试文档视为“待修正”，通过本方案统一到前端 + 新需求的合同上。

4. **分页 / 结果包装采用统一模板**  
   - 所有列表类接口统一采用：
     - HTTP 层：`ApiResponse<T> { code, message, data, timestamp? }`
     - 列表层：`PaginatedResponse<T> { items, total, page, totalPages }`
   - 管理端和前台共用同一分页结构，避免 `list/pagination` vs `items/total` 这种双轨格式。

5. **一次性集中修复 + 完整测试**  
   - 避免“只改一两个接口”的碎片化调整，统一在一个小迭代中集中修复当前已知的合同偏差；
   - 使用后端自动化测试 + 前端类型检查 + 少量端到端自测，作为验收标准。

### 三、针对此次 5 类合同偏差的决策

1. **行为埋点 (`POST /api/behavior/log`)**
   - 现状：
     - 需求文档（完整版 + 埋点专用文档）与前端代码统一期望：`data.logId` + `message: "success"`；
     - 后端实现 + 部分键值文档 + 测试用例仍使用 `data.id` + `message: "Logged successfully"`，并额外返回 `success/receivedAt`。
   - 决策：
     - **以行为埋点需求文档 + 前端类型为准**：
       - 后端改为返回 `code=200`、`message="success"`、`data={ logId: string }`，`timestamp` 继续保留；
       - 如需记录接收时间，保留在 `timestamp` 字段即可，不再额外暴露 `receivedAt`；
     - 旧文档与测试用例统一改写为新结构，删除对 `"Logged successfully"` 和 `data.id/success/receivedAt` 的强耦合断言。

2. **分页列表（问题列表 / 我的点赞 / 我的收藏 / 后台白名单等）**
   - 现状：
     - 前端与文档期望：`PaginatedResponse<T> { items, total, page, totalPages }`；
     - 多个后端服务（如 `questionService.list`、`interactionService.listUserLikes`、后台白名单列表等）返回 `{ list, pagination: { page, pageSize, total, totalPages } }`。
   - 决策：
     - **统一采用 `PaginatedResponse` 结构**：
       - 后端服务层仍可内部使用 `list/pagination` 命名，但路由层对外统一映射为 `{ items, total, page, totalPages }`；
       - 对应需求文档与测试文档中的列表示例全部改为 `items/total/page/totalPages`。

3. **互动接口（点赞 / 收藏）**
   - 现状：
     - 需求文档 + 前端：使用 `/api/interactions/like|favorite` + `LikeResponse/FavoriteResponse` 类型；
     - 后端：实际实现为 `/api/questions/:questionId/like|favorite`，返回 `{ questionId, isLiked, likes }` / `{ questionId, isFavorited, favorites }`。
   - 决策：
     - **以文档 + 前端设计为准，后端补 `interactions` 路由层**：
       - 在后端新增 `interactions.routes.ts`，提供：
         - `POST /api/interactions/like` → 调用现有 `interactionService.toggleQuestionLike`，对外返回 `{ liked, likesCount }`；
         - `POST /api/interactions/favorite` → 调用 `toggleQuestionFavorite`，对外返回 `{ favorited, favoritesCount }`；
         - `GET /api/interactions/my-likes` / `my-favorites` → 包装为统一 `PaginatedResponse<QuestionSummary>`；
       - `/api/questions/:id/like|favorite` 在当前阶段保留作为内部路由，后续视需要在新一轮重构中下线。

4. **通知接口**
   - 现状：
     - 后端实现与前端类型均使用 `ApiResponse<{ notifications, unreadCount, total }>` / `ApiResponse<{ count }>`；
     - 需求文档示例使用的是“去掉统一响应包裹”的简化版本。
   - 决策：
     - **以现有实现 + 前端为准，只修文档**：
       - 更新需求文档，将响应示例调整为包裹在 `ApiResponse<T>` 内；
       - 在「统一响应格式」章节显式说明所有业务接口均返回 `ApiResponse<T>`，通知模块不再例外。

5. **测试用例 vs 实现**
   - 现状：
     - 行为埋点、上传等部分用例与当前实现存在轻微偏差（字段名、message 文案等）；
     - 运行中的自动化测试（如 `backend/src/tests/integration/behavior.api.spec.ts`）已经对齐当前实现，而文档中的测试用例仍停留旧版。
   - 决策：
     - **以“目标合同” + 实际实现为基准，统一更新测试文档**：
       - 先根据上述三个关键模块（行为埋点 / 分页列表 / 互动接口）的决策更新后端代码与自动化测试；
       - 再用这些自动化测试作为“事实来源”，反向修正 `codex-develop-doc/后端-测试用例.md` 中的示例与验证点。

### 四、预期收益与影响范围

- 收益：
  - 联调阶段不再出现“前后端字段对不上”的低级问题，大幅降低沟通成本；
  - 前端类型定义与后端实现一一对应，TypeScript 类型检查可以真实反映合同问题；
  - 后端文档、OpenAPI、测试用例、实现形成闭环，后续新增接口可以直接复用本次统一出来的模板。
- 影响：
  - 涉及若干核心文件的同步修改（行为埋点文档与路由、多个列表类路由、互动路由与服务、测试用例文档、OpenAPI 摘要等）；
  - 需要跑通一次完整的后端测试（unit + integration）和前端类型检查，作为验收门槛。

### 五、执行策略

- 本方案将在一个独立迭代中集中完成：
  1. 先调整后端实现与自动化测试，使其对齐本方案中确定的合同；
  2. 再同步更新需求文档、测试文档、HelloAGENTS 知识库（wiki/plan），保证 SSOT 一致；
  3. 最后由前端联调验证行为埋点 / 列表 / 互动接口的实际调用效果。
- 方案执行的具体任务拆分与优先级安排见 `how.md` 与 `task.md`。

