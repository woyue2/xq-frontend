# tests/e2e 测试链路总计划（后端集成 + 前端 E2E）

> 目标：围绕「登录 → 提问 → 审核 → 通知」和「提问 → 我的问题列表 → 点赞/收藏 → 问题详情」两条核心业务链路，系统化设计正向 + 负面/边界测试，并在后端集成测试（Jest + supertest）与前端 E2E（Playwright）中自动执行，集中发现真正影响用户体验的 Bug。

---

## 一、测试范围与分层

- **后端集成测试（Jest + supertest）**
  - 运行位置：`backend/src/tests/integration/*.api.spec.ts`
  - 关注点：HTTP 接口契约、状态机与权限校验、错误码一致性、数据库副作用（创建/更新/通知等）。

- **前端 E2E 测试（Playwright）**
  - 运行位置：`tests/e2e/*.spec.ts`
  - 已有文件：
    - `login-page.spec.ts`：登录/注册页面基础交互与前端表单校验。
    - `main-flow.spec.ts`：学生免登录进入首页 + 诊断工具页面主流程。
    - `navigation-flow.spec.ts`：首页浮动按钮跳转提问页、头像跳转个人中心。
    - `auth-header.spec.ts`：验证携带后端下发 token 的 `Authorization` 头。
  - 关注点：UI 文案/引导、页面跳转、与后端接口的真实交互（含错误提示）。

---

## 二、链路一：登录 → 提问 → 审核 → 通知

### 2.1 正向主链路（Happy Path）

**后端集成测试（已有/补充）**
- 用例组：`FLOW-LAN-LOGIN-OK`（分散映射）
  - 登录 / 注册相关：
    - `AUTH-API-001 ~ 014`（`auth.api.spec.ts`、`auth-refresh-logout.api.spec.ts`）。
  - 提问相关：
    - `Q-API-001 ~ 003`、`Q-API-008/009`（`question.api.spec.ts`）。
  - 审核相关：
    - `AU-API-001 ~ 009`（`admin-audit.api.spec.ts` / `audit.api.spec.ts`）。
  - 通知相关：
    - `NOTIFICATION-API-001 ~ 003`（`notification.api.spec.ts`）。

> 说明：目前后端已覆盖主链路上的绝大多数 “接口级 Happy Path”，后续新增链路测试时可通过组合这些用例完成。

**前端 E2E（待补充）**
- `E2E-API-001 登录/注册全链路`（见 `codex-develop-doc/后端-测试用例.md` 第 15 章）：
  - 页面：`/login` / 首页。
  - 步骤：输入手机号 → 获取验证码 → 注册/登录 → 重载页面保持登录态。

### 2.2 负面/边界场景设计（后端集成）

在现有集成测试基础上，围绕整条链路补充以下**集中链路用例**（推荐新建 `backend/src/tests/integration/flow-login-question-audit-notification.api.spec.ts`）：

1. **FLOW-NEG-01 错误验证码登录 → 无法发起提问**
   - 步骤：
     1. `POST /api/auth/send-code` 获取验证码。
     2. 使用错误 `code` 调用 `POST /api/auth/login`，预期 `400/INVALID_CODE`。
     3. 不携带 token 调用 `POST /api/questions`，预期 `401/UNAUTHORIZED`。
   - 价值：验证登录失败时链路被正确阻断，且提问接口不会在无 token 情况下漏放行。

2. **FLOW-NEG-02 未在白名单手机号注册 → 登录受限**
   - 步骤：
     1. 未在 `UserWhitelist` 中的手机号，调用 `POST /api/auth/send-code`，type=register，预期 `403/NOT_IN_WHITELIST`。
     2. 即使持有 123456，也无法通过 `POST /api/auth/register` 创建用户（已有用例可复用）。
   - 价值：确认白名单从入口控制用户池，防止“野生账号”注册。

3. **FLOW-NEG-03 学生课时过期 → 提问被拒绝**
   - 步骤：
     1. 创建学生用户并设置 `expiresAt` 为过去时间；或通过 `admin-class-hours` 批量调整到过去。
     2. 用该学生登录获取 token。
     3. 调用 `POST /api/questions`，预期 `403/MEMBER_EXPIRED`。
   - 价值：验证 `requireActiveMembership` 对写操作的拦截在链路中正常生效。

4. **FLOW-NEG-04 家长/普通用户越权审核**
   - 步骤：
     1. 以家长 / 学生角色 token 调用 `GET /api/admin/audit/pending` → 预期 `403/PERMISSION_DENIED`。
     2. 调用 `POST /api/admin/audit/:id/approve` / `reject` → 同样 `403`。
   - 价值：防止非教师账号越权修改内容状态。

