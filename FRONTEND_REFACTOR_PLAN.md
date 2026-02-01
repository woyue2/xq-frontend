# 前端 API 接入重构计划

**目标**: 移除前端页面对本地 Mock 数据的直接依赖，全面接管至 API 服务层，确保后端接口接入即用。

## 1. 现状评估
目前有 6 个核心页面直接引用了 `mock-data.ts`，导致 API 层的拦截器、Mock 开关和错误处理失效。

## 2. 重构任务清单

### 2.1 核心页面重构 (P0)

#### 📄 问题详情页 `QuestionDetailPage`
- **现状**: `import { mockQuestions, mockComments } from '@/lib/mock-data'`
- **修改**:
  - 使用 `questionService.getQuestionById(id)` 获取详情
  - 使用 `api.get('/questions/:id/comments')` 获取评论
  - 使用 `interactionService.like/favorite` 处理交互
- **注意**: 将 `question.likeCount` 替换为 `question.stats.likes`

#### 📄 创建/编辑问题页 `CreateQuestionPage`
- **现状**: 提交时无任何网络请求，仅 Log 输出
- **修改**:
  - 集成 `questionService.createQuestion(payload)`
  - 集成 `questionService.uploadImage(file)`
  - 添加提交 loading 状态和错误 Toast

#### 📄 登录页 `LoginPage`
- **现状**: 本地验证手机号 `validInviteCodes.includes(...)`
- **修改**:
  - 调用 `authService.sendCode()`
  - 调用 `authService.login()`
  - 移除本地验证逻辑，依赖 API 返回的 code/message

### 2.2 辅助页面重构 (P1)

#### 📄 我的回答页 `MyAnswersPage`
- **目标**: 替换 `mockAnswers` 为 `api.get('/users/me/answers')`

#### 📄 审核排队页 `AuditPage`
- **目标**: 替换 `mockQuestions` 为 `adminService.getAuditList()` (需新增 API 方法)

#### 📄 答题页 `AnswerQuestionPage`
- **目标**: 使用 API 获取题目信息，提交回答使用 `api.post('/questions/:id/answers')`

### 2.3 公共组件与 Hooks (P2)
- **`useQuestions`钩子**: 修复类型 `QuestionParams` -> `QuestionListParams`，完善分页逻辑。
- **Store**: `useAuthStore` 移除对 `mock-data` 的依赖，仅通过 Token 和 API `/auth/me` 恢复状态。
- **UI**: 检查所有组件的 `date` 显示，确保使用了格式化函数。

---

## 3. 验证方案

对于每个重构后的页面：
1. **Mock 模式测试**: 确保 `VITE_USE_MOCK=true` 时页面行为与之前一致。
2. **网络观察**: 在 DevTools Network 面板能看到 `/api/xxx` 请求。
3. **API 响应处理**: 模拟 API 报错（如 500），验证页面 Toast 是否弹出。

## 4. 执行顺序
1. `src/hooks/useQuestions.ts` (修复类型基础)
2. `QuestionDetailPage` (读操作最复杂)
3. `CreateQuestionPage` (写操作最核心)
4. `LoginPage` (入口)
5. 其他页面
