# backend/src/routes/ — Express 路由层

> **GEB Level: L3** | 父文档：[backend/src/CLAUDE.md](../CLAUDE.md)

## 职责

接受 HTTP 请求，做参数校验 + 权限鉴别（JWT guard），调用 service，返回标准响应。

## 规则

- 路由文件只能调用同名 service（auth.routes.ts → auth.service.ts）
- 禁止在路由层写任何业务逻辑（SQL/Prisma/计算等）
- 每个 route handler ≤ 15 行
- 统一使用 `ApiResponse<T>` 标准响应格式：`{ code: 200, message: 'success', data }`

## FORBIDDEN

- 禁止在路由内直接 `import { PrismaClient }`
- 禁止跨路由文件互相调用
