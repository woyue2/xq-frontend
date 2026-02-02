## 前端关键业务与后端真实接入方案（HOW）

> 说明：本 HOW 文档从模块划分出发，将“Mock→真实 API 切换”“图片压缩+上传”“登录白名单策略”三个方向拆解为可落地的结构化编程实现方案，并明确后续开发阶段的接口与测试要求。

### 一、整体设计与模块划分

1. **数据访问层（services + hooks）**
   - `src/services/api.ts`：
     - 继续作为统一 Axios 封装层，负责：
       - 请求拦截（token 注入、请求 ID、客户端版本标识）；
       - 响应统一错误处理（配合已有拦截器与 `toast` 机制）；
       - 具体业务 service：`authService` / `questionService` / `interactionService` / `behaviorService` / `notificationService` / `adminService` 等。
     - 在本方案中重点改造：
       - `questionService.createQuestion/getQuestionById/getQuestions`：作为提问、详情、列表页的数据源；
       - `questionService.uploadImage`：改造为“压缩后文件 → 获取签名 → 直传存储 → 返回 URL”的完整封装；
       - `interactionService.like/favorite`：与后端最终约定的 `/api/interactions/*` 或 `/api/questions/:id/*` 路由对齐（依赖合同一致性方案）。
   - 新增/强化数据 Hook：
     - `src/hooks/useQuestions.ts`：继续提供问题列表分页能力，保证在“我的提问 / 首页 / 优质问题”场景复用；
     - 新增 `useQuestionDetail(questionId)` 钩子：
       - 统一拉取单题详情 + 关联的回答 / 评论列表；
       - 统一提供点赞、收藏、评论提交等方法，页面层只通过 Hook 暴露的接口进行调用。

2. **图片压缩与上传模块**
   - `src/lib/image-compress.ts`：
     - 提供通用压缩函数：
       - `compressImage(file: File, options?: { maxWidth?: number; maxHeight?: number; maxSizeKB?: number; initialQuality?: number; minQuality?: number }): Promise<File>`;
     - 结构化实现流程：
       1. 参数与浏览器环境前置校验（@pre）；
       2. 顺序执行：读取文件 → 创建 Image → 等比例缩放绘制到 `<canvas>`；
       3. 循环控制质量：从 `initialQuality` 开始调用 `canvas.toBlob(..., 'image/jpeg', quality)`，若 `blob.size` 大于 `maxSizeKB`，逐步降低质量（不低于 `minQuality`），循环终止条件清晰；
       4. 选择结构处理异常：若多次尝试仍 >1MB，则抛出自定义错误（例如 `ImageTooLargeError`），由调用方统一处理。
   - `src/lib/upload-client.ts`：
     - 与 `helloagents/plan/image-compress-upload.md` 中的设计对齐，拆分为两层：
       - `getUploadSignature(type: 'image' | 'audio')`：调用 `GET /api/upload/signature` 并返回 `{ uploadUrl, key, policy, signature, expireAt, ... }`；
       - `uploadFileWithSignature(file: File, signature: UploadSignature): Promise<{ url: string }>`：
         - 内部使用 `fetch` 或 Axios 直传到 `uploadUrl`，表单字段按后端/浮窗约定构造；
         - 明确成功 / 失败返回值与错误类型（例如 `UploadFailedError`），供业务层统一捕获。
     - `questionService.uploadImage` 最终只负责 orchestration：
       1. 调用 `compressImage`；
       2. 请求签名；
       3. 调用 `uploadFileWithSignature`；
       4. 返回最终 URL。

3. **登录与白名单策略模块**
   - 后端 `AuthService`：
     - 保持现有 `sendCode/login/register/refreshToken/logout/me` 接口，但对登录路径增加「白名单策略检查」能力；
     - 引入配置项（示意）：
       - 环境变量 `AUTH_STRICT_WHITELIST_FOR_LOGIN`（true/false，默认 false），在生产环境建议开启；
       - 可选：将策略枚举化，例如 `AUTH_WHITELIST_MODE = 'register-only' | 'login-and-register'`。
     - 在 `login` 流程中：
       - 在验证码与用户存在检查之后，增加白名单校验逻辑：
         - 若开启严格模式：
           - 对应手机号必须存在未删除的 `userWhitelist` 记录；
           - 若不存在或已被删除：抛出 `AppError(403, 'NOT_IN_WHITELIST', ..., 4001)`；
         - 若存在记录但 `validUntil` 早于当前时间：可视为课时已过期，结合 `4004` 错误码与 `isActive` 字段进行处理；
       - 同步记录登录日志，以便后续运营判断白名单策略效果。
   - 前端权限与提示：
     - `isMemberActive` 与 `getUserPermissions` 继续作为中心权限工具；
     - 在登录失败时，基于后端返回的 `code` 与 `message` 提示用户：
       - `4001`：提示“尚未开通权限 / 不在白名单”；
       - `4003`：提示“账号已被停用”；
       - `4004`：提示“课时已过期”，并可引导联系老师续费。

