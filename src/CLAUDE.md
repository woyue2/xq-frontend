# src/ — 前端源码层

> **GEB Level: L2** | 父文档：[CLAUDE.md](../CLAUDE.md)

## 职责

前端所有可运行代码的根目录。分层架构从上到下：

```
pages (路由视图)
    ↓ 使用
components (共享 UI)   hooks (可复用逻辑)   stores (全局状态)
    ↓ 依赖
services (HTTP 层)
    ↓ 依赖
lib (纯工具)   types (类型定义)   config (常量)
```

## 分层规则

| 层 | 可以依赖 | 禁止依赖 |
|---|---|---|
| `pages/` | components, hooks, stores, services | 其他 pages |
| `components/` | hooks, lib, types, config | pages, stores（只接 props） |
| `hooks/` | services, stores, lib, types | pages, components |
| `services/` | lib/types（仅 http），stores（仅 getState） | pages, components, hooks |
| `stores/` | types, lib | pages, components, services |
| `lib/` | 无内部依赖 | 所有应用层 |

## 子模块文档

- [components →](./components/CLAUDE.md)
- [pages →](./pages/CLAUDE.md)
- [services →](./services/CLAUDE.md)
- [stores →](./stores/CLAUDE.md)
- [hooks →](./hooks/CLAUDE.md)
- [lib →](./lib/CLAUDE.md)
- [types →](./types/CLAUDE.md)
- [config →](./config/CLAUDE.md)
- [layouts →](./layouts/CLAUDE.md)
- [styles →](./styles/CLAUDE.md)
- [test →](./test/CLAUDE.md)
