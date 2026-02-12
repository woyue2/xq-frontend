## 合同偏差类修复技术方案（Contract Consistency）

> 对应 why.md 中的 5 类合同偏差，给出可执行的技术落地方案与任务编排。

### 一、整体技术栈与约束

- 后端：`backend/`（Node.js + Express + Prisma）
  - 统一响应中间件：`backend/src/middlewares/error.middleware.ts`（错误处理）
  - 路由聚合：`backend/src/app.ts` + `backend/src/routes/*.routes.ts`
  - 行为埋点服务：`backend/src/services/behavior-log.service.ts`
  - 互动服务：`backend/src/services/interaction.service.ts`
- 前端：`src/`（React + Axios）
  - API 封装：`src/services/api.ts`
  - 类型定义：`src/types/api.ts`
- 文档与知识库：
  - 需求：`codex-develop-doc/后端需求文档-完整版.md`、`codex-develop-doc/后端需求文档-埋点分析API.md`
  - 测试：`codex-develop-doc/后端-测试用例.md`
  - 摘要：`codex-develop-doc/backend-key-apis.md`
  - 前端规范：`gemini-frontend-doc/前端API对接检查清单.md`
  - HelloAGENTS：`helloagents/wiki/backend-section-8-9-review.md`、`helloagents/plan/backend-route-diff.md`

### 二、行为埋点合同统一（/api/behavior/log）

**目标合同：**

- 请求：保持 `BehaviorLogRequest` 定义不变（`type/timestamp/metadata`）。
- 响应：`ApiResponse<{ logId: string }>`，其中：
  - `code = 200`
  - `message = "success"`
  - `data = { logId: created.id }`
  - `timestamp = Date.now()`（保留）

**实施步骤：**

1. 后端路由调整
   - 文件：`backend/src/routes/behavior.routes.ts`
   - 修改 `res.json(...)` 返回结构：
     - 删除 `data.id/success/receivedAt` 字段；
     - 改为 `data: { logId: created.id }`；
     - `message` 固定为 `"success"`。
2. 自动化测试对齐
   - 文件：`backend/src/tests/integration/behavior.api.spec.ts`
   - 更新断言：
     - `expect(res.body.code).toBe(200)`
     - `expect(res.body.message).toBe('success')`
     - `expect(res.body.data.logId).toBeDefined()`
     - 不再依赖 `data.id/success/receivedAt`。
3. 文档同步
   - 文件：
     - `codex-develop-doc/后端需求文档-埋点分析API.md`
     - `codex-develop-doc/后端需求文档-完整版.md`（3.11 节）
     - `codex-develop-doc/backend-key-apis.md`（7.1 行为上报）
     - `codex-develop-doc/后端-测试用例.md` 中「行为日志记录」部分
   - 动作：
     - 统一示例为 `ApiResponse<{ logId: string }>`；
     - 将原先 `message: "Logged successfully"` / `data.id` 的示例改为新结构；
     - 测试用例 LOG-API-001 中，验证点改为“包含 `data.logId` 且 code=200”。
4. 知识库更新
   - 文件：
     - `helloagents/wiki/backend-section-8-9-review.md`
     - `helloagents/plan/backend-route-diff.md`
   - 动作：
     - 将当前“建议：在文档中说明 logId 即 data.id 或增加 logId 字段”的描述，更新为“已统一为 data.logId，后端实现已对齐”；
     - 在评审草案中记录这一决策，避免后续重复讨论。

### 三、分页列表合同统一（问题列表 / 我的点赞 / 我的收藏 / 后台白名单等）

**目标合同：**

- 统一通过 `ApiResponse<PaginatedResponse<T>>` 返回列表：
  ```ts
  interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    totalPages: number;
  }
  ```

**实施步骤：**

1. 后端路由层包装
   - 重点接口：
     - 问题列表：`backend/src/routes/question.routes.ts` → `GET /api/questions`
     - 我的点赞/收藏：`backend/src/routes/user-me.routes.ts` → `/api/users/me/likes|favorites`
     - 白名单列表：`backend/src/routes/admin-whitelist.routes.ts` → `GET /api/admin/whitelist`
   - 统一做法：
     - 服务层（如 `questionService.list`、`interactionService.listUserLikes`）可以继续返回 `{ list, pagination }`；
     - 路由层改为：
       ```ts
       const result = await service.list(...);
       return res.json({
         code: 200,
         message: 'success',
         data: {
           items: result.list,
           total: result.pagination.total,
           page: result.pagination.page,
           totalPages: result.pagination.totalPages
         },
         timestamp: Date.now()
       });
       ```
2. 前端类型对齐检查
   - 文件：
     - `src/types/api.ts` 中 `PaginatedResponse<T>` 定义（已符合目标合同）；
     - `src/services/api.ts` 中使用 `PaginatedResponse` 的函数：
       - `questionService.getQuestions`
       - `adminService.getWhitelist`
       - 以及后续对 `my-likes/my-favorites` 的封装（将在互动部分补充）。
   - 动作：
     - 确认上述函数的返回值依赖 `PaginatedResponse`，不再依赖 `{ list, pagination }`。
3. 文档与测试同步
   - 文件：
     - `codex-develop-doc/后端需求文档-完整版.md` 中所有列表响应示例；
     - `codex-develop-doc/后端-测试用例.md` 中列表类用例；
     - `codex-develop-doc/backend-key-apis.md` 中列表示例。
   - 动作：
     - 将所有 `{ list, pagination }` 示例统一替换为 `PaginatedResponse` 形式；
     - 在统一响应格式章节中增加“列表统一采用 PaginatedResponse<T>”的说明。

### 四、互动接口统一（/api/interactions/*）

