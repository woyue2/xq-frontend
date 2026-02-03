[ ] 接入后端审核列表接口（问题/评论）  
  - [ ] 在 `src/services/api.ts` 中新增 `adminService.audit` 模块，封装：
    - `getPendingQuestions({ page, pageSize })`
    - `getPendingComments({ page, pageSize })`
  - [ ] 定义前端使用的审核 DTO 类型（最小字段集：id/title/content/authorName/status/aiResult/createdAt/...）  
  - [ ] 保持与后端集成测试 `admin-audit.api.spec.ts` 的字段含义一致

[ ] 改造前端审核管理页数据加载逻辑  
  - [ ] 在 `AuditPage` 中移除非测试环境下的 Demo 数据注入逻辑  
  - [ ] 基于 `activeTab`（questions/comments）调用 `adminService` 拉取 `pending` 列表  
  - [ ] 增加 loading / error 状态展示与空态处理  

[ ] 接入审核操作 API（通过/驳回/封禁/置顶）  
  - [ ] 在 `adminService` 中封装：
    - `approveQuestion` / `rejectQuestion`
    - `approveComment` / `banComment`
    - `togglePinQuestion`
  - [ ] `AuditPage` 中的操作按钮调用上述 API，并在成功后更新本地 `questions/comments` 状态  
  - [ ] 保持现有评分对话框与“好问题”切换逻辑，正确传入 score/tags/difficulty 等字段  

[ ] 测试与兼容性适配  
  - [ ] 更新/补充前端单元测试（如有）以使用 `adminService` mock 而非 Demo 数据  
  - [ ] 验证后端审核集成测试不受影响（`admin-audit.api.spec.ts`）  
  - [ ] 人工联调：模拟若干 pending 问题/评论，确认审核页展示与操作闭环正常  

[ ] 知识库与文档同步  
  - [ ] 更新 `helloagents/wiki/frontend-integration.md`，补充“审核管理页 ↔ Admin Audit API 的对接说明”  
  - [ ] 如有需要，在 `helloagents/CHANGELOG.md` 中记录本次审核管理页从 Demo 到真实接入的变更  

