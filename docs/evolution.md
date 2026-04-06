# Evolution Log

> 最新记录在最前。

---
# 2026-04-06

## 变动  重构生产部署骨架
### 原因  旧 deploy 目录中的 1c1g 文档、脚本与当前基于 Supabase、Redis 和 Docker 的部署路径不一致，且生产镜像曾误读 `backend/.env` 导致容器在 production 模式下启动失败。
### 影响
- 新增 `.dockerignore`，阻止 `backend/.env` 进入 Docker 构建上下文
- 新增 `deploy/Dockerfile.backend` 与 `deploy/docker-compose.prod.yml`，后端镜像改为显式复制源码并在构建阶段执行 `prisma generate`
- 移除旧的 deploy 目录文档、草稿脚本与过时 worker 参考文件，统一为新的生产部署入口

## 变动  完成竞态条件审计和属性测试框架
### 原因  系统存在多处 API 调用后立即更新本地状态的竞态条件，需要系统性检测和修复。同时引入属性测试提升测试覆盖率。
### 影响
- 新增 fast-check 依赖用于属性测试
- 扩展竞态条件检测测试，识别 15 个潜在模式
- 完成审计报告和任务清单更新
- 新增属性测试文档和创建操作测试用例

## 变动  补充服务器部署文档与反向代理模板
### 原因  需要为线上域名提供可直接落地的部署说明，统一前端静态托管与 `/api`、`/static` 反向代理路径，降低首次上服务器的操作成本。
### 影响
- 新增 `deploy/Caddyfile.example`，提供同域名部署模板
- 新增 `deploy/SERVER_DEPLOY_CHECKLIST.md`，沉淀服务器准备、后端启动、前端构建、验收与回滚流程

## 变动  修复 Vercel 部署 API 模块找不到错误
### 原因  API 层错误引用前端 src/lib/prisma 路径，Vercel Serverless 环境中该路径不存在，导致 ERR_MODULE_NOT_FOUND
### 影响
- 新增 `api/_lib/prisma.ts` 专用 Prisma 客户端
- 修复 11 个 API 文件的 prisma 引用路径，统一改为 `_lib/prisma`
- 解决 `/api/questions` 等 API 端点部署时崩溃问题

# 2026-03-31

## 变动  新增科目/考点管理功能
### 原因
原有学科配置为前端硬编码（taxonomy.ts），无法动态增删科目和考点，管理员无法在后台维护。
### 影响
- 后端：新增 Subject/Topic Prisma 模型 + migration + subject.service + admin-subjects.routes
- 后端：config.routes 对外暴露科目/考点列表，app.ts 注册新路由
- 前端：useAdminSubject hook + AdminManagementPage 科目管理 UI + CreateQuestionPage 选科目
- 前端：admin.service 补充科目/考点 API，types/api.ts 新增 SubjectAdminDto/TopicAdminDto

## 变动  修复科目禁用/考点新增未同步到创建问题页
### 原因
subjectConfig.service.ts 读取响应数据路径错误（少了一层 `.data`），导致解析结果为 undefined 并缓存；同时 CreateQuestionPage 未在每次进入时强制刷新，缓存 5 分钟内管理端修改不生效。
### 影响
- subjectConfig.service.ts：修正路径为 `response.data.data.subjects`，加 Array.isArray 校验防止 undefined 缓存
- CreateQuestionPage：每次 mount 调用 clearCache() 强制重新加载
- useAdminSubject：保存科目/考点/新增考点成功后调用 clearCache()

## 变动  AI 审核正式接入 + 老师评论补齐审核
### 原因
`.env` 中 `AI_AUDIT_BASE_URL`/`AI_AUDIT_API_KEY` 填入后，Jest 测试环境因相对路径问题无法加载 `.env`，导致 AI 审核在测试中始终 disabled。同时发现老师发评论绕过了 AI 审核直接 approved，存在安全漏洞。
### 影响
- `jest.config.cjs`：通过 `BACKEND_ENV_PATH` 指定绝对路径，测试环境正确加载 `.env`
- `comment.service.ts`：老师评论也走 AI 审核，通过后才 approved，违规直接 rejected
- `ai-callback.api.spec.ts`：注入固定测试 token 解决 403；`beforeEach` 加 `parentChild.deleteMany()`
- `flow-question-audit-notification.api.spec.ts`：同步补 `parentChild.deleteMany()`
- 测试文件批量补齐 `authorRole` 参数 + mock question `status: 'approved'`

