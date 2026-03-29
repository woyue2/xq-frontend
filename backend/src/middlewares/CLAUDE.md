# backend/src/middlewares/ — Express 中间件

> **GEB Level: L3** | 父文档：[backend/src/CLAUDE.md](../CLAUDE.md)

## 职责

请求前置处理：JWT 鉴权、错误处理、限流、日志。

## 文件清单

| 文件 | 职责 |
|---|---|
| `auth.middleware.ts` | JWT 验证 + 角色注入（支持 optionalAuth 可选鉴权） |
| `error.middleware.ts` | 统一错误格式响应 |
| `logger.middleware.ts` | 请求日志（pino-http）+ coreLogger 导出 |
| `membership.middleware.ts` | 会员有效期校验中间件 |

## 规则

- 每个中间件函数签名：`(req, res, next) => void`
- 鉴权失败统一返回 401，权限不足返回 403
- 错误中间件必须是最后一个 `app.use`

## FORBIDDEN

- 禁止在中间件内调用业务 service
- 禁止 `console.log` 替代结构化日志
