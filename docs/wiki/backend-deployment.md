# 模块文档：后端部署与回滚（backend-deployment）

## 一、部署目标与环境划分

- 目标：为知识星球问答小程序的后端服务（`kpqa-backend`）提供可重复、可回滚的部署流程说明。
- 环境划分：
  - 本地开发环境：开发者本机，使用 `Node.js` + `docker-compose` 启动 Postgres/Redis。
  - 测试/预发布环境：CI 或独立服务器，使用与生产一致的数据库与 Redis 配置，用于回归测试。
  - 生产环境：对外提供服务的正式环境，要求开启日志采集、健康检查与告警。

## 二、本地开发部署流程

### 2.1 前置要求

- 已安装 Node.js 18+、npm。
- 已安装 Docker 与 docker-compose。
- 仓库根目录存在 `docker-compose.yml`，提供 Postgres 与 Redis 容器。

> 小提示：项目根目录下提供了一个便捷脚本 `deploy/dev-backend.sh`，可以一键在本地执行迁移并启动后端（见 2.4 小节）。

### 2.2 启动依赖服务

- 在项目根目录执行：
  - 使用 `docker-compose up -d postgres redis` 启动数据库与缓存。
  - 确保容器 `kpqa-postgres` 与 `kpqa-redis` 处于 `Up` 状态。

### 2.3 配置后端环境变量

- 进入 `backend/` 目录，确保 `.env` 包含以下关键配置（示例值可按环境调整）：
  - `NODE_ENV=development`
  - `PORT=3000`
  - `DATABASE_URL=postgresql://kpqa:kpqa_password@localhost:5432/kpqa_db`
  - `REDIS_URL=redis://localhost:6379`
  - `JWT_SECRET`、`JWT_EXPIRES_IN` 等安全相关变量。

### 2.4 初始化数据库与依赖

- 手动方式（显式执行每一步）：
  - 在 `backend/` 目录执行：
    - `npm install` 安装依赖。
    - `npm run prisma:migrate`（对应 `prisma migrate dev`）以应用当前所有 Prisma 迁移，并生成客户端。
- 便捷方式（推荐给日常开发使用）：
  - 在仓库根目录执行：`bash deploy/dev-backend.sh`
    - 自动检查 `backend/.env` 是否存在。
    - 运行 `npm install`（已安装时会利用缓存快速通过）。
    - 运行 `npm run prisma:migrate` 同步数据库结构。
    - 最后启动 `npm run dev` 进入开发模式。

### 2.5 启动本地服务

- 使用热重载模式开发：
  - 手动方式：在 `backend/` 目录运行 `npm run dev`，默认监听 `PORT`（如 3000）。
  - 或直接使用 `bash deploy/dev-backend.sh`，该脚本会在迁移成功后自动进入 `npm run dev`。
- 健康检查：
  - 访问 `GET /health`，预期返回包含 `status: "ok"` 与当前时间戳的 JSON。

## 三、测试与发布前检查

- 在本地或 CI 环境执行：
  - `npm test`：运行所有后端单元与集成测试，确保通过。
  - 确认覆盖率报告中整体行覆盖率 ≥ 80%，且后端核心模块（认证、白名单/课时、问题/回答/评论/互动、审核、埋点、上传等）达到预期覆盖。
- 建议在预发布环境使用与生产一致的环境变量与数据库参数，执行一轮回归测试后再上线。

## 四、生产环境部署流程（推荐实践）

### 4.1 基础架构建议

- 使用以下任一方式运行 `kpqa-backend`：
  - 使用 Node.js 进程管理器（如 systemd、PM2）在服务器上运行 `node dist/server.js`。
  - 将 `backend` 打包为 Docker 镜像，在生产环境使用 Docker 或 Kubernetes 运行。
- 生产环境数据库与 Redis 建议使用托管服务或高可用集群，并启用自动备份。

### 4.2 构建与启动步骤

- 在 CI/CD 或运维节点执行：
  - 进入 `backend/` 目录，运行 `npm install --production=false` 安装依赖。
  - 运行 `npm run build` 构建 TypeScript，生成 `dist/`。
  - 确保生产环境配置了正确的 `.env` 或等效环境变量（与开发环境类似，但使用生产数据库与密钥）。
  - 在目标服务器上：
    - 使用 `npm run prisma:migrate` 或在生产模式下使用 `prisma migrate deploy` 应用数据库迁移。
    - 使用进程管理器或容器编排工具启动 `node dist/server.js`。

### 4.3 健康检查与流量切换

- 健康检查：
  - 使用 `GET /health` 端点作为基础健康探针，在负载均衡或反向代理中配置。
- 建议在生产入口（如 Nginx/Ingress）中配置：
  - 健康检查失败时下线实例。
  - 零停机滚动更新：先启动新实例并通过健康检查，再缓慢切流量。

## 五、日志记录与监控告警

### 5.1 日志记录

- 后端使用 `pino-http` 中间件（`loggerMiddleware`）统一记录每个请求的访问日志。
- 建议在生产环境中：
  - 将标准输出重定向至日志采集系统（如 ELK / Loki / Cloud Logging）。
  - 为关键错误日志（HTTP 5xx、鉴权失败、数据库异常等）配置告警规则。

