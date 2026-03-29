# src/pages/ — 路由级页面

> **GEB Level: L3** | 父文档：[src/CLAUDE.md](../CLAUDE.md)

## 职责

每个文件对应一个路由，是用户可见的顶层视图组件。

## 文件清单（19 个）

| 文件 | 路由 | 角色限制 |
|---|---|---|
| `LoginPage.tsx` | `/login` | 公开 |
| `HomePage.tsx` | `/` | 公开（游客可只读） |
| `CreateQuestionPage.tsx` | `/create` | 学生/家长 |
| `QuestionDetailPage.tsx` | `/question/:id` | 已登录 |
| `AnswerQuestionPage.tsx` | `/answer/:id` | 教师 |
| `AuditPage.tsx` | `/audit` | 教师 |
| `AdminManagementPage.tsx` | `/admin` | 教师 |
| `ProfilePage.tsx` | `/profile` | 已登录 |
| `MyQuestionsPage.tsx` | `/my-questions` | 学生 |
| `MyAnswersPage.tsx` | `/my-answers` | 教师 |
| `MyLikesPage.tsx` | `/my-likes` | 已登录 |
| `MyFavoritesPage.tsx` | `/my-favorites` | 已登录 |
| `NotificationsPage.tsx` | `/notifications` | 已登录 |
| `GoodQuestionsPage.tsx` | `/good-questions` | 已登录 |
| `ParentQuestionPage.tsx` | `/parent/questions` | 家长 |
| `StatusListPage.tsx` | `/status` | 教师 |
| `StudentHistoryPage.tsx` | `/student/:id/questions` | 教师 |
| `DiagnosticPage.tsx` | `/diagnostic` | 教师 |
| `TestApiPage.tsx` | `/test-api` | 开发调试 |

## 质量红线

- 每个页面文件 ≤ 800 行
- 页面函数体 ≤ 200 行（业务逻辑必须下沉到 hooks/）
- 禁止在页面内直接调用 `api.ts` 方法（通过 hooks 间接调用）
- 禁止在同一页面定义超过 5 个 `useState`（超过则提取自定义 hook）

## FORBIDDEN

- 不得在页面间互相 import
- 禁止硬编码路由字符串（应使用常量）
