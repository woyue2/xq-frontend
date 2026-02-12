# 老师/家长点击学生头像查看历史提问 - 任务清单

## 后端（如采用家长专用接口方案）

- [-] Question 列表接口文档补充
  - [-] 在 `backend/openapi.yaml` 中为 `GET /api/questions` 补充分页与 `authorId` 参数说明
  - [-] 在 `helloagents/wiki/modules/backend-questions.md` 中记录“按学生维度检索问题”的使用方式
- [ ] （可选）家长专用历史问题接口
  - [ ] 在 `backend/src/routes/parent.routes.ts` 中新增 `GET /api/parent/children/:childId/questions`
  - [ ] 校验当前登录用户为 parent 且与 childId 存在绑定关系
  - [ ] 调用 `QuestionService.list({ authorId: childId })` 返回结果
  - [ ] 补充对应集成测试用例

## 前端路由与页面

- [√] 新增学生历史提问页面
  - [√] 创建 `src/pages/StudentHistoryPage.tsx`，根据 `studentId` 使用 `useQuestions({ authorId: studentId, ...filters })` 加载数据
  - [√] 顶部展示学生昵称/ID 与“历史提问”标题
  - [√] 复用 `QuestionFilter` 与 `QuestionList` 渲染列表，点击列表项跳转问题详情
  - [√] 在路由配置（如 `src/App.tsx`）中注册 `/student/:studentId/questions` 路由

## 前端入口与交互

- [√] QuestionCard 头像点击回调
  - [√] 为 `QuestionCard` 增加 `onAuthorClick` props，并在头像/名片区域绑定点击
  - [√] 为 `QuestionList` 增加 `onAuthorClick(question)`，向下传递至 `QuestionCard`
  - [√] 在 `HomePage` 中，当当前用户为老师或家长时，注入对应的跳转逻辑（家长首页使用提示文案，不直接越权跳转）
- [√] 问题详情页入口
  - [√] 在 `QuestionDetailPage` 的作者信息区域为头像/昵称增加“查看历史提问”点击行为
  - [√] 复用与首页相同的导航逻辑
- [√] 老师后台入口
  - [√] 在老师后台审核列表页面（`AuditPage`）中，为学生姓名增加跳转到历史提问页的链接（`data-testid="audit-question-author"`）
  - [√] 在白名单管理页（`AdminManagementPage`）中，对已注册学生白名单记录提供“点击姓名头像 → /student/:userId/questions”入口（仅在存在 `userId` 时展示）

## 家长端集成

- [√] 孩子列表/孩子提问列表入口
  - [√] 在家长端孩子列表页面中，为每个孩子提供“查看提问”入口（跳转孩子提问列表页）
  - [√] 路由跳转到 `/parent/questions/:childId`，并在页面中复用 `QuestionFilter` 与 `QuestionList`
  - [√] 仅对绑定孩子展示入口，未绑定学生不会出现在“我的孩子”列表中

## 测试与回归

- [-] 后端测试（如实现家长专用接口）
  - [-] 集成测试覆盖 parent-child 绑定校验与 authorId 列表行为
- [-] 前端单元/集成测试
  - [-] 覆盖 `QuestionCard`/`QuestionList` 的头像点击行为
  - [-] 覆盖 `StudentHistoryPage` 渲染与路由跳转
- [√] Playwright E2E
  - [√] 老师角色：点击学生头像 → 跳转历史提问页 → 再跳转问题详情（`tests/e2e/student-history-from-avatar.spec.ts`）
  - [√] 家长角色：通过“我的孩子”入口 → 跳转孩子提问列表页 → 再跳转问题详情（`tests/e2e/parent-flow.spec.ts`）
