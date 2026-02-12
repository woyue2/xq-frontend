## 前端关键业务与后端真实接入方案（WHY）

> 目标：将提问 / 回答 / 评论 / 点赞 / 收藏等关键业务页从 Mock 数据切换到真实后端服务，同时补齐「图片压缩 + 直传上传」链路，并在登录流程中明确白名单策略，整体遵循结构化编程与统一错误处理 / 日志规范，为后续功能扩展提供稳定基础。

### 一、问题与动机

结合当前代码与既有方案文档（`helloagents/history/2026-02/*_backend-core`、`helloagents/plan/backend-route-diff.md`、`helloagents/plan/image-compress-upload.md`、`src/services/api.ts`、`src/pages/*`）可以看到：

- 关键业务页仍大量使用 Mock 数据：
  - `CreateQuestionPage` / `AnswerQuestionPage` / `QuestionDetailPage` 中的提问、回答、评论、点赞、收藏等操作，多数只更新本地 state 或使用随机图片 URL；
  - 列表类页面（如 `MyQuestionsPage`、`MyAnswersPage`、`MyLikesPage`、`MyFavoritesPage`）部分已经通过 `useQuestions` 等 Hook 使用真实接口，但交互统计和局部状态仍依赖 Mock。
- 图片上传链路尚未真实打通：
  - 后端提供了 `GET /api/upload/signature` 签名接口，但前端 `questionService.uploadImage` 目前只“取签名并拼一个理论上的 URL”，未做真实直传；
  - 统一压缩为 JPG、文件大小 <1MB、保证题目清晰度等要求已在 `image-compress-upload.md` 中设计，但尚未落地到可复用的工具函数与业务集成点。
- 登录与白名单策略存在潜在不一致：
  - `authService.sendCode` 在 `type='register'` 时强制白名单检查，但登录流程仅依赖验证码 + 用户存在 + `isActive / isBanned`，未对「白名单状态 / 课时有效期」进行统一约束；
  - 前端 `isMemberActive` 以 `expiresAt` 为准，部分页面在提交前做会员有效性校验，两端策略存在一定“脱节”。

在即将从 Mock 过渡到真实后端的阶段，如果不先设计一套统一的集成方案，将面临：

- 不同页面各自实现数据请求与状态管理，产生「多套逻辑」和难以维护的分支；
- 图片上传在不同场景里各自实现压缩 / 上传，逻辑重复且容易出现文件大小和清晰度不一致的问题；
- 登录白名单策略不透明，出现“有的人能登录但没有课时 / 超出运营预期”的情况，排查成本高。

### 二、本方案要解决的核心问题

1. **关键业务页从 Mock 平滑迁移到真实后端**
   - 将提问 / 回答 / 评论 / 点赞 / 收藏等操作整理为清晰的数据访问层（service + hooks），UI 层只关心数据与事件，不直接操作 Mock；
   - 在保持 `USE_MOCK` 开关能力的前提下，在“真实模式”下统一走 `questionService` / `interactionService` / `behaviorService` 等 API 封装。

2. **统一的图片压缩与直传上传链路**
   - 基于 `image-compress-upload.md` 的设计，新增独立的 `imageCompress` 工具模块与 `uploadClient` 模块；
   - 统一实现：选择图片 → 压缩（转 JPG、限制最大边长、<1MB）→ 请求签名 → 直传存储 → 返回 URL → 各业务页面复用；
   - 明确清晰度与失败处理策略，避免“压得过狠”和“压不下去也无提示”的情况。

3. **登录与白名单/课时策略统一**
   - 在后端 `AuthService.login` 中设计可配置的白名单策略（例如通过环境变量控制是否在登录时强制要求白名单存在且未被删除）；
   - 结合 `expiresAt` 与 `isActive`，统一定义“可登录”与“可提问/回答/评论”的判定逻辑，并与前端 `isMemberActive` / 权限系统对齐；
   - 给运营留出灵活性：例如在测试环境可以关闭严格白名单，在生产环境开启。

4. **结构化编程与统一错误处理 / 日志规范的前端落地**
   - 前端新增或改造的模块遵循结构化编程规范（顺序 / 选择 / 循环，避免非结构化跳转），为关键函数定义前置条件 / 后置条件 / 异常分支；
   - 收敛前端错误处理：以 Axios 拦截器 + 明确的错误返回契约为核心，业务层不再各自“try-catch + toast”；
   - 为新增数据层与上传模块编写单元测试，重点覆盖错误分支和超时 / 超限场景。

### 三、作用范围与边界

- 涉及的前端页面与模块：
  - 页面：`CreateQuestionPage`、`AnswerQuestionPage`、`QuestionDetailPage`、`MyQuestionsPage`、`MyAnswersPage`、`MyLikesPage`、`MyFavoritesPage`；
  - 服务与工具：`src/services/api.ts` 中 question/interaction/upload 相关封装，新增 `src/lib/image-compress.ts` 与 `src/lib/upload-client.ts`（命名暂定）；
  - 状态与权限：`useAuthStore`、`isMemberActive`、与问题 / 回答列表 Hook（如 `useQuestions`）的集成方式。
- 涉及的后端模块（配合性改造）：
  - 认证与白名单：`backend/src/services/auth.service.ts`、`backend/src/services/whitelist.service.ts` 及相关集成测试；
  - 互动模块与行为埋点：在本方案中主要作为前端真实接入的依赖，若路由合同进一步调整，将依赖 `helloagents/plan/202602022230_contract-consistency`。
- 不在本轮方案直接覆盖的内容：
  - 完整重写所有历史页面样式与交互，仅对关键业务链路（提问/回答/评论/点赞/收藏 + 登录 + 上传）做结构化调整；
  - 调整生产部署架构与外部存储服务（默认沿用现有“浮窗/OSS + URL 展示”的思路）。

### 四、成功标准

在本方案所对应的实现与测试完成后，视为成功的标准包括：

1. **功能完整性**
   - 提问 / 回答 / 评论 / 点赞 / 收藏在“真实模式”（`USE_MOCK=false`）下全部依赖后端 API，Mock 仅在开发 / Demo 模式下使用；
   - 提问、回答、评论中的图片上传统一走“压缩 → 签名 → 直传 → URL 回填”链路，文件大小 <1MB 且题目内容清晰可读。
2. **策略与权限一致性**
   - 登录白名单策略在后端有明确实现（或配置开关），前端提示与错误码（如 4001/4003）对齐；
   - 提问 / 回答 / 评论权限在前后端对“会员有效期 / 白名单状态”的判断逻辑一致，避免出现“前端允许但后端拒绝”的常见坑。
3. **结构化与可维护性**
   - 新增/改造模块遵循结构化编程规范（函数契约明确、控制流清晰、模块职责单一），并在 `helloagents/wiki` 中有相应设计记录；
   - 上传 & 数据访问逻辑被抽离为可复用模块，后续新增业务场景（比如作业批改图片）可以直接复用。
4. **测试与质量保障**
   - 为上传模块、关键数据 Hook、登录策略判定函数等编写单元测试，覆盖典型成功 / 失败 / 边界分支，相关模块分支覆盖率 ≥ 85%；
   - 前端与后端测试全部通过，回归检查未发现因 Mock→真实或策略调整导致的核心功能退化。