## 变动  后端代理图片上传，去除前端直传图床
### 原因
前端直传 imgurl.org 因字段名、认证方式、URL 路径不一致导致上传失败。改为后端代理转发，统一管控 token 和接口格式。
### 影响
- 新增 `POST /upload/image` 后端路由（multer memoryStorage + fetch 转发）
- `question.service.ts` uploadImage 改为 POST /upload/image，删除死代码
- `.env` OSS_UPLOAD_BASE_URL 修正为 `https://www.imgurl.org/api/v3/upload`

## 变动  修复点击题目卡片崩溃 + 详情页 setPlayingAnswerId 未定义
### 原因
QuestionCard 和 HomePage 缺少 `ROUTES` import，运行时 `ROUTES` 为 `undefined`，点击卡片时 `ROUTES.question(id)` 抛 TypeError，React ErrorBoundary 捕获后全页面崩溃。同时 `useQuestionDetail` 未 return `setPlayingAnswerId`，详情页音频结束回调报引用错误。
### 影响
- `QuestionCard.tsx`：补 `ROUTES` import
- `HomePage.tsx`：补 `ROUTES` import
- `useQuestionDetail.ts`：return 块加 `setPlayingAnswerId`
- `QuestionDetailPage.tsx`：解构加 `setPlayingAnswerId`
- 后端 `GET /api/questions/:id` 已改为 `optionalAuthMiddleware`，重启后端生效

## 变动  修复多页面运行时崩溃（缺失 import / hook 未暴露）
### 原因
重构过程中多处文件的 import 语句和 hook return 未同步更新，ErrorBoundary 捕获 ReferenceError，/audit /admin /my-likes /my-favorites 等路由全部显示「应用加载失败」。
### 影响
- `AuditPage`: 解构补 `setScoreDialogOpen`
- `AdminManagementPage`: `useAdminWhitelist` 补暴露 `calculateNewExpiry`/`setPendingExpiry`
- `MyFavoritesPage`/`MyLikesPage`: 补 `useNavigate`/`Badge` import
- `GoodQuestionsPage`/`StatusListPage`/`NotificationsPage`: 补多个 lucide 图标 import
- `StudentHistoryPage`/`ParentQuestionPage`: 补 `useParams`/`useNavigate` import
- `parentService.ts`: 补 `BindChildPayload`/`ChildInfo` import
- `subjectConfig.service.ts`: 补 `TAXONOMY` import，修 `.data` 访问路径
- `types/api.ts`: 补 `SubjectDto`/`TopicDto`，`FavoritePayload` 加 `targetType`/`targetId`，`QuestionListParams` 加 `topic`

## 变动  mock-data 顶层 import 隔离 + USE_MOCK 条件初始化
### 原因
生产构建时 userLikes/userFavorites 的 mock 状态不应混入真实 liked/favorited 初始值；LoginPage 邀请码前端校验不应在生产环境拦截真实注册流程。
### 影响
- `useQuestionDetail.ts`：liked/favorited 初始值改为 `USE_MOCK ? mockSet.has(id) : false`
- `QuestionDetailPage.tsx`：同上；L3 头部修正，删除未实际消费的 useQuestionDetail 依赖声明，加 [TODO] 标注
- `LoginPage.tsx`：validInviteCodes 校验加 `USE_MOCK &&` 条件

## 变动  提取 useAdminDimension hook
### 原因
AdminManagementPage 有 24 个 useState，维度管理（method 维度 CRUD）的 4 个 handler + 4 个 state 完全可以独立为 hook，与 useAdminWhitelist 对称。
### 影响
- 新增 `src/hooks/useAdminDimension.ts`（115行）
- `AdminManagementPage.tsx`：useState 从 24 降至 20，行数从 1126 降至 1059
- `hooks/CLAUDE.md`：新增 useAdminDimension.ts 条目
- 页面 L3 [INPUT] 补充 useAdminDimension 依赖

# 2026-03-30

