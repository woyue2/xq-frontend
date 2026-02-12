## 结构化编程落地技术方案（HOW）

> 基于 WHY 中的目标与动机，下面给出在现有项目中实施结构化编程的具体技术路径与模块划分。

### 一、总体设计思路

1. **分层 + 模块化**
   - 后端保持三层结构：
     - 路由层（Controller）：仅负责 HTTP 请求解析与响应组装；
     - 服务层（Service）：承载业务流程与领域逻辑，使用结构化控制流组合；
     - 数据访问层（Repository/Prisma）：封装数据库访问与查询；
   - 横切基础设施模块：
     - 错误与异常：`AppError` + 错误中间件；
     - 日志：统一 logger（可基于 `console` 封装或引入日志库）；
     - 校验：统一参数验证（如 Zod schema）。

2. **结构化控制流约束**
   - 服务层函数采用清晰的顺序 → 条件分支 → 循环结构，不使用隐式控制流（例如在多层回调中早退）；
   - 异常仅用于“真正的异常/不可预料情况”，错误路径通过统一的错误对象 + 中间件处理，避免滥用抛异常作为常规分支；
   - 在 TypeScript 中通过显式类型与窄化，使控制分支清晰可见。

3. **函数契约规范**
   - 为关键函数（路由 handler、核心服务函数）约定文档式契约：
     - 前置条件（Preconditions）：参数约束、调用环境假设；
     - 后置条件（Postconditions）：返回值结构与状态变化说明；
     - 异常情况：可能抛出的错误类型（例如 `AppError` 各种 code）。
   - 以简洁的 JSDoc / TSDoc 风格编写在函数上方，并在设计文档中为关键路径收集汇总。

4. **统一错误处理与日志规范**
   - 在后端：
     - 继续使用 `AppError` 作为统一业务错误类型；
     - 确定字段：`httpStatus`、`errorCode`、`message`、`bizCode?`、`details?`；
     - 错误中间件统一输出 `ApiResponse` 风格的错误响应；
     - 日志记录：
       - INFO 级：关键业务操作成功（如创建问题、上报行为日志）；
       - WARN 级：可恢复错误或边缘情况；
       - ERROR 级：未捕获异常或严重业务失败，记录堆栈与关键上下文（用户 id、接口、参数摘要）。
   - 在前端：
     - 统一通过 `api.interceptors.response` 处理非 200/201 的 `code`；
     - 对于业务错误统一展示用户友好信息，同时在控制台打印结构化日志。

5. **面向分支路径的单测策略**
   - 服务函数按“**一个 if/else/分支组合必须有至少一条单测命中**”的原则编写测试；
   - 对关键模块使用覆盖率工具（如 `jest --coverage` 或 `vitest --coverage`），对本方案范围内模块设置覆盖率门槛（branch/statement ≥ 85%）。

### 二、模块划分与接口定义（示意）

> 此处给出针对本项目的典型模块划分示意，后续在具体迭代中以此为参考。

1. **后端基础设施模块**
   - `backend/src/errors/AppError.ts`
     - 输入：错误构造参数（httpStatus, errorCode, message, bizCode?, details?）
     - 输出：可被错误中间件识别的统一错误对象；
     - 契约：构造后 `httpStatus` ∈ [400..599]，`errorCode` 为稳定字符串常量。
   - `backend/src/middlewares/error.middleware.ts`
     - 输入：Express 错误对象；
     - 输出：统一 `ApiResponse` 结构的错误 JSON；
     - 契约：永远返回 HTTP 状态码 + `{ code, message, error?, timestamp }`。
   - `backend/src/utils/logger.ts`（如需补充）
     - 统一封装日志输出，暴露 `info/warn/error` 三种基础方法。

