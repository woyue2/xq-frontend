# backend/src/services/ — 后端业务逻辑层

> **GEB Level: L3** | 父文档：[backend/src/CLAUDE.md](../CLAUDE.md)

## 职责

所有 Prisma 查询和业务规则的实现层。

## 规则

- 每个 service 函数只做**一件**事
- 所有 Prisma 操作放在此层，routes 层和 utils 层不得直接访问数据库
- 函数体 ≤ 30 行（复杂流程拆分为私有 helper 函数）
- 使用事务（`prisma.$transaction`）保证原子性

## FORBIDDEN

- 禁止在 service 层直接访问 `req`/`res`（只传纯参数）
- 禁止硬编码 SQL 字符串（必须通过 Prisma ORM）
