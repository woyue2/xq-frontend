# src/layouts/ — 布局框架组件

> **GEB Level: L3** | 父文档：[src/CLAUDE.md](../CLAUDE.md)

## 职责

路由级导航壳：侧边栏、底部 Tab 栏、通用 Header，被 App.tsx/Router 挂载。

## 文件清单

| 文件 | 职责 |
|---|---|
| `MainLayout.tsx` | 主导航布局（侧边栏 + 顶部栏），包含 `NavItem` 子组件 |
| `AuthLayout.tsx` | 未登录态页面（登录/注册）外层布局容器 |

## 质量红线

- 布局组件 ≤ 200 行
- 子组件（如 `NavItem`）必须定义具体 Props interface，禁止使用 `: any`
- 布局组件不得包含业务逻辑（权限、数据获取等）

## FORBIDDEN

- 禁止在布局层直接调用 service
- 禁止在布局层维护业务 state
