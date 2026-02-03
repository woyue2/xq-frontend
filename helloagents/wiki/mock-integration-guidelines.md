# Mock 功能与真实数据库联调规范

> 目标：统一前端 Mock 使用规则与真实数据库联调方式，避免在联调 / 测试 / 生产环境中误用 Mock 或后端“降级路径”，确保端到端行为与数据一致。

## 一、适用范围与基本原则

- 适用范围：
  - 本地开发联调真实后端；
  - 测试环境 / CI 中运行单测与 E2E；
  - 预发 / 生产环境的真实用户流量。
- 基本原则：
  - Demo / 纯前端演示场景可以使用 Mock，但**不得与真实数据库联动**；
  - 只要需要观察真实数据库行为（包括本地联调、E2E、测试环境、生产），必须关闭 Mock 并走真实接口；
  - 后端“降级逻辑”仅允许在开发 / 测试环境下存在，生产环境禁止“看起来成功但数据库无记录”的行为。

## 二、全局 Mock 开关与环境约定

- 开关来源：`import.meta.env.VITE_USE_MOCK`。
- 统一工具：`src/lib/mock-env.ts`
  - 导出 `USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'`；
  - 当 `import.meta.env.PROD === true && USE_MOCK === true` 时在控制台输出明显警告，提示“所有接口均可能被 Mock，真实后端不会被访问”。
- 推荐约定：
  - 本地纯前端 Demo / 设计走查：`VITE_USE_MOCK=true`，可通过 `mock-data.ts` / diagnostic 页面体验完整流程，但不依赖真实数据库；
  - 本地联调真实后端（含开发者自测）：`VITE_USE_MOCK=false`；
  - 测试环境 / CI（单元测试 + E2E）：默认 `VITE_USE_MOCK=false`，仅在极少数需要隔离后端的单测中使用 Mock 拦截；
  - 预发 / 生产环境：必须保证 `VITE_USE_MOCK=false`。

## 三、仍依赖 Mock 的前端功能清单

> 以下内容用于标记“仍依赖前端 Mock 或本地状态”的模块，便于后续逐步改造为真实接口。状态以“当前实现”为准，后续改造完成后需要同时更新本清单与 `去除Mock改造清单.md`。

### 1. 问题详情页（QuestionDetailPage）

- 文件：`src/pages/QuestionDetailPage.tsx`
- 当前行为（摘要）：
  - 问题详情：
    - 首选从 `useQuestions` 提供的列表缓存中读取（利于前端单测与性能）；
    - 若缓存不存在，则通过 `questionService.getQuestionById` 调用真实后端；
    - 兜底：从 `mockQuestions` 中查找对应问题，保证在纯前端演示场景下也有数据。
  - 回答列表：
    - 初始值来自 `mockAnswers`；
    - 随后通过 `answerService.listByQuestion` 拉取真实后端数据，在本地答案为空时覆盖；
  - 评论列表：
    - 初始值来自 `mockComments`；
    - 当 `VITE_USE_MOCK !== 'true'` 且存在问题 ID 时，通过 `commentService.listByQuestion` 拉取真实后端数据，并在本地为空时覆盖。
- 评论发布：
  - 评论发布逻辑位于 `QuestionDetailPage` 内（`handleSubmitComment`），当前实现仍主要以本地状态为主；
  - 后续改造目标：使用 `commentService.create` / `POST /api/questions/:id/comments` 将评论持久化到数据库，并遵循审核流程与 AI 回调路径。

### 2. 我的回答 / 我的点赞 / 我的收藏 / 通知中心

- 我的回答：
  - 文件：`src/pages/MyAnswersPage.tsx`
  - 当前已通过 `profileService.getMyAnswers` 对接后端 `/api/profile/my-answers`，仅在 Vitest 中通过 `vi.mock('@/services/api')` 注入假数据；
  - 页面内部对 `user.role !== 'teacher'` 做了守卫，学生/家长访问时直接提示并跳回个人中心，避免误解为“所有角色都有回答列表”。
- 我的点赞：
  - 文件：`src/pages/MyLikesPage.tsx`
  - 已接入 `profileService.getMyLikes` → `/api/users/me/likes`，不再使用本地 `mockLikedQuestions`；
  - 在 `useEffect` 中要求用户已登录，否则重定向 `/login`，保证列表始终与真实数据库中“我的点赞”一致。
- 我的收藏：
  - 文件：`src/pages/MyFavoritesPage.tsx`
  - 已接入 `profileService.getMyFavorites` → `/api/users/me/favorites`，不再依赖本地 `mockFavoriteQuestions`；
  - 与“我的点赞”一样，未登录访问会被重定向登录页。
