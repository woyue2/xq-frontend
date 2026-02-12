## 四、环境与降级策略

- 在 `development` / `test` 环境下，认证模块在部分数据库异常场景会进行有限降级，以保证本地联调体验：
  - 白名单校验：发送注册验证码与注册流程中访问 `userWhitelist` 失败时，可在非生产环境跳过白名单强校验，继续按默认角色处理；
  - 刷新令牌校验：`POST /api/auth/refresh-token` 在无法访问 `refreshToken` 表时，会退化为仅依赖 JWT 过期时间判断令牌有效性。
- 在 `production` 环境下，以上操作若访问数据库失败，将统一抛出 `500/INTERNAL_SERVER_ERROR`，不会再静默降级，以避免安全性与一致性隐患。

# 模块文档：后端认证与权限（backend-auth）

## 一、模块职责

- 提供统一的认证能力：验证码发送、注册、登录、Token 刷新、退出登录。
- 与白名单与课时模块协作，确保只有授权用户可以访问写操作接口。
- 为后续权限控制（如教师/管理员专属接口）提供统一的用户上下文。

## 二、主要接口

- `POST /api/auth/send-code`：按手机号和类型（登录/注册）发送验证码，内置发送频率限制与格式校验。
- `POST /api/auth/register`：根据手机号、验证码、昵称与登录密码等信息创建用户；若存在白名单记录，则使用白名单中的角色与有效期。
  - 请求体核心字段：`phone`、`code`、`password`（必填，至少 8 位）、`nickname`（必填）、可选 `grade/age/school/role`；
  - 当 `password` 缺失或长度不足 8 位时，返回 `400/INVALID_PASSWORD_FORMAT/密码至少需 8 位`。
- `POST /api/auth/login`：校验验证码并返回 `token + refreshToken + user`，并记录登录日志；后续将接入白名单与课时有效期判断。
- `POST /api/auth/refresh-token`：使用 RefreshToken 刷新访问令牌与 RefreshToken 本身，同时使旧 RefreshToken 失效。
- `POST /api/auth/logout`：基于当前访问 Token 撤销该用户所有仍然有效的 RefreshToken，实现安全退出。

## 三、与前端契约

- 前端通过 `authService.sendCode/login/passwordLogin/register` 调用后端，所有响应均符合 `ApiResponse<T>` 结构。
- 注册调用使用 `RegisterPayload` 结构：`{ phone, code, password, nickname?, grade?, age?, school?, role? }`，错误码 `INVALID_PASSWORD_FORMAT` 代表密码长度不足 8 位。
- 登录与注册成功时，`data.user` 字段遵循 `src/types/index.ts` 中的 `User` 结构（包含 `role`、可选 `grade/age/school` 等）。

## 四、环境与降级策略（注册 & RefreshToken）

- 注册接口实现路径：`backend/src/services/auth.service.ts` 中的 `AuthService.register`。
- 用户创建：
  - 在 `NODE_ENV === 'production'` 时，`prisma.user.create` 失败会抛出 `500/INTERNAL_SERVER_ERROR/注册服务暂不可用，请稍后重试`，不再降级为"内存用户"，保证数据库与 Token 状态一致。
  - 在开发/测试环境中，保留极端情况下的"内存用户"降级，仅用于本地无数据库或结构未完整时的联调体验。
- RefreshToken 持久化：
  - 在生产环境中，`prisma.refreshToken.create` 失败同样会抛出 `500/INTERNAL_SERVER_ERROR/注册服务暂不可用，请稍后重试`，避免出现"用户已写入但 RefreshToken 未持久化"的不一致状态。
  - 在开发/测试环境中，RefreshToken 写库失败会被忽略，前端仍可拿到 accessToken + refreshToken，用于前后端联调与接口冒烟；同时通过 `coreLogger` 输出一条带有 `mode: 'degraded'` 的结构化日志，便于后续在日志系统中快速识别降级场景。

## 五、监控与日志字段约定

- 访问日志:
  - 由 `loggerMiddleware` 基于 `pino-http` 输出，统一在日志对象中增加 `mode` 字段:
    - `mode: 'mock'`：前端在请求头中携带 `X-Client-Mode: mock`，通常对应 `VITE_USE_MOCK=true` 的 Mock 模式；
    - `mode: 'normal'`：默认值，表示前端当前走真实后端。
- 错误日志:
  - 通过 `errorMiddleware` 输出时，同样会附带 `mode: 'mock' | 'normal'` 字段，帮助区分错误是发生在 Mock 联调还是真实后端路径。
- 降级日志:
  - 认证模块在发生降级行为时（例如白名单表不可用而在非生产环境跳过校验、注册流程降级为内存用户、RefreshToken 校验退化等），会调用 `coreLogger.warn` 输出结构化日志，关键字段包括:
    - `mode: 'degraded'`
    - `feature`: `'auth.sendCode' | 'auth.login' | 'auth.passwordLogin' | 'auth.register' | 'auth.refreshToken'` 等
    - `reason`: 降级原因简述（如 `userWhitelist lookup failed, skip in non-production`）
    - `env`: 当前 `NODE_ENV` 值
  - 运维/排查时可以通过 `mode` 字段快速过滤:
    - `mode='mock'`：Mock 联调请求；
    - `mode='degraded'`：触发了后端降级逻辑的请求；
    - `mode='normal'`：正常路径。
