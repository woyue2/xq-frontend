## 技术方案总览

本方案采取“最小侵入接后端”的策略：

- 后端层：保持现有 `Admin Audit API` 不变，只在需要时补充前端专用 `adminService` 封装；
- 前端层：在 `AuditPage` 内通过 `adminService` 调用后端接口，替换原有 Demo 数据注入逻辑；
- 状态管理：继续使用当前组件内的本地 state（`questions` / `comments` / `filter`），不额外引入全局状态或复杂缓存；
- 兼容性：保留测试环境下的 demo 注入能力，通过环境判断兼容现有前端测试。  

### 一、后端 API 使用方式设计

现有后端审核接口：

- 列表：`GET /api/admin/audit/pending?type=question|comment&page=&pageSize=`  
  - question 返回：`{ type: 'question', list: [{ id, title, content, authorName, status, aiResult, createdAt, ... }], pagination, statistics }`  
  - comment 返回：`{ type: 'comment', list: [{ id, questionId, questionTitle, content, image, authorName, status, aiResult, createdAt }], ... }`  
- 操作：
  - `POST /api/admin/audit/:id/approve`（body: `{ type, isGoodQuestion?, score?, tags?, difficulty? }`）
  - `POST /api/admin/audit/:id/reject`（body: `{ type: 'question', reason }`）
  - `POST /api/admin/audit/:id/ban`（body: `{ type: 'comment', reason }`）
  - `POST /api/admin/audit/questions/:questionId/pin`

前端封装计划：在 `src/services/api.ts` 中增加 `adminService.audit` 模块：

- `adminService.getPendingQuestions(params)` → 调用 `GET /admin/audit/pending?type=question`；  
- `adminService.getPendingComments(params)` → 调用 `GET /admin/audit/pending?type=comment`；  
- `adminService.approveQuestion` / `rejectQuestion` / `approveComment` / `banComment` / `togglePinQuestion`；  

返回类型使用现有 `Question` / `Comment` 类型的子集或单独定义 DTO，以避免在审核页中误用普通列表字段。  

### 二、前端 AuditPage 改造方案

#### 2.1 数据加载策略

在 `AuditPage` 中：

- 引入 React 状态：
  - `loadingQuestions/loadingComments`、`errorQuestions/errorComments`；
  - `pageQuestions/pageComments`（如需分页，先预留为单页模式 `page=1`）；
- `useEffect` 触发时机：
  - `activeTab` 为 `'questions'` 时加载问题待审核列表；
  - `activeTab` 为 `'comments'` 时加载评论待审核列表；
  - `filter === 'pending'` 时请求 `/pending`，其他状态的列表暂时通过本地状态转换（approve/reject/ban 后留在内存中展示）。  

伪代码：

```ts
useEffect(() => {
  if (activeTab === 'questions') {
    loadPendingQuestions();
  } else {
    loadPendingComments();
  }
}, [activeTab]);

const loadPendingQuestions = async () => {
  setLoadingQuestions(true);
  try {
    const res = await adminService.getPendingQuestions({ page: 1, pageSize: 20 });
    setQuestions(mapToQuestionUI(res.data.list));
  } catch (e) {
    setErrorQuestions(...);
  } finally {
    setLoadingQuestions(false);
  }
};
```

`mapToQuestionUI` 会把后端返回的审核项映射到当前 `Question` UI 所需字段（`title/authorName/createdAt/aiResult/status` 等），图片列表暂为空。  

#### 2.2 审核操作行为

现有按钮：

- 问题卡片：评分按钮、好问题复选框、通过 / 驳回；
- 评论卡片：通过 / 驳回 / 封禁。

改造后的行为：

- 通过：
  - 问题：调用 `adminService.approveQuestion`，将 `isGoodQuestion/score/tags/difficulty` 传入，成功后更新本地 `questions` 中对应项的 `status='approved'` 并保留在“已通过”筛选下；  
  - 评论：调用 `adminService.approveComment`，成功后将 `status='approved'`；
- 驳回：
  - 问题：调用 `adminService.rejectQuestion`，`reason` 使用驳回对话框中的输入，并将 `status='rejected'`；
- 封禁：
  - 评论：调用 `adminService.banComment`，`reason` 使用驳回理由输入，并将 `status='banned'`；

本地状态更新策略：

- 所有审核操作完成后，统一调用本地 `handleAudit` 更新 `questions/comments` 队列；
- 为避免与后端分页状态不一致，在成功调用 API 后即可把该条目从“待审核列表”中移除，保留在当前页面内用于“已通过/已驳回/已封禁”查看，刷新页时默认只重新拉取 `pending` 列表。

### 三、环境与测试兼容

#### 3.1 测试环境（Vitest/Playwright）兼容

当前 `AuditPage` 在 `MODE === 'test'` 下注入 demo 数据以服务前端 UI 测试。改造后需兼容：

- 在单元测试环境：依然可通过 mock `adminService` 返回固定列表，或保留“测试模式注入 fallback”逻辑；
- 在 E2E / Playwright 测试中：建议直接走真实后端 Admin Audit API，或者使用后端已有 `internal/test-token` 生成教师 token 后构造待审核数据。

策略：

- 在 `AuditPage` 中对 `adminService` 调用添加 try/catch：  
  - 如果请求失败且 `import.meta.env.MODE === 'test'`，退化为当前的 demo 数据注入方案，以保证老测试仍然通过；  
  - 在正常 dev/prod 环境下则直接显示错误提示或空态。

#### 3.2 权限与导航

- 入口：保持 Profile 中“审核管理”仅对老师可见；
- 若非老师或未登录直接访问 `/audit`：依赖现有路由守卫/后端 403 统一处理，没有额外改动。

### 四、风险与缓解

- 风险 1：前端状态与后端列表不一致（例如后端已审核，但本地还显示为 pending）。  
  - 缓解：审核操作后可选重拉当前页的 `pending` 列表；或在关键操作（如 ban）后强制刷新。  

- 风险 2：前端测试大量依赖旧的 demo 数据行为，改造后用例失败。  
  - 缓解：优先在 `adminService` 层做 mock，保留测试环境下注入路径；改造时同步更新 Vitest/Playwright 用例。  

- 风险 3：老师误操作导致错误封禁/驳回。  
  - 缓解：保留驳回/封禁前的确认对话框，并在 remark 中明确提示“操作不可逆，需要谨慎”。  

