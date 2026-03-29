# src/services/ — HTTP 服务层

> **GEB Level: L3** | 父文档：[src/CLAUDE.md](../CLAUDE.md)

## 职责

所有 HTTP 请求的封装层。页面和 Hook 通过此层调用后端 API，不允许直接使用 axios。

## 文件清单

| 文件 | 职责 |
|---|---|
| `http.ts` | axios 实例 + request/response 拦截器（含 Mock 拦截器） |
| `auth.service.ts` | authService（登录/注册/发码）+ userService（更新 Profile） |
| `question.service.ts` | questionService（问题 CRUD + 图片/音频上传） |
| `interaction.service.ts` | interactionService（点赞/收藏）+ behaviorService（行为埋点） |
| `notification.service.ts` | notificationService（通知）+ configService（维度配置） |
| `admin.service.ts` | adminService + auditService + answerService + commentService + profileService + classHoursService |
| `api.ts` | ⚠️ Re-export 桶文件，向后兼容所有现有 import，禁止在此添加业务逻辑 |
| `parentService.ts` | 家长子功能服务（独立文件，通过 api.ts 统一导出） |

## 质量红线

- 每个 service 文件 ≤ 800 行
- 禁止在 service 层使用 `useState` / `useEffect`（service 是纯函数集合）
- 返回值类型必须明确，禁止返回 `any`
- 错误统一由 `http.ts` 的 response interceptor 处理，service 层 `catch` 只做特殊逻辑

## FORBIDDEN

- 不得在此层操作 DOM
- 不得引用 React 或 JSX
- 禁止 `import ... from './api'` 的自我循环引用
