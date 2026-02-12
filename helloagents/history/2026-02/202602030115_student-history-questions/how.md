# 老师/家长点击学生头像查看历史提问 - 技术方案

## 一、整体设计概览

### 1.1 核心思路

- 后端复用已有按作者筛选问题的能力（`GET /api/questions?authorId=...`），在权限层做最小必要扩展（主要是家长端的 childId → authorId 映射）。
- 前端新增一个“学生历史提问列表页”（例如 `/student/:studentId/questions`），在不同入口（问答主页、问题详情页、老师后台、家长孩子列表）中统一跳转到该页面。
- 使用现有的 `questionService.getQuestions` + `QuestionList` 组件渲染列表，将过滤参数扩展支持 `authorId`，并根据 viewer 角色调整文案与权限行为。

### 1.2 相关模块

- 后端：
  - `backend/src/services/question.service.ts`（列表查询已支持 authorId 参数）；
  - `backend/src/routes/question.routes.ts`（可视需要新增语义化路由别名或保留现有 query 方案）；
  - `backend/src/routes/parent.routes.ts`（家长端如需通过 childId 直接获取问题列表，可以考虑补充桥接接口）。
- 前端：
  - `src/pages/StudentHistoryPage.tsx`（新建）；
  - `src/components/QuestionCard.tsx` + `src/components/QuestionList.tsx`（头像点击行为扩展）；
  - 现有路由注册文件（`src/App.tsx` 或路由配置）；
  - 老师后台相关页面（如 `AdminManagementPage`、审核列表页面）与家长孩子列表页面，为头像/学生名补充跳转逻辑。

## 二、后端方案

### 2.1 列表接口复用与约定

- 现有接口：`GET /api/questions` 已支持 `authorId` 查询参数：
  - 当带上 `authorId` 时，`QuestionService.list` 中 `effectiveStatus` 逻辑会允许返回该作者所有状态的问题（pending/approved/rejected）。
  - 因此，无需新增专门的 `/api/students/:id/questions` 接口，前端可直接通过 `GET /api/questions?authorId=<studentId>` 获取该学生的历史提问列表。

### 2.2 家长权限控制（可选后端加固）

- 当前家长-孩子绑定模型为 `ParentChild`（`parentId` ↔ `childId`）。
- 方案 A（前端控制为主，后端不做额外约束）：
  - 家长端页面仅在已知 `childId` 的上下文中渲染“查看历史提问”入口；
  - 所有历史列表请求均使用 `authorId=childId` 访问，后端仅按 authorId 过滤，不主动区分调用者角色；
  - 优点：改动小；缺点：家长如果通过构造 URL 手动传入其他 studentId，理论上仍可访问（不推荐）。
- 方案 B（后端强约束，推荐）：
  - 在新建的家长端专用接口中增加校验：`GET /api/parent/children/:childId/questions`：
    - 校验 `childId` 是否是当前 parent 的绑定孩子（查 `ParentChild` 表）；
    - 通过后调用 `QuestionService.list({ authorId: childId })` 返回结果；
  - 前端家长端统一访问该接口，而不是通用 `GET /api/questions`；
  - 老师与学生前端继续使用通用列表接口。

> 方案 B 更安全，但实现工作略多。可以先采用方案 A，后续如对家长隐私边界要求更高，再逐步升级为方案 B。

### 2.3 OpenAPI 与文档更新

- 在 `backend/openapi.yaml` 中补充：
  - 对 `GET /api/questions` 的 `authorId` 查询参数说明（标注为“按提问学生过滤”），并注明老师/后台常用场景；
  - 如实现家长专用接口，则补充 `/api/parent/children/{childId}/questions` 条目。
- 在 `helloagents/wiki/modules/backend-questions.md` 中扩展“按学生维度检索问题”的小节，说明：
  - 老师使用场景；
  - 家长使用（如采用方案 B，则记录为 `ParentChild` 约束下的接口）。

## 三、前端方案

### 3.1 新路由：学生历史提问页

- 新增页面组件：`src/pages/StudentHistoryPage.tsx`（命名示例）：
  - 路径：`/student/:studentId/questions`；
  - 从路由参数中读取 `studentId`，可选从 query 或 state 中获取 `studentName` 进行标题展示；
  - 使用 `useQuestions({ authorId: studentId, subject, topic, search })` 拉取数据；
  - 页面结构：
    - 顶部：返回按钮 + 学生昵称（如有）+ “历史提问”标题；
    - 过滤器：可复用 `QuestionFilter`（按科目/考点筛选）；
    - 列表：复用 `QuestionList`，点击列表项跳转到 `/question/:id` 详情页。

### 3.2 头像点击入口接入

- `QuestionCard`：
  - 目前展示作者头像/昵称，但未对头像做统一点击行为；
  - 扩展 props：`onAuthorClick?: () => void`；
  - 在头像与作者名外层包一层 `button` 或 `span`，在有 `onAuthorClick` 时添加 `cursor-pointer` 并绑定点击事件。
- `QuestionList`：
  - 接收 `onAuthorClick?: (question: Question) => void`；
  - 在 map 渲染 `QuestionCard` 时，传递 `onAuthorClick`。
- `HomePage` / `QuestionDetailPage` / 老师后台列表页：
  - 在老师或家长已登录的前提下，为 `onAuthorClick` 传入一个导航函数：
    - 老师：`navigate('/student/' + question.authorId + '/questions')`；
    - 家长：当 `question.authorId` 与当前选中/绑定的 `childId` 一致时才允许跳转，否则不提供点击行为或给出无权限提示。

### 3.3 家长端入口

- 在家长端孩子列表或孩子提问列表页面（如 `ParentQuestionPage` 或家长中心）中：
  - 对孩子头像或名字增加“查看历史提问”按钮或入口；
  - 直接跳转到 `/student/:childId/questions` 或家长专用路由（如 `/parent/children/:childId/questions`），并在页面中复用同一 `StudentHistoryPage` 组件或其内部逻辑。

### 3.4 权限与体验细节

- 若当前用户为学生，点击头像仍可跳转到自己的历史提问页（效果接近现有“我的提问”，可复用逻辑）；
- 若当前用户为未绑定孩子的家长，点击其他学生头像时：
  - 保守方案：不展示可点击态（无 cursor-pointer）；
  - 或点击时报 toast：“只能查看自己孩子的提问记录”。
- 对于匿名或未登录用户，不提供历史列表入口。

## 四、测试策略

### 4.1 后端

- 若采用方案 B，需新增集成测试覆盖：
  - 家长请求 `/api/parent/children/:childId/questions` 且绑定存在 → 200 + 仅返回该 child 的问题；
  - 家长请求未绑定 childId → 403；
  - 老师/学生不应访问该家长专用接口（如有角色限制）。
- 对 `GET /api/questions?authorId=...` 新增至少一个针对“多状态问题混合”的用例，验证 pending/approved/rejected 均可返回。

### 4.2 前端

- 单元/集成测试（Vitest + Testing Library）：
  - `QuestionCard`：当传入 `onAuthorClick` 时，点击头像/作者名会调用该回调；当未传入时不产生点击行为；
  - `StudentHistoryPage`：在 mock API 返回多条数据的情况下，可以正确渲染列表和标题，并在点击某一项时跳转到对应的 `/question/:id`。
- E2E（Playwright）：
  - 老师角色：在首页或老师后台点击某个学生头像，成功跳转到历史列表页，且列表中只包含该学生的问题；
  - 家长角色：在家长端点击已绑定孩子头像可以看到历史问题；尝试点击其他学生头像时不触发跳转或收到无权限提示。