5. **FLOW-NEG-05 审核异常（缺少 reason / 非法 type）**
   - 步骤：
     1. 对 `POST /api/admin/audit/:id/reject` 传空 `reason` → 预期 `400/REASON_REQUIRED`（已有用例，可在链路中引用）。
     2. 对 `POST /api/admin/audit/:id/approve` 传未知 `type` → 预期 `400/VALIDATION_ERROR`。
   - 价值：避免审核操作被“半吊子参数”驱动，保证审核日志可追溯。

6. **FLOW-NEG-06 AI 回调未授权/参数异常 → 不影响主流程**
   - 步骤：
     1. 在配置了 `AI_INTERNAL_TOKEN` 情况下，不带 `X-Internal-Token` 调用 `POST /api/internal/ai-check` → 预期 `403/INTERNAL_ACCESS_DENIED`。
     2. 传入缺少 `targetType`/`result` 的 payload → `400/VALIDATION_ERROR`。
   - 价值：确保内部接口不会被外部随意调用，同时对脏 payload 保持防御。

7. **FLOW-NEG-07 通知读取异常场景**
   - 步骤：
     1. 未登录状态调用 `GET /api/notifications` → `401/UNAUTHORIZED`。
     2. 学生 A 登录，尝试读取学生 B 的通知（若有相关接口）→ 应统一 `403/PERMISSION_DENIED` 或只返回当前用户通知。
   - 价值：避免通知泄露给错误用户。

> 所有上述用例需在链路测试文件中串联使用已存在的 service/helper，统一以“打断点”的形式验证：链路在错误处被阻断，且不会产生错误的副作用（如多余的 Question/Notification 记录）。

---

## 三、链路二：提问 → 我的问题列表 → 点赞/收藏 → 问题详情

### 3.1 正向主链路（后端集成）

推荐新建或扩展流式测试文件（例如 `flow-question-like-favorite.api.spec.ts`），串联以下步骤：

1. 创建学生用户并登录，获得 `accessToken`。
2. `POST /api/questions` 创建问题（pending）。
3. 教师账号审核通过该问题（`POST /api/admin/audit/:id/approve`）。
4. 学生调用 `GET /api/questions?authorId=self` 或已有“我的问题”接口（如无则通过 tags/标题过滤模拟），验证至少包含刚创建的问题。
5. 学生调用：
   - `POST /api/questions/:id/like`（两次，验证 `isLiked` 切换 + likes 计数变更）。
   - `POST /api/questions/:id/favorite`（两次，验证 favorites 计数）。
6. 再次 `GET /api/questions/:id`，验证：
   - `isLiked`、`isFavorited` 字段与操作一致；
   - likes/favorites/comments/answers 计数正确。

### 3.2 负面/边界场景（后端集成）

1. **FLOW-NEG-08 未登录点赞/收藏**
   - 直接调用 `POST /api/questions/:id/like` / `favorite`，无 Authorization → `401/UNAUTHORIZED`。
2. **FLOW-NEG-09 点赞/收藏不存在的问题**
   - 对不存在的 `questionId` 调用 → `404/QUESTION_NOT_FOUND`。
3. **FLOW-NEG-10 课时过期点赞/收藏**
   - 将学生课时设置为过期后，继续调用点赞/收藏接口 → 预期仍 `200` 且逻辑正确（与“课时过期仅限制写内容，不限制互动行为”的需求保持一致）。

### 3.3 前端 E2E 衔接（Playwright）

可在 `tests/e2e` 新增如 `question-like-flow.spec.ts`，执行：

1. 使用 `bootstrapAuth(page, 'student')` 免登录写入 `auth-storage`。
2. 打开 `/`，通过 UI 提问一次（或在 dev 环境预置已审核问题，跳过审核步骤）。
3. 在「我的问题」页面（或筛选条件）中找到该问题。
4. 在 UI 上点击点赞/收藏按钮，并断言：
   - 图标/文案状态变化；
   - 打开详情页时 `isLiked`/`isFavorited` 对应 UI 状态一致；
   - 如有计数展示，则数字同步更新。

---

## 四、实施与优先级建议

1. **短期（P0）优先落地下列后端链路用例：**
   - FLOW-NEG-01/02/03/04/05（登录/白名单/课时/审核越权 + 审核参数异常）。
   - FLOW-NEG-08/09（点赞/收藏未登录/不存在问题）。
2. **中期（P1）补充：**
   - FLOW-NEG-06（AI 回调未授权/参数错误）。
   - FLOW-NEG-07（通知读取越权）。
   - FLOW-NEG-10（课时过期下的点赞/收藏容错验证）。
3. **前端 E2E（与现有 Playwright 测试对齐）：**
   - 在 `tests/e2e` 下以本文件用例 ID 为注释补充对应 spec，尽量复用 `bootstrapAuth` 辅助函数，减少重复登录、造数逻辑。

> 所有新增后端链路测试应在 CI 中随 `npm test` 一起运行，并将用例 ID（如 FLOW-NEG-xx）记录到 `codex-develop-doc/后端-测试用例.md` 对应章节，保持测试文档与自动化实现的一致性。*** End Patch***```"/>
