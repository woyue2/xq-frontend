# src/stores/ — Zustand 全局状态

> **GEB Level: L3** | 父文档：[src/CLAUDE.md](../CLAUDE.md)

## 职责

基于 Zustand 的全局客户端状态，仅存放**跨页面共享**的持久化数据。

## 文件清单

| 文件 | 职责 |
|---|---|
| `useAuthStore.ts` | 登录用户信息 + token，`zustand/persist` 持久化至 `localStorage` |

## 质量红线

- 目录内文件 ≤ 3 个（每个 store 文件 ≤ 200 行）
- Store 只存**最小必要**状态，派生数据通过 `selector` 计算
- 禁止在 store `action` 内部直接调用 service（由 hook 或页面调用完后更新 store）

## FORBIDDEN

- 禁止在 store 内引入 React 组件
- 禁止跨 store 互相 import
