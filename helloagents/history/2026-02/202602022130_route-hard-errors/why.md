## 背景：前后端「硬错误类」路由不一致

- 当前项目中，后端 `/api` 路由整体与需求文档基本对齐，但存在少量**前端调用的 URL 在后端完全不存在**的情况，属于“硬错误类”：只要前端真正走到这些分支，就会直接 404。
- 已确认的典型问题包括（以 Axios `baseURL=/api` 为前提）：
  - `POST /api/questions/upload-image`（前端 `questionService.uploadImage`）→ 后端无 `/api/questions/upload-image` 路由，图片上传应通过 `/api/upload/signature` + 直传。
  - `POST /api/interactions/like` / `POST /api/interactions/favorite`（前端 `interactionService`）→ 后端仅有 `POST /api/questions/:questionId/like|favorite`，不存在 `/api/interactions/*` 路由。
  - `POST /api/behavior/batch-log`（前端 `behaviorService.batchLog`）→ 后端只实现 `POST /api/behavior/log`，无 batch 版接口。
  - `PATCH /api/admin/whitelist/:id/validity`（前端 `adminService.updateValidity`）→ 后端只提供 `PATCH /api/admin/whitelist/:id` 来更新有效期。
- 目前大部分“硬错误路由”尚未在真实业务中被频繁调用（有的只在 Mock/未使用的 service 中），所以短期内不一定暴露，但从长期维护看：
  - 容易在后续接入新功能或打开 Mock 开关时突然出现大面积 404；
  - 与需求文档 `backend-key-apis` / 前端 API 对接清单存在认知不一致，给新同学带来困惑。

## 目标：梳理并消除所有硬错误路由

1. **系统性列出**所有“前端会调用但后端不存在”的 URL，并形成可维护的对照表（已初步完成，在本方案中收敛为 4 大类）。  
2. **为每一类硬错误路由制定统一策略**：优先通过“前端对齐后端实现”的方式消除 404；如需兼容旧合同，再考虑增加后端别名路由。  
3. 最终状态：
   - 任意 `src/services/api.ts` 中对 `/api/*` 的真实调用，都能在 `backend/src/routes` 中找到对应实现；
   - 相关的 Jest / 前端测试覆盖核心调用路径，避免以后再引入新的“硬错误类”路由。

## 不做 / 延后事项

- 不在本方案中重构所有“合同偏差类”（比如字段名差异 `items` vs `list`，`data.id` vs `data.logId`），这些属于另一个“合同统一”议题。
- 不在本方案中强制完全对齐所有历史文档（`deprecated-doc/*`），优先以**现有实现 + 前端**为基准消除 404，文档统一可在后续单独迭代。 

