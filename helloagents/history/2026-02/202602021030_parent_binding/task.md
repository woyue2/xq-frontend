# 任务清单

- [ ] **Task 1: 实现家长注册绑定流程**
  - 修改 `src/pages/LoginPage.tsx`，处理 `PARENT2024` 逻辑。
  - 实现绑定表单与模拟验证码交互。
- [ ] **Task 2: 实现家长个人中心管理**
  - 修改 `src/pages/ProfilePage.tsx`，添加「我的孩子」模块。
  - 实现获取孩子列表与解绑UI。
- [ ] **Task 3: 实现孩子提问查看页**
  - 创建 `src/pages/ParentQuestionPage.tsx`。
  - 配置路由 `/parent/questions/:childId`。
  - 复用 `QuestionList` 组件。
- [ ] **Task 4: 接口服务层实现**
  - 在 `src/services` 中添加 `parentService.ts`。
  - 封装 `/api/v2/parent/...` 请求。
- [ ] **Task 5: 测试与文档**
  - 编写 Jest 单元测试。
  - 更新 `API_INTEGRATION.md`。