**目标合同：**

- 点赞 / 取消点赞：
  - 路由：`POST /api/interactions/like`
  - 请求体：`LikePayload { targetType, targetId, action }`
  - 响应：`ApiResponse<LikeResponse>`，`LikeResponse { liked, likesCount }`
- 收藏 / 取消收藏：
  - 路由：`POST /api/interactions/favorite`
  - 请求体：`FavoritePayload { questionId, action }`
  - 响应：`ApiResponse<FavoriteResponse>`，`FavoriteResponse { favorited, favoritesCount }`
- 我的点赞 / 收藏列表：
  - 路由：`GET /api/interactions/my-likes`、`GET /api/interactions/my-favorites`
  - 响应：`ApiResponse<PaginatedResponse<QuestionSummary>>`

**实施步骤：**

1. 新增后端路由层
   - 新文件：`backend/src/routes/interaction.routes.ts`
   - 实现内容（调用现有 `interactionService`）：
     - `POST /interactions/like`：
       - 从 `req.body` 解析 `targetType/targetId/action`；
       - 当前只支持 `targetType='question'`，后续可扩展；
       - 调用 `interactionService.toggleQuestionLike`，将返回 `{ questionId, isLiked, likes }` 映射为 `{ liked, likesCount }`。
     - `POST /interactions/favorite`：
       - 从 `req.body` 解析 `questionId/action`；
       - 调用 `interactionService.toggleQuestionFavorite`，将 `{ questionId, isFavorited, favorites }` 映射为 `{ favorited, favoritesCount }`。
     - `GET /interactions/my-likes` / `my-favorites`：
       - 调用 `interactionService.listUserLikes` / `listUserFavorites`；
       - 将 `{ list, pagination }` 包装为 `PaginatedResponse`。
   - 在 `backend/src/app.ts` 中挂载新路由 `app.use('/api', interactionRouter)`。
2. 暂存旧路径
   - 原路径：`POST /api/questions/:questionId/like|favorite`
   - 策略：
     - 本迭代内保留旧路径，以便回归测试时比较行为；
     - 标记为“内部兼容路径”，后续在准备上线前统一删除或转发到新路由。
3. 前端 API 封装确认
   - 文件：`src/services/api.ts`
   - 现状：`interactionService.like/favorite` 已使用 `/interactions/like|favorite` 与 `LikeResponse/FavoriteResponse`；
   - 动作：
     - 与后端合同统一后，只需确认不再引用旧 `/questions/:id/like` 路径。
4. 文档与测试同步
   - 文件：
     - `codex-develop-doc/后端需求文档-完整版.md`（3.7 互动相关）
     - `codex-develop-doc/backend-key-apis.md` 中互动模块；
     - `codex-develop-doc/后端-测试用例.md` 中点赞/收藏相关用例；
     - `gemini-frontend-doc/前端API对接检查清单.md` 中互动部分。
   - 动作：
     - 确认所有示例均与新合同保持一致；
     - 在 HelloAGENTS 知识库中记录“采用 `/api/interactions/*` 作为统一行为接口”的决策。

### 五、通知接口文档对齐

**目标合同：**

- 列表：
  - `GET /api/notifications`
  - 响应：`ApiResponse<{ notifications: Notification[]; unreadCount: number; total: number }>`
- 未读计数：
  - `GET /api/notifications/unread-count`
  - 响应：`ApiResponse<{ count: number }>`
- 标记已读：
  - `POST /api/notifications/read`
  - 请求体：`{ ids: string[] }`
  - 响应：`ApiResponse<{ success: boolean; updatedCount: number }>`

**实施步骤：**

1. 确认后端实现与前端代码（`notificationService`）已符合上述合同；
2. 更新 `codex-develop-doc/后端需求文档-完整版.md` 第 3.10 节，示例改为包裹在 `ApiResponse<T>` 内；
3. 更新 `codex-develop-doc/backend-key-apis.md` 通知模块示例；
4. 在统一响应格式章节中补充“所有接口均采用 ApiResponse<T> 包裹”的明确说明。

### 六、测试用例与 OpenAPI 同步

**实施步骤：**

1. 后端自动化测试
   - 根据前述修改，更新 / 新增：
     - 行为埋点：`backend/src/tests/integration/behavior.api.spec.ts`
     - 互动接口：新增 `interaction.api.spec.ts`（覆盖 like/favorite、my-likes/my-favorites）；
     - 列表接口：适度补充对 `items/total/page/totalPages` 的断言。
   - 统一测试约定：
     - 成功响应：`code in {200, 201}` 且 `data` 结构与前端类型严格一致。
2. OpenAPI 更新
   - 文件：`backend/openapi.yaml`
   - 动作：
     - 为 `POST /api/behavior/log`、`POST /api/interactions/like|favorite`、`GET /api/interactions/my-likes|my-favorites`、通知接口等补充 / 更新响应 schema；
     - 对列表接口统一使用 `PaginatedResponse` 的 schema 描述。
3. 文档测试用例同步
   - 以更新后的自动化测试为“事实标准”，同步修正 `codex-develop-doc/后端-测试用例.md` 的请求 / 响应示例和验证点。

### 七、安全与回归验证

- 安全性：
  - 本次改动仅调整请求 / 响应结构与路由，不引入额外权限变化；
  - 保持现有中间件（鉴权 / 限流 / 业务校验）逻辑不变。
- 回归验证：
  - 后端：在 `backend/` 目录下执行 `npm test`（或现有测试命令），确保所有测试通过；
  - 前端：
    - 执行 `npm run typecheck`；
    - 在开发环境下实际调用行为埋点 / 列表 / 点赞收藏 / 通知接口，验证前端 UI 行为符合预期。