## 变动  生产环境部署 Bug 修复：登录页无限刷新 + 内存泄漏
### 原因  拦截器 401 循环触发与 Zustand 状态同步竞态导致生产环境无法登录。
### 影响
- `http.ts`：401 拦截器增加路径校验，排除登录页以防止重载循环。
- `AuthLayout.tsx`：重写守卫逻辑，增加 `isHydrated` 等待及已登录自动跳转。
- `LoginPage.tsx`：修复 `setInterval` 未清理导致的内存泄漏；修复 `handleGetChildCode` 异步静默失败。

## 变动  新增游客只读模式（Optional Auth）
### 原因  支持未登录用户浏览题目，降低准入门槛并引导注册。
### 影响
- 后端：新增 `optionalAuthMiddleware`，`GET /questions` 路由切换为可选鉴权模式。
- 前端：
  - `HomePage.tsx` / `MainLayout.tsx`：增加交互拦截，点击点赞/收藏/通知时提示「请先登录」。
  - `App.tsx`：开放首页 `/` 路由权限。
  - GEB 文档：同步更新全量 L2/L3 契约描述。

## 变动  GEB 合规审查：P0 修复 + P1 service 拆分 + CLAUDE.md 分形文档
### 原因  项目进入成熟阶段，需建立 GEB 分形架构合规基线，消除代码坏味道。
### 影响
- `QuestionCard.tsx`：消除 `as any` 类型绕过，魔法数字提取为具名常量
- `MainLayout.tsx`：`NavItem` props 从 `: any` 改为具名 `NavItemProps interface`
- `src/services/api.ts`（1149行）→ 拆分为 6 个独立 service 文件 + 33行 re-export 桶（现有 import 路径零改动）
  - `http.ts` / `auth.service.ts` / `question.service.ts` / `interaction.service.ts` / `notification.service.ts` / `admin.service.ts`
- 新增 `useAdminWhitelist.ts` hook（抽取 AdminManagementPage 全量 state + 逻辑）
- 新增 `useQuestionDetail.ts` hook（抽取 QuestionDetailPage 全量交互逻辑）
- 新增 GEB 三层分形 CLAUDE.md 共 19 个文件（L1 根 + L2 前后端 + L3 全目录）

## 变动  后端全量代码审查：Bug 修复 + 坏味道清除 + GEB L2/L3 补全
### 原因  /review 后端发现运行时 Bug 及文档缺失，阻塞提交前质量关卡。
### 影响
- `auth.middleware.ts`：补充缺失的 `verifyToken`/`AppError` import（运行时 Bug，JWT 验证全部失效）
- `question.service.ts`：移除 `authorName` 参数，service 内部自查 User 表获取真实姓名，消除路由层硬编码占位 `'当前用户'`
- `server.ts`：`console.log` → `coreLogger.info`（违反 FORBIDDEN）
- `routes/CLAUDE.md`：补充完整 17 个路由文件清单（原无清单）
- `services/CLAUDE.md`：补充完整 14 个 service 文件清单（原无清单）
- `middlewares/CLAUDE.md`：补充 `logger.middleware.ts` / `membership.middleware.ts` 两个缺失条目
- `src/services/CLAUDE.md`：补充 `subjectConfig.service.ts` 条目
- TODO 记录：`auth.service.ts`（1019行）待拆分、routes 层 prisma 直调待迁移、`FIXED_CODE` 硬编码安全风险

## 变动  mock-data 顶层 import 隔离 + USE_MOCK 条件初始化
### 原因
生产构建时 userLikes/userFavorites mock 状态不应混入真实 liked/favorited 初始值；LoginPage 邀请码前端校验不应在生产环境拦截真实注册流程。
### 影响
- `useQuestionDetail.ts`：liked/favorited 初始值改为 `USE_MOCK ? mockSet.has(id) : false`
- `QuestionDetailPage.tsx`：同上；L3 头部修正，删除未实际消费的 useQuestionDetail 依赖声明，加 [TODO] 标注待专项 PR
- `LoginPage.tsx`：validInviteCodes 校验加 `USE_MOCK &&` 条件，生产由后端校验

## 变动  提取 useAdminDimension hook
### 原因
AdminManagementPage 有 24 个 useState，维度管理 4 个 state + 4 个 handler 可独立为 hook，与 useAdminWhitelist 对称。
### 影响
- 新增 `src/hooks/useAdminDimension.ts`（115行，含完整 L3 契约）
- `AdminManagementPage.tsx`：useState 从 24 降至 20，行数 1126→1059
- `hooks/CLAUDE.md`：新增 useAdminDimension.ts 条目