### 二、关键业务页从 Mock 切换到真实服务

1. **CreateQuestionPage（提问页）**
   - 当前状态：
     - 使用 `mockQuestions` 做“相似问题推荐”；
     - 图片上传使用随机 Unsplash URL 模拟；
     - 提交仅构造 payload + toast，不调用后端。
   - 目标状态：
     - 模拟提交 → 调用 `questionService.createQuestion`；
     - 图片上传：
       - 点击上传按钮 → 触发 `<input type="file" accept="image/*">`；
       - 对用户选择的文件调用 `compressImage`，再通过 `questionService.uploadImage` 获得 URL；
       - 将 URL 写入 `images[]`，作为提交 payload 的一部分；
     - 相似问题推荐：
       - 在真实模式下，可以用 `questionService.getQuestions` + `search/title` 参数替代 Mock 过滤；
       - 在 Mock 模式下保留现有逻辑。

2. **AnswerQuestionPage（回答页）**
   - 当前状态：
     - 使用本地 state + Mock 数据记录回答内容和图片；
     - 未实际调用后端创建回答接口。
   - 目标状态：
     - 引入 `answerService` 或在 `questionService` 中扩展回答相关方法（视后端路由命名而定，如 `POST /questions/:id/answers`）；
     - 回答图片上传流程完全复用 `compressImage` + `questionService.uploadImage`；
     - 权限校验：
       - 仅教师可回答（当前逻辑已存在，但需要与后端角色字段对齐）；
       - 调用前检查 `isMemberActive` 与登录状态。

3. **QuestionDetailPage（问题详情页 + 评论）**
   - 当前状态：
     - 通过路由参数在 `mockQuestions` 中查找问题；
     - 点赞 / 收藏按钮只更新本地 liked/favorited 状态并 toast；
     - 评论列表与新增评论完全本地管理。
   - 目标状态：
     - 数据源：
       - 使用 `useQuestionDetail(questionId)` 钩子，从后端获取问题详情 + 回答列表 + 评论列表；
       - 钩子内部调用 `questionService.getQuestionById` 以及对应的评论 / 回答接口；
     - 点赞 / 收藏：
       - 点击事件调用 `interactionService.like/favorite`；
       - 基于返回的 `liked/favorited` 与计数更新本地状态；
     - 评论提交：
       - 通过 commentService（可挂在 questionService 或独立 service）调用 `POST /questions/:id/comments`；
       - 评论图片上传沿用统一链路；
     - 保留行为埋点（如浏览问题/点击点赞）的调用机会，通过 `behaviorService.log` 记录关键行为。

4. **我的列表页（MyQuestions/MyAnswers/MyLikes/MyFavorites）**
   - `MyQuestionsPage`：
     - 已使用 `useQuestions({ authorId })` 接入真实问题列表；
     - 需要确认分页参数与后端契约一致，并在无数据时展示“去提问”引导；
   - `MyAnswersPage`：
     - 目前通过 `mockAnswers` + `mockQuestions` 拼合数据；
     - 目标改造为调用真实“我的回答”接口（如 `/api/users/me/answers` 或 `/api/answers?authorId=me`，视后端合同而定）；
   - `MyLikesPage` / `MyFavoritesPage`：
     - 目前基于 Mock 数据 + 本地状态；
     - 目标为接入后端“我的点赞/收藏”接口（如 `/api/users/me/likes`、`/api/users/me/favorites` 或 `/api/interactions/my-*`），具体路径与 `contract-consistency` 方案对齐。

### 三、图片压缩与上传流程细化

1. **压缩策略细节（参考 `image-compress-upload.md`）**
   - 最大边长控制：
     - 默认 `maxWidth = maxHeight = 1600`，对超过该尺寸的图片按长边等比缩放；
   - 质量调整：
     - 初始质量 `initialQuality ≈ 0.85`，每次降低 0.05，最低不低于 `minQuality ≈ 0.6`；
   - 大小限制：
     - `maxSizeKB = 1024`，若压缩后仍 >1MB：
       - 可选方案：
         - 继续降低分辨率（再缩小宽高）；
         - 或直接抛出错误，由页面提示用户“图片过大，请裁剪后再试”；
   - 清晰度要求：
     - 为题目内容（文字/图像）保留足够清晰度，避免过度模糊；
     - 建议在测试阶段准备几组典型试卷照片，手动验证清晰度与加载速度。

