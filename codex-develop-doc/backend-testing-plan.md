# 知识星球问答小程序 - 后端测试实现计划（与《后端-测试用例.md》对齐）

> 目标：整体测试覆盖率 ≥ 85%，关键业务路径 100%，并确保《后端-测试用例.md》中的所有测试用例均有对应自动化实现。

---

## 1. 覆盖策略与指标

- 覆盖指标：
  - 行覆盖率 ≥ 85%
  - 分支覆盖率 ≥ 80%
  - 关键路径（登录、白名单、课时、问题创建与审核、行为埋点、上传等）接口级用例 100% 覆盖。

- 测试分层：
  - 单元测试（unit）：Service/Repository/工具函数。
  - 集成测试（integration）：HTTP 接口 + 数据库联动。
  - E2E/契约测试：完整业务流程（可使用 Postman/Newman 或自研脚本）。

---

## 2. 测试目录与命名约定

```bash
backend/
└── src/
    └── tests/
        ├── unit/
        │   ├── auth.service.spec.ts
        │   ├── question.service.spec.ts
        │   ├── whitelist.service.spec.ts
        │   └── ...
        ├── integration/
        │   ├── auth.api.spec.ts
        │   ├── question.api.spec.ts
        │   ├── behavior.api.spec.ts
        │   └── ...
        └── e2e/
            ├── student-flow.e2e.spec.ts
            ├── teacher-flow.e2e.spec.ts
            └── ...
```

---

## 3. 与《后端-测试用例.md》的映射

> 建议在实现过程中为每个自动化用例标注原始测试用例 ID。

- 用户认证模块
  - `AUTH-API-001 ~ AUTH-API-0xx` → `integration/auth.api.spec.ts`
  - 单元测试覆盖：验证码生成/验证、JWT 生成与解析、限流逻辑。

- 白名单与课时管理
  - `WHITELIST-API-*`、`TIME-API-*` → `integration/whitelist.api.spec.ts`
  - 关键新增建议用例：
    - `AUTH-API-015`：白名单外手机号登录失败。
    - `AUTH-API-016`：课时过期用户写操作被拒绝（返回 `MEMBER_EXPIRED`）。

- 问题/回答/评论/点赞收藏
  - `Q-API-*`、`ANS-API-*`、`CMT-API-*`、`LIKE-API-*` → 分别映射到 question/answer/comment/interaction 相关测试文件。
  - 单元测试重点：
    - 状态机逻辑（pending/approved/rejected）。
    - 计数维护与事务控制。

- 审核管理与 AI 回调
  - `AUDIT-API-*`、`AI-API-*` → `integration/audit.api.spec.ts`。
  - E2E 场景包含：问题创建→AI 回调→审核结果落地→前端可见状态变更。

- 文件上传
  - `UPLOAD-API-*` → `integration/upload.api.spec.ts`。
  - 覆盖签名生成、非法类型/过大文件拒绝等。

- 权限控制 / 安全 / 性能
  - 权限控制用例 → 各模块集成测试中覆盖（非管理员访问管理员接口等）。
  - 安全用例（SQL 注入/XSS/CSRF/暴力破解） → 单独的 `integration/security.api.spec.ts`。
  - 性能相关 → 使用压测工具（如 k6/JMeter），结果记录在测试报告中。

---

## 4. CI 中的测试执行与门禁

- `package.json` 示例脚本（可按实际调整）：

```json
{
  "scripts": {
    "test": "jest --runInBand",
    "test:unit": "jest --runInBand --testPathPattern=unit",
    "test:integration": "jest --runInBand --testPathPattern=integration",
    "test:e2e": "node ./scripts/run-e2e.js",
    "test:coverage": "jest --coverage"
  }
}
```

- CI 步骤：
  1. 安装依赖。
  2. 启动测试数据库（Docker 容器）。
  3. 执行数据库迁移与种子脚本。
  4. 执行 `test:coverage`（单元 + 集成）。
  5. 执行 `test:e2e` 或 `newman run`。
  6. 检查覆盖率门槛；若未达标则构建失败。

---

## 5. 需在《后端-测试用例.md》中补充记录的新增用例（示例）

> 以下为在分析现有测试文档时发现的潜在缺口，应在文档中新增对应条目，并在实现时同步自动化。

- `AUTH-API-015`：白名单外手机号登录失败
  - 预期：返回 403，错误码 `WHITELIST_REQUIRED`。

- `AUTH-API-016`：课时过期用户写操作被拒绝
  - 流程：登录获取 token → 调用 `POST /api/questions`。
  - 预期：接口返回 403，错误码 `MEMBER_EXPIRED`。

- `BEHAVIOR-API-003`：行为日志高频上报限流
  - 场景：短时间内连续调用 `/api/behavior/log`。
  - 预期：部分请求返回 429，错误码 `RATE_LIMITED`。

- `NOTIFICATION-API-001`：获取通知列表
- `NOTIFICATION-API-002`：获取未读通知数量
- `NOTIFICATION-API-003`：标记通知已读后未读数减少

- `SEC-API-006`：权限绕过测试
  - 场景：学生角色调用管理员接口（如白名单管理、审核接口）。
  - 预期：统一返回 403，错误码 `FORBIDDEN`。

---

## 6. 测试报告与追踪

- 每次发布前输出一份测试报告：
  - 覆盖率统计（按模块/文件维度）。
  - `后端-测试用例.md` 中所有用例的执行状态。
  - 新增用例列表与原因说明。

- 建议：
  - 在测试实现中使用注释标记原始用例 ID，例如：

```ts
// 用例：AUTH-API-001 正常发送验证码
it('should send verification code normally', async () => {
  // ...
});
```

---

> 本文件为 Codex 内部开发测试实施指南，实际执行中如发现测试文档与需求不一致，应优先以需求与代码为准，并同步更新《后端-测试用例.md》。

