# backend/src/ — 后端源码层

> **GEB Level: L2** | 父文档：[CLAUDE.md](../../CLAUDE.md)

## 职责

Express + Prisma 后端所有源码的根目录。

## 分层架构

```
routes/ → 仅做参数校验 + 鉴权 + 调用 service
    ↓
services/ → 业务逻辑，操作 Prisma Model
    ↓
middlewares/ → 请求前置处理（auth, error, rate-limit）
    ↓
utils/ → 纯工具函数（格式化、加密、验证）
```

## 子模块文档

- [routes →](./routes/CLAUDE.md)
- [services →](./services/CLAUDE.md)
- [middlewares →](./middlewares/CLAUDE.md)
- [utils →](./utils/CLAUDE.md)