2. **典型业务模块（以互动/行为埋点/通知为代表）**
   - 互动模块（Interactions）
     - 路由：`backend/src/routes/interaction.routes.ts`
       - 接口：
         - `POST /api/interactions/like`
         - `POST /api/interactions/favorite`
         - `GET /api/interactions/my-likes`
         - `GET /api/interactions/my-favorites`
       - 输入：HTTP 请求（body/query）、认证中间件注入的用户信息；
       - 输出：`ApiResponse<LikeResponse | FavoriteResponse | PaginatedResponse<...>>`
     - 服务：`backend/src/services/interaction.service.ts`
       - 输入：结构化参数 `{ userId, questionId, action }` 等；
       - 输出：业务对象 `{ liked, likesCount }` / `{ favorited, favoritesCount }`；
       - 契约：处理前先验证问题存在，否则抛出 `QUESTION_NOT_FOUND`。
   - 行为埋点模块（Behavior）
     - 路由：`backend/src/routes/behavior.routes.ts`
       - 功能：验证请求体、应用简单防刷策略、调用服务记录行为日志；
       - 输出：`ApiResponse<{ logId: string }>`。
     - 服务：`backend/src/services/behavior-log.service.ts`
       - 输入：结构化事件对象；
       - 输出：持久化结果（包含 logId）；
       - 契约：保证事件持久化成功或抛出明确错误。
   - 通知模块（Notification）
     - 路由：`backend/src/routes/notification.routes.ts`
       - 输出：统一的 `ApiResponse` 包裹结构。

3. **前端 API 封装模块**
   - `src/services/api.ts`
     - 使用统一的 `ApiResponse<T>` 与 `PaginatedResponse<T>`；
     - 对 behavior / interactions / notifications 等后端接口提供类型安全的封装；
     - 契约：对于 `code !== 200/201` 的响应由拦截器统一处理错误提示。

### 三、函数级结构化编程规范（示例化规则）

1. 函数结构模板（服务层）
   - 顺序：
     - 参数校验 → 权限/前置条件检查 → 业务状态查询 → 状态更新 → 返回结果组装；
   - 选择：
     - 使用 `if/else` 或 `switch` 明确区分不同分支；
     - 禁止在没有说明的情况下使用魔法常量区分状态；
   - 循环：
     - 使用 `for/for..of` 或数组高阶函数 (`map/filter/reduce`) 构建清晰循环；
     - 避免在循环中出现多重早退、嵌套异常等复杂结构。

2. 函数契约文档格式（约定）
   - 在关键函数上方使用类似格式：
     - `@pre`：参数/环境要求；
     - `@post`：返回值保证与副作用描述；
     - `@throws`：可能抛出的错误类型。

### 四、测试与覆盖率策略

1. 单测框架与工具
   - 后端：沿用当前测试框架（Jest / Vitest / Playwright 等），对行为埋点/互动/通知模块添加针对性的 unit/integration tests；
   - 前端：为 `src/services/api.ts` 的封装函数编写单元测试（可借助 mock adapter）。

2. 覆盖率门槛
   - 在后端测试配置中（如 `backend/jest.config.cjs`）为本方案范围内的目录设置：
     - `branches`: ≥ 85%
     - `statements`: ≥ 85%
   - 将覆盖率报告纳入 CI 检查或本地 pre-commit 检查。

3. 分支路径覆盖实践
   - 行为埋点：
     - 正常上报、缺少 type、超过限流阈值、token 有效/无效等分支；
   - 互动模块：
     - 点赞前未点赞 / 已点赞、收藏前未收藏 / 已收藏、问题不存在、未登录等场景；
   - 通知模块：
     - 有/无未读通知、空数组/非空数组标记已读等。

### 五、文档与交付规范

1. 设计文档
   - 在 HelloAGENTS 知识库（`helloagents/wiki/*`）中新增一篇结构化编程规范文档，涵盖：
     - 模块划分与依赖关系图；
     - 函数契约示例；
     - 错误/日志规范；
     - 测试策略与覆盖率指标。

2. 测试报告
   - 跑完单测后导出覆盖率报告，并在 `codex-develop-doc/` 下新增/更新一份测试报告小节，记录：
     - 测试范围；
     - 用例数与通过率；
     - 覆盖率统计。

3. 部署指南
   - 在 `deploy/` 或 `codex-develop-doc` 中维护部署指南，说明：
     - 环境变量与配置文件；
     - 启动命令与健康检查；
     - 如何执行测试与查看覆盖率报告。

