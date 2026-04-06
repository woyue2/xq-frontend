# 实现计划：密码错误 Toast 提示

## 概述

在 `useLogin` hook 的密码登录 `catch` 块中添加专项错误处理逻辑，对 HTTP 401 展示"密码错误，请重新输入"的 toast，替代当前依赖 axios 拦截器的通用处理方式。

## 任务

- [x] 1. 修改 `useLogin.ts` 的密码登录错误处理逻辑
  - 在 `handleSubmit` 的 `catch` 块中，针对 `loginMode === 'password'` 分支添加错误类型判断
  - 当 `error.response?.status === 401` 时，调用 `toast.error('密码错误，请重新输入', { duration: 4000 })`
  - 当响应体包含非空 `message` 字段（非 401 业务错误）时，调用 `toast.error(message, { duration: 4000 })`
  - 其他错误（500、网络超时）不在此处处理，保持由拦截器兜底
  - _需求：1.1、1.2、1.3、1.5、2.1、2.2_

  - [x] 1.1 为密码登录错误处理编写单元测试
    - 测试 401 时 `toast.error` 被调用且参数为"密码错误，请重新输入"
    - 测试 500 时 `toast.error` 不被调用（由拦截器处理）
    - 测试 `duration` 配置为 4000ms
    - _需求：1.1、1.2、2.2_

  - [x] 1.2 编写属性测试：属性 1 — 密码错误时展示专项 toast
    - **属性 1：密码错误时展示专项 toast**
    - **验证：需求 1.1、1.2、2.1**
    - 使用 `fc.string()` 生成任意 phone/password，mock `authService.passwordLogin` 返回 401，断言 `toast.error` 被调用且内容为"密码错误，请重新输入"

  - [x] 1.3 编写属性测试：属性 2 — 业务错误展示后端 message
    - **属性 2：业务错误展示后端 message**
    - **验证：需求 1.3**
    - 使用 `fc.string({ minLength: 1 })` 生成任意 message，mock 返回含 message 的非 401 错误，断言 toast 内容与 message 完全一致

  - [x] 1.4 编写属性测试：属性 4 — 非密码错误不展示密码错误提示
    - **属性 4：非密码错误不展示密码错误提示**
    - **验证：需求 1.5**
    - 使用 `fc.constantFrom(500, 503, 0)` 生成非 401 状态码，断言 `toast.error` 未被调用或内容不为"密码错误，请重新输入"

- [x] 2. 验证密码输入框在登录失败后保持可编辑状态
  - 确认 `handleSubmit` 的 `catch` 块中未对 `password` 字段设置 `disabled` 状态
  - 确认登录失败后 `password` state 未被清空（用户可直接修改重试）
  - _需求：1.4、2.4_

  - [x] 2.1 编写属性测试：属性 3 — toast 展示期间输入框保持可编辑
    - **属性 3：toast 展示期间输入框保持可编辑**
    - **验证：需求 1.4**
    - 触发登录失败后，断言密码输入框 `disabled` 属性为 `false`

- [x] 3. 检查点 — 确保所有测试通过
  - 确保所有测试通过，如有疑问请向用户确认。

- [x] 4. 验证 toast 替换行为（重复提交场景）
  - 确认 `sonner` 的 `toast.error` 在连续调用时会自动替换同类型 toast，无需手动调用 `toast.dismiss()`
  - 如需手动管理，在 `handleSubmit` 入口处添加 `toast.dismiss()` 调用
  - _需求：2.3_

  - [x] 4.1 编写属性测试：属性 5 — 重复提交时 toast 被替换
    - **属性 5：重复提交时 toast 被替换**
    - **验证：需求 2.3**
    - 使用 `fc.integer({ min: 2, max: 5 })` 生成连续失败次数，断言页面上只存在一个错误 toast

- [x] 5. 最终检查点 — 确保所有测试通过
  - 确保所有测试通过，如有疑问请向用户确认。

## 备注

- 标有 `*` 的子任务为可选项，可跳过以加快 MVP 交付
- 每个任务均引用具体需求条目以保证可追溯性
- 属性测试使用 `fast-check` + `vitest` 集成，每个属性最少运行 100 次迭代
- 拦截器（`http.ts`）无需修改，401 场景不会产生重复 toast