- 通知中心：
  - 文件：`src/pages/NotificationsPage.tsx`
  - 通过 `notificationService.getNotifications/markAsRead` 对接 `/api/notifications` 与 `/api/notifications/read`，并基于 `Notification.content` 中的 `answerId` JSON 解析跳转到带回答定位的详情页；
  - 仅允许已登录用户访问，未登录访问时提示“请先登录”并重定向 `/login`，以免“通知中心”在无用户身份的情况下访问真实后端。

### 3. 公共 Mock 数据与诊断工具

- 文件：`src/lib/mock-data.ts`
  - 定义 `mockUsers` / `mockQuestions` / `mockAnswers` / `mockChildren` 等，用于登录 Demo、问题列表 Demo、家长端 Demo、“我的回答”等；
  - 在 `VITE_USE_MOCK=true` 场景下可以被前端页面直接使用，用于完全脱离后端的静态演示。
- 文件：`src/lib/test-runner.ts`
  - 提供若干“前端自测场景”，基于 mock 数据驱动纯前端诊断流程；
  - 仅用于本地调试与诊断，不参与生产流量。
- 规范要求：
  - 不得在生产 / 联调环境中依赖 `mock-data` 作为主数据源；
  - 新增页面如需引入 Mock 数据，必须显式受 `USE_MOCK` 控制，并在对应模块文档中说明用途与限制。

## 四、后端降级逻辑与环境收紧

> 详细实现以 `backend/src/services/auth.service.ts` 等代码与相关测试为准，本节仅给出规范性要求。

### 1. 登录验证码（sendCode）

- 早期实现曾对 `verificationCode` 表的写入使用“静默吞错”策略，导致在数据库异常时仍返回“发送成功”；
- 当前规范：
  - 发送验证码失败（包括数据库错误、第三方服务异常）时必须返回 5xx 或明确错误码，前端不得误判为“发送成功”；
  - 相关行为已通过单元测试覆盖，禁止再引入新的“静默吞错”路径。

### 2. 注册与 RefreshToken 持久化

- 早期实现中，`AuthService.register` 在创建用户或保存 RefreshToken 失败时会构造“内存用户”并仍然返回 token；
- 当前规范：
  - 在 `NODE_ENV === 'production'` 环境，注册过程中一旦出现数据库异常，必须返回 5xx 错误，不允许“内存降级”；
  - 在 `development/test` 环境允许有限的降级逻辑，以便在本地缺少数据库或迁移未完成时完成前端联调；
  - 相关环境与行为已在 `helloagents/wiki/modules/backend-auth.md` 中同步描述，代码修改需保持两者一致。

### 3. 白名单与 RefreshToken 检查

- 白名单查询与 RefreshToken 校验中仍存在部分 `try/catch` 降级逻辑，用于在开发环境下容忍表结构缺失或局部错误；
- 规范要求：
  - 生产环境中应尽量减少这类降级分支，并通过监控与日志快速暴露问题；
  - 在新增降级逻辑时，必须在日志中标记 `mode: 'degraded'`，并在对应模块文档与本规范中补充说明。

## 五、E2E 测试与联调规范

- E2E 测试框架：Playwright（配置文件 `playwright.config.ts`）。
- 统一运行方式：
  - 命令：`npm run test:e2e`；
  - `playwright.config.ts` 中的 `webServer.env` 已强制设置 `VITE_USE_MOCK: 'false'`，确保 E2E 流程总是走真实后端接口，而不是前端 Mock。
- 规范要求：
  - 新增 E2E 用例时，应优先覆盖真实接口路径（如登录、提问、点赞/收藏、白名单管理等），不要仅验证 Mock 行为；
  - 如确需在 E2E 中使用 Mock（例如后端尚未实现的实验性功能），必须在用例名称与注释中显式标明，并在本规范中补充说明。

## 六、维护流程与协同约定

为避免“清单与规范文档长期脱节”，对 Mock 改造相关的维护流程做如下要求：

1. 当完成某一块 Mock 改造（例如“我的点赞改造为真实接口”、“评论发布接入后端”）时：
   - 更新 `去除Mock改造清单.md` 中对应条目的描述与状态；
   - 更新本文件对应章节（例如将“仍依赖 Mock”的说明调整为“已接入真实接口，并仅在 VITE_USE_MOCK=true 时回退到 Mock”）。
2. 如对后端降级逻辑进行调整：
   - 同步更新 `helloagents/wiki/modules/backend-auth.md`、相关模块文档与本规范中的描述；
   - 在 `helloagents/CHANGELOG.md` 中记录变更，明确“对哪些环境收紧 / 放宽了降级策略”。
3. 在引入新的 Mock 工具或 Demo 页面时：
   - 必须在本规范中登记用途、适用环境与关闭方式；
   - 确保在联调 / 生产路径中不会意外走到该 Mock 逻辑。

本规范将作为“去除 Mock 与接入真实数据库”工作的唯一规范性文档，与 `去除Mock改造清单.md` 形成“规范 + 清单”的双向维护关系。