2. **上传失败与重试策略**
   - `uploadFileWithSignature` 需要处理：
     - 网络错误 / HTTP 非 2xx：抛出带有状态码/错误码信息的错误对象；
     - 超时：在前端增加合理的超时处理与一次重试机制（例如最多重试 1 次）；
   - 业务层处理：
     - 为不同错误场景给出清晰提示（网络问题 vs 权限问题 vs 文件问题）；
     - 日志记录：
       - 在开发环境，可以将失败的签名 / 响应体输出到 console；
       - 在生产环境建议通过行为埋点记录上传失败事件，便于统计。

### 四、登录白名单策略设计

1. **策略选型**
   - 方案 A（当前部分实现）：仅在注册验证码发送阶段校验白名单，登录只检查用户存在 + 状态；
   - 方案 B（推荐）：在登录阶段也强制白名单存在，且结合 `validUntil` / `expiresAt` 控制“是否仍为有效会员”；
   - 方案 C：通过环境变量控制模式，在开发/测试环境使用 A，在生产使用 B。
   - 本方案建议：
     - 后端实现 C 模式（带开关），默认配置与现有测试用例兼容；
     - 前端只根据错误码与 message 提示，不直接实现复杂策略，以减少耦合。

2. **后端实现要点**
   - 在 `AuthService.login` 中：
     - 加入白名单查询逻辑（在确认 `user` 存在之后）：
       - 严格模式下要求存在 `userWhitelist` 记录，且未被软删除；
       - 若记录存在但 `validUntil` 早于当前时间：
         - 可以更新用户 `isActive = false`；
         - 抛出 `AppError(403, 'CLASS_HOUR_EXPIRED', '课时已过期', undefined, 4004)`；
     - 与 `user.isActive` 字段保持一致，避免出现状态不一致。

3. **前端体验与引导**
   - 在登录页 / 提问页等场景中：
     - 根据响应中的 `code` 输出明确文案；
     - 对 `4004` 场景，可以在 UI 上提供“联系老师续费”的按钮或提示；
   - 登录成功后：
     - `useAuthStore` 存储用户信息与 token；
     - 全局 Nav / 入口按钮根据权限与 `isMemberActive` 控制可见性。

### 五、结构化编程与测试策略

1. **函数契约与控制流规范**
   - 为以下关键函数编写简单的 JSDoc / 注释契约（@pre/@post/@throws）：
     - `compressImage`、`uploadFileWithSignature`、`questionService.uploadImage`；
     - `useQuestionDetail` 中暴露的关键方法（如 `likeQuestion`, `favoriteQuestion`, `submitComment`）；
     - 登录策略判断函数（如 `shouldAllowLogin(user, whitelistRecord, envConfig)`，如果抽象出来）。
   - 控制流：
     - 主要使用顺序 / 选择 / 循环三种结构，避免深层嵌套与隐式异常控制主流程；
     - 对于多分支逻辑，优先写成早返回 + 清晰的 if/else 块，并在必要处拆分为子函数。

2. **测试覆盖策略**
   - 前端单测（Vitest + React Testing Library）：
     - 为 `image-compress` 和 `upload-client` 写独立单元测试：
       - 正常压缩 + 上传成功路径；
       - 文件过大压缩失败路径；
       - 上传网络错误 / 超时路径；
     - 为 `useQuestionDetail` 编写 Hook 级测试：
       - 加载成功 / 加载错误；
       - 点赞 / 收藏调用正确的 API，并更新本地状态；
       - 评论提交成功后列表更新。
   - 后端单测（Jest）：
     - 为 `AuthService.login` 新增/扩展测试：
       - 正常登录成功；
       - 不在白名单 / 白名单已删除；
       - 白名单存在但课时过期；
       - 配置开关不同模式下的行为。
   - 覆盖率目标：
     - 对上述新增/修改模块设置局部覆盖率门槛：分支 / 语句 ≥ 85%；
     - 在 CI 或本地脚本中输出覆盖率报告，供 HelloAGENTS 知识库记录。

3. **文档与知识库同步**
   - 在本方案执行完成后，更新：
     - `helloagents/wiki/modules/frontend-integration.md`（或类似命名），记录：
       - Mock→真实切换的整体结构；
       - 上传模块与登录策略的关键设计；
     - `helloagents/CHANGELOG.md`：增加“前端关键业务与后端真实接入”条目；
     - 如有需要，在 `codex-develop-doc` 中补充前端部署与环境变量说明（如 `VITE_USE_MOCK`、`AUTH_STRICT_WHITELIST_FOR_LOGIN` 等）。

