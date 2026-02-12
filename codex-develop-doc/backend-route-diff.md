## 后端路由对照差异清单（文档 vs 实现）

> 目的：列出「后端需求文档 / backend-key-apis」与当前 `backend/src/routes` 实现之间的关键路由差异，为后续统一接口合同提供参考。

### 一、基础约定（整体一致）

- Base URL：文档与实现均使用 `/api` 作为前缀。  
- 统一响应结构：当前实现已经按 `{ code, message, data, timestamp }` 输出，错误响应也包含 `error` 字段，与文档思路一致。

### 二、Auth & 用户相关

**文档：**
- `POST /api/auth/send-code`
- `POST /api/auth/login`
- `GET /api/auth/me`

**实现：**
- `POST /api/auth/send-code`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh-token`
- `POST /api/auth/logout`
- `GET /api/auth/me`

**差异要点：**
- 文档只列出 `send-code/login/me`，实现额外提供了 `register/refresh-token/logout` 三个接口（属于合理扩展，不冲突）。  
- 差异类别：语义等价类-C（扩展接口，不破坏原有合同，需在文档与前端清单中补充说明）。

### 三、白名单 & 课时管理

**文档：**
- `GET /api/admin/whitelist`
- `POST /api/admin/whitelist`
- `PATCH /api/admin/whitelist/:id`
- `DELETE /api/admin/whitelist/:id`

**实现：**
- `GET /api/admin/whitelist`（查询列表）
- `POST /api/admin/whitelist`（新增）
- `PATCH /api/admin/whitelist/:id`（更新）
- `DELETE /api/admin/whitelist/:id`（删除）
- `GET /api/admin/class-hours/:userId`
- `PATCH /api/admin/class-hours/batch-update`

**差异要点：**
- 白名单路由路径与方法与文档基本一致，只是返回结构字段名略有不同（文档示例为 `items/total/page/limit`，实现为 `list/pagination/statistics`）。  
- 课时管理接口在文档中只描述为功能点，当前实现具体为 `GET /api/admin/class-hours/:userId` 与 `PATCH /api/admin/class-hours/batch-update`，属于实现侧的细化设计。

### 四、问题 / 回答 / 评论

**文档（backend-key-apis 摘要）：**
- `GET /api/questions`
- `GET /api/questions/:id`
- `POST /api/questions`
- `POST /api/questions/:id/answers`
- `GET /api/questions/:id/answers`
- `POST /api/questions/:id/comments`
- `GET /api/questions/:id/comments`

**实现（挂载在 `/api/questions` / `/api/comments` / `/api/answers`）：**
- `GET /api/questions`（列表）
- `POST /api/questions`（创建问题）
- `GET /api/questions/:id`（详情，附带 isLiked/isFavorited）
- `GET /api/questions/:questionId/answers`（回答列表，仅返回已通过审核）
- `POST /api/questions/:questionId/answers`（教师创建回答）
- `GET /api/questions/:questionId/comments`（评论列表）
- `POST /api/questions/:questionId/comments`（在问题详情页场景下创建评论）
- 额外的评论创建入口：`POST /api/comments`（按 body 中的 questionId 创建）
- 删除回答：`DELETE /api/answers/:id`
- 删除评论：`DELETE /api/comments/:id`

**差异要点：**
- 路径风格基本与文档一致（都以 `/api/questions/:id/...` 为主），实现多提供了删除接口与额外的评论创建入口 `POST /api/comments`。  
- 文档中未区分“问题详情页下的评论路由”与“全局评论路由”，当前实现两套入口需要在文档中补充说明以免混淆。

### 五、点赞 & 收藏

**文档：**
- `POST /api/interactions/like`
- `DELETE /api/interactions/like`
- `POST /api/interactions/favorite`
- `DELETE /api/interactions/favorite`

**实现（挂在 `/api/users/me` 与 `/api/questions` 下）：**
- `POST /api/questions/:questionId/like`（切换点赞：内部做 +1/-1）
- `POST /api/questions/:questionId/favorite`（切换收藏）
- `GET /api/users/me/likes`（我的点赞列表）
- `GET /api/users/me/favorites`（我的收藏列表）

**差异要点：**
- **路径风格不一致**：文档设计的是 `/api/interactions/*` 作为统一行为接口；实际实现将点赞/收藏紧贴问题资源：`/api/questions/:id/like|favorite`，并用同一个 POST 实现“切换”逻辑，而不是分 POST/DELETE。  
- 若要对齐文档，有两种选择：  
  1. 文档更新为「推荐使用资源内嵌式路由 `/api/questions/:id/like`」，并说明使用 POST toggle；  
  2. 或新增 `/api/interactions/*` 的别名路由，内部转发到当前实现，保持向后兼容。
 - 其中 `GET /api/users/me/likes` 与 `GET /api/users/me/favorites` 为在实现与测试中已稳定存在的扩展接口，可归入语义等价类-C（扩展能力），重点是在 API 文档与前端清单中显式暴露。

### 六、审核 & AI 回调

**文档：**
- `GET /api/admin/audit-queue`
- `POST /api/admin/audit/:id/approve`
- `POST /api/admin/audit/:id/reject`
- `POST /api/internal/ai-check`

**实现（挂载 `/api/admin/audit` 与 `/api/internal`）：**
- `GET /api/admin/audit/pending`（待审核列表，query: type=question|answer|comment）
- `POST /api/admin/audit/:contentId/approve`（通过审核）
- `POST /api/admin/audit/:contentId/reject`（驳回问题）
- `POST /api/admin/audit/:contentId/ban`（封禁评论）
- `POST /api/admin/audit/questions/:questionId/pin`（置顶/取消置顶问题）
- `POST /api/internal/ai-check`（AI 审核回调，更新 status/aiResult）

**差异要点：**
- **队列路由命名差异**：文档中的 `GET /api/admin/audit-queue`，实际实现为 `GET /api/admin/audit/pending`。功能等价，但路径需要统一（建议文档改为 `/api/admin/audit/pending`，或在后端加一个 `/audit-queue` 别名）。  
- 审核操作的路径与文档基本一致，只是参数名从 `:id` 变为 `:contentId`，并扩展了 `ban` 与 `pin` 功能。

### 七、行为埋点

**文档：**
- `POST /api/behavior/log`

**实现：**
- `POST /api/behavior/log`

**差异要点：**
- 路径一致；响应结构已统一为：  
  - 文档与实现：`{ code: 200, message: "success", data: { logId: string }, timestamp }`。  
- 说明：早期实现中使用 `data.id/success/receivedAt` 的结构已废弃，当前版本在路由、服务实现、OpenAPI 摘要、前端类型以及测试用例中均采用 `data.logId` 作为唯一标识字段。
- 差异类别：语义等价类-A/B（命名差异 + 扩展字段，HTTP 状态码与“埋点写入成功”语义一致）。

### 八、上传 & 静态资源

**文档：**
- `GET /api/upload/signature`

**实现：**
- `GET /api/upload/signature`（要求登录，type=image|audio，教师才可获取音频签名）
- 静态音频：`GET /static/audio/*`（本地开发环境）

**差异要点：**
- 路径本身与文档一致；差异主要在“谁负责实际上传”和错误码使用（`2001` / 未来的 `2002`），已在 `helloagents/wiki/backend-section-8-9-review.md` 中备注。

### 九、通知模块

**文档：**
- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/read`

**实现：**
- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/read`

**差异要点：**
- 路径与方法与文档一致；实现中返回的数据字段名与文档示例略有差别（实现为 `notifications/unreadCount/total`），需要在文档中补齐详情。

### 十、当前建议的后续动作（仅路由视角）

1. **确认点赞/收藏路径策略**  
   - 在产品/后端评审中决定是沿用当前 `/api/questions/:id/like|favorite` 设计，还是需要补一个 `/api/interactions/*` 的兼容路由；  
   - 根据结论同步 `backend-key-apis.md` 与前端调用代码。

2. **统一审核队列路由命名**  
   - 建议选择 `GET /api/admin/audit/pending` 作为标准路径，并在需求文档中替换掉 `audit-queue`；  
   - 如有对外合同依赖，可在后端增加一个简单的别名路由转发。

3. **补充问题/评论“创建/删除”路由说明**  
   - 在文档中增加对 `DELETE /api/answers/:id`、`DELETE /api/comments/:id` 和 `POST /api/comments` 的说明，使文档与当前实现一致，避免新同学只看到 `/api/questions/:id/comments` 一种入口。