#### 5.1.1 本地联调查看正确码/错误码与运行模式

在本地同时运行前端与后端进行接口联调或诊断测试时，可按以下方式通过系统日志查看每一次行动对应的正确码/错误码与运行模式:

- 启动后端开发服务（在 `backend/` 目录）:
  - `npm run dev`
- 观察日志输出:
  - 访问日志: 由 `loggerMiddleware` 输出，包含以下核心字段:
    - `method`、`url`、`statusCode`
    - `mode`: `'mock' | 'normal'`，来自前端请求头 `X-Client-Mode`（`VITE_USE_MOCK=true` 时为 `'mock'`，否则为 `'normal'`）
  - 错误日志: 由 `errorMiddleware` 输出，统一结构为:
    - `type`: `'app_error' | 'validation_error' | 'unknown_error'`
    - `status`: HTTP 状态码
    - `code`: 业务错误码（通常与 HTTP 状态码一致）
    - `error`: 业务错误标识（如 `UNAUTHORIZED`、`VALIDATION_ERROR`、`INTERNAL_SERVER_ERROR`）
    - `path`、`method`: 请求路径与方法
    - `mode`: `'mock' | 'normal'`，与访问日志一致，便于区分 Mock 模式与真实后端模式
  - 降级路径结构化日志:
    - 对于认证模块中的数据库降级路径（如注册时降级为内存用户、RefreshToken 校验退化为仅依赖 JWT 等），会通过 `coreLogger` 输出带有 `mode: 'degraded'` 的结构化日志，典型字段包括:
      - `feature`: 如 `'auth.register'`、`'auth.refreshToken'`
      - `reason`: 降级原因简述（如 `userWhitelist lookup failed, skip in non-production`）
- 常见联调场景示例:
  - 登录成功: 查看 `POST /api/auth/login` 对应访问日志中的 `statusCode=200`，并确认 `mode` 是否为 `'normal'`。
  - 验证码错误: 触发登录失败后，在错误日志中找到 `type='app_error'` 或 `type='validation_error'`，并通过 `status` 与 `error` 字段确定错误类型。
  - 降级诊断: 在开发/测试环境中故意关闭数据库或相关表时，观察日志中是否出现 `mode='degraded'` 且 `feature='auth.register' | 'auth.refreshToken'` 等记录，用于确认降级逻辑是否按预期生效。

### 5.2 错误处理

- 统一错误处理中间件 `errorMiddleware` 负责：
  - 将业务错误（`AppError`）转换为 `code + message + error` 结构化响应。
  - 将参数校验错误（ZodError）统一返回 `VALIDATION_ERROR`。
  - 对未知错误返回 `500 INTERNAL_SERVER_ERROR`，避免泄露内部细节。
- 部署时需确保：
  - 非预期错误仍会被记录到日志中，便于排查。
  - 上层监控系统对错误响应比例异常升高的情况进行告警。

### 5.3 指标与监控

- 最低监控指标建议：
  - 请求成功率（2xx 占比）。
  - 错误率（4xx/5xx 占比）。
  - 接口延迟分布（P95/P99）。
  - 数据库连接池与 Redis 状态（可通过外部监控或自定义探针实现）。

## 六、数据库迁移与回滚策略

### 6.1 迁移基本流程

- 所有结构变更通过 Prisma 迁移管理：
  - 在开发环境中使用 `prisma migrate dev` 生成迁移文件并验证。
  - 将 `prisma/migrations/` 与更新后的 `schema.prisma` 提交至仓库。
  - 在测试与生产环境中使用 `prisma migrate deploy` 应用迁移（如在 CI/CD 脚本中执行）。

### 6.2 回滚原则

- 在执行生产迁移前：
  - 必须确保有最近一次的数据库备份（全量或按时间点恢复能力）。
  - 在测试环境对迁移执行全量回放，并通过关键路径回归测试。
- 遇到生产故障时优先策略：
  - 如仅为代码逻辑问题，优先回滚应用版本（恢复上一版镜像或构建）。
  - 如为数据库结构问题，使用数据库备份/快照进行回滚，并结合 Prisma 的迁移历史进行校准。

### 6.3 回滚操作示例（推荐实践）

- 应用回滚：
  - 保留上一版本构建产物或 Docker 镜像，如 `kpqa-backend:vX.Y.Z-prev`。
  - 在负载均衡中将流量切回上一版本实例。
- 数据库回滚：
  - 使用云数据库提供的 T+1 或时间点恢复能力，将库恢复到迁移前时间点。
  - 恢复后重新部署与之匹配的应用版本，避免出现"新代码 + 旧库"或"旧代码 + 新库"的不兼容情况。

## 七、版本发布与记录

- 每次后端版本发布应记录：
  - 发布版本号（可与 `package.json` 中版本对齐）。
  - 对应的 Prisma 迁移 ID 与变更内容摘要。
  - 回滚方案（使用哪个备份、恢复点、对应应用版本）。
- 建议将上述信息补充到 `history/` 与 `helloagents/CHANGELOG.md` 中，以便后续审计与问题追踪。
