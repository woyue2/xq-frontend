# src/hooks/ — 可复用 React Hooks

> **GEB Level: L3** | 父文档：[src/CLAUDE.md](../CLAUDE.md)

## 职责

跨页面/跨组件的状态逻辑复用层。页面通过 hook 间接访问 service 和 store。

## 文件清单

| 文件 | 职责 |
|---|---|
| `useDebounce.ts` | 通用防抖 hook |
| `useQuestions.ts` | 问题列表查询（wrap TanStack Query） |
| `useAdminWhitelist.ts` | 管理员白名单全量 state + API 逻辑 |
| `useQuestionDetail.ts` | 问题详情、答案、评论、点赞、音频播放逻辑；支持 `onRequireLogin` 回调（游客互动引导） |
| `useAdminDimension.ts` | 题目维度（method）配置 state + CRUD handler |
| `useLogin.ts` | 登录/注册页全量 state、倒计时、表单验证、提交逻辑 |
| `useProfile.ts` | 个人主页 state、头像/昵称/密码更新、家长绑定逻辑 |
| `useAudit.ts` | 审核页全量 state + API 交互逻辑（问题/评论审核、打分、驳回） |
| `useAdminSubject.ts` | 科目/考点配置全量 state + CRUD handler |
| `useSafeSubmit.ts` | 防重复提交Hook（useAntiSpam/safeSubmit等） |

## 质量红线

- 每个 hook 文件 ≤ 200 行
- hook 必须以 `use` 开头
- hook 只 return 需要的最小接口（避免 return 整个 state 对象）
- 禁止在 hook 内渲染 JSX

## 添加新 hook 的条件

满足以下任一条件才需要新建 hook 文件：
1. 相同逻辑在 ≥ 2 个页面重复出现
2. 单个页面组件中 `useState` ≥ 5 个
3. `useEffect` 逻辑超过 20 行
