# Mock 使用与去除改造 TODO

> 说明：本文件跟踪前端/后端中与 Mock 相关的遗留点，作为《去除 Mock 与接入真实数据库改造清单》的执行补充记录。

## 1. 运行时代码中的 Mock 现状

- `src/services/api.ts`
  - 仍导入 `mockQuestions/mockUsers/mockChildren`，但仅在 `USE_MOCK === true && import.meta.env.MODE === 'test'` 时启用 axios Mock 拦截，用于前端单测与本地纯前端演示。
  - 在 `VITE_USE_MOCK=false` 场景（联调 / E2E / 生产）下，所有核心接口（登录、提问、审核、点赞/收藏、评论、通知等）均走真实后端。

- `src/pages/QuestionDetailPage.tsx`
  - 运行时代码仅使用 `userLikes/userFavorites` 作为点赞/收藏初始本地状态；
  - 评论与回答列表全部依赖真实后端：
    - 问题详情：`questionService.getQuestionById`；
    - 回答列表：`answerService.listByQuestion`；
    - 评论列表：`commentService.listByQuestion`；
    - 评论提交：`commentService.create` + `behaviorService.log('question_comment', ...)`；
  - `mockAnswers/mockComments` 仅在测试文件中通过 `vi.mock('@/lib/mock-data', ...)` 间接使用。

- `src/pages/LoginPage.tsx`
  - 不再根据 `USE_MOCK` 分支，统一通过 `authService.sendCode/login/passwordLogin/register` 与后端交互；
  - 仅复用 `validInviteCodes` 常量校验邀请码格式，本身不触达后端数据。

- “我的点赞 / 我的收藏 / 我的回答”
  - `MyLikesPage` / `MyFavoritesPage` / `MyAnswersPage` 均已通过 `profileService.getMyLikes/getMyFavorites/getMyAnswers` 调真实后端，列表数据不再依赖前端 mock。

## 2. 仅限测试 / 调试场景的 Mock

- `src/lib/mock-data.ts`
  - 保留 `mockUsers/mockQuestions/mockChildren/mockAnswers/mockComments/validInviteCodes` 作为单测与 Demo 数据源；
  - 所有运行时页面（非 Storybook / 非测试）已避免直接依赖 mock 问答/评论列表。

- `src/lib/test-runner.ts`
  - 仅用于本地调试与自测场景，基于 `mockQuestions/mockUsers` 模拟前端链路；
  - 与生产构建和 E2E 无直接关联。

- 测试文件（示例）
  - `src/test/comprehensive.test.tsx` / `src/test/integration*.test.tsx` / `tests/e2e/*.spec.ts` 等，通过 `vi.mock('@/lib/mock-data', ...)` 或 HTTP 直连后端构造测试数据；
  - 所有这类 Mock 使用仅限测试环境，不影响真实链路。

## 3. 后续可以考虑的优化 TODO（非必做）

1. 如未来引入 Storybook：
   - 为 `QuestionDetailPage` / `ProfilePage` / “我的 xxx 列表” 等页面提供 Storybook stories，统一从 `mock-data.ts` 获取演示数据，而不是在页面内部引入 mock。

2. Mock 配置集中化：
   - 若后续增加新的前端 Mock 入口，优先通过 `mock-env.ts` + `api.ts` 的 axios Mock 层接入，避免在页面组件中出现新的 `USE_MOCK` 分支。

3. 文档同步：
   - 如再对 Mock 行为进行调整（例如新增/删除 Mock 场景），需同步更新：
     - `去除Mock改造清单.md`；
     - `helloagents/wiki/mock-integration-guidelines.md`；
     - 本 `mock-refactor-todo.md`。

