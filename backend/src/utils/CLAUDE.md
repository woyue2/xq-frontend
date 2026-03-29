# backend/src/utils/ — 后端工具函数

> **GEB Level: L3** | 父文档：[backend/src/CLAUDE.md](../CLAUDE.md)

## 职责

纯函数工具：格式转换、加密、校验、日期处理等，无数据库操作，无业务语义。

## 规则

- 所有函数必须是纯函数（相同输入 → 相同输出，无副作用）
- 每个文件聚焦单一领域（crypto.util.ts、date.util.ts 等）
- 单元测试覆盖率 ≥ 80%

## FORBIDDEN

- 禁止 import Prisma Client
- 禁止依赖 `req`/`res` Express 对象
