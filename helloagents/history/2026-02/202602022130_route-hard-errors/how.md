## 技术方案：按类型拆解硬错误路由

### 一、分类与原则

1. **纯前端伪造路由**（后端从未实现，且有现成替代方案）  
   - 典型：`POST /api/questions/upload-image`。  
   - 策略：前端改用现有后端合同（`/api/upload/signature` + 直传），彻底删除伪造路由。

2. **文档式路由 vs 实际资源式路由**  
   - 典型：`POST /api/interactions/like|favorite` vs 实际 `POST /api/questions/:id/like|favorite`。  
   - 策略（本轮）：前端先对齐“资源式”路由，确保真实功能可用；是否补 `/api/interactions/*` 作为兼容别名，放在后续“合同统一”阶段评审。

3. **未落地的批量接口**  
   - 典型：`POST /api/behavior/batch-log`。  
   - 策略：当前项目并未实际使用 `behaviorService.batchLog`，本轮将其实现为“前端聚合调用”封装：内部循环调用已有 `POST /api/behavior/log`，不新增后端路由。

4. **路径多余的子层级**  
   - 典型：`PATCH /api/admin/whitelist/:id/validity` vs 实现 `PATCH /api/admin/whitelist/:id`。  
   - 策略：简化为直接走后端已有的 `/:id` 路径，保持请求体结构不变。

总原则：  
- **优先修改前端 service，贴近现有后端实现**，保证最小扰动；  
- 若某路由在前端已经有外部依赖（例如被文档或第三方调用依赖），再考虑加后端 alias，而不是立即删除。

### 二、各路由对应改造方案（已执行）

1. `POST /api/questions/upload-image`  
   - 已改造 `questionService.uploadImage`：改为调用 `GET /api/upload/signature?type=image` 获取签名，并基于返回的 `uploadUrl + key` 构造图片访问 URL，后续再按 `plan/image-compress-upload.md` 接入真实压缩与直传逻辑。  
   - 删除了对不存在的 `/questions/upload-image` 的依赖，并在 Mock 层对签名接口增加了模拟返回，保证测试稳定性。

2. `POST /api/interactions/like|favorite`  
   - 已改造 `interactionService.like` 与 `interactionService.favorite`：  
     - `like` 仅支持 `targetType="question"`，内部调用 `POST /api/questions/:questionId/like`，并将返回的 `isLiked/likes` 映射为 `LikeResponse`。  
     - `favorite` 调用 `POST /api/questions/:questionId/favorite`，将 `isFavorited/favorites` 映射为 `FavoriteResponse`。  
   - Mock 层同步增加了 `/questions/:id/like|favorite` 的模拟响应，保证前端单元测试与交互测试都能走通。

3. `POST /api/behavior/batch-log`  
   - 未新增后端路由，而是将 `behaviorService.batchLog` 实现为前端聚合函数：依次调用现有 `POST /api/behavior/log`，统计 `received/processed/failed`，再返回结果对象；  
   - 这样既避免新增未使用的后端接口，又满足批量调用的编程便利性。

4. `PATCH /api/admin/whitelist/:id/validity`  
   - 已改造 `adminService.updateValidity`：路径改为 `PATCH /api/admin/whitelist/:id`，请求体 `{ validUntil }` 与后端 Controller 一致，并将返回值类型调整为 `WhitelistUser`。

### 三、测试与文档同步（已执行）

- 前端：`npm test` 全量运行通过，`src/test/api.test.ts` 中的 `InteractionService` 用例已验证新的点赞路径；其余测试覆盖导航、诊断、家长流程等场景，未出现 404 或异常。  
- 后端：`backend/` 下的 `npm test` 保持全绿，后端接口行为未被本次前端改造破坏。  
- 文档：在 `helloagents/plan/backend-route-diff.md` 中已经补充“点赞/收藏路由风格差异”等说明，并在本方案包中记录了硬错误路由修复策略，方便后续审计与演进。

