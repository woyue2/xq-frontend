# 去除 Mock 与接入真实数据库改造清单

> 目标：系统性识别当前仍依赖 Mock / 本地状态的功能点，明确哪些没有真正落到数据库，并给出后续改造优先级。

---

## 1. 全局 Mock 开关

- 位置：`src/services/api.ts`
- 开关变量：`VITE_USE_MOCK`（来自环境变量 `import.meta.env.VITE_USE_MOCK`）
- 行为：
  - 当 `VITE_USE_MOCK === 'true'` 时：
    - 所有 axios 请求进入 Mock 拦截器；
    - 登录、提问、家长端、点赞/收藏、行为日志、上传签名等全部从前端 mock 数据返回结果，不会访问后端，也不会写入数据库。
  - 当 `VITE_USE_MOCK !== 'true'` 时：
    - 才会真正调用后端 API，经由后端服务落库。

✅ 结论：要联调真实数据库或跑 E2E，需要**关闭** `VITE_USE_MOCK`，否则前端所有行为都只是“演示态”，不触达数据库。

---

## 2. 前端仍在使用 Mock / 本地状态的功能

### 2.1 登录页 Mock 分支

- 文件：`src/pages/LoginPage.tsx`
- 逻辑：
  - `handleSubmit` 中存在两条分支：
    1. 分支 1：`USE_MOCK === true`
       - 使用 `mockUsers` / `mockChildren` 在前端构造用户与孩子绑定关系；
       - 调用 `login(user, 'mock-jwt-token')`，仅更新前端状态；
       - **不访问后端**，不落数据库。
    2. 分支 2：`USE_MOCK !== true`
       - 调用 `authService.login` / `authService.register`；
       - 走真实后端与数据库。

⚠️ 当前风险：在开发时如果长期开启 `VITE_USE_MOCK`，会导致：
- “以为已经注册/登录成功”，但数据库里并不存在对应用户；
- 后端统计、白名单联动等逻辑无法验证。

---

### 2.2 问题详情页：评论提交仅存在于前端内存

- 文件：`src/pages/QuestionDetailPage.tsx`
- 点赞 / 收藏：
  - 使用 `interactionService.like` / `interactionService.favorite` + `behaviorService.log`；
  - 在非 mock 模式下会调用真实后端，最终写入数据库（点赞/收藏/行为日志）。
- 评论发布（`handleSubmitComment`）：
  - 只在前端创建一个 `Comment` 对象，追加到本地 `comments` 状态；
  - 弹出 `toast.success('评论已提交，等待审核')`；
  - **没有调用任何后端评论相关 API**，也不会写入数据库。

⚠️ 当前状态：评论功能为“假提交”——页面刷新后评论消失，后端和数据库完全无记录。

---

### 2.3 我的回答 / 我的点赞 / 我的收藏：全部基于前端 Mock

1. **我的回答**
   - 文件：`src/pages/MyAnswersPage.tsx`
   - 数据来源：`mockAnswers` + `mockQuestions`（来自 `src/lib/mock-data.ts`）
   - 未调用任何 service / API。

2. **我的点赞**
   - 文件：`src/pages/MyLikesPage.tsx`
   - 顶部注释说明：“模拟点赞数据 - 实际应从 API 或 store 获取”；
   - 使用本文件内的 `mockLikedQuestions` 常量。

3. **我的收藏**
   - 文件：`src/pages/MyFavoritesPage.tsx`
   - 使用本文件内的 `mockFavoriteQuestions` 常量。

⚠️ 当前状态：这三个页面都是纯 UI Demo：
- 列表数据固定写死在前端；
- 与真实后端和数据库完全解耦；
- 用户真实点赞/收藏记录不会在这里体现。

---

### 2.4 前端公共 Mock 数据与工具

- 文件：`src/lib/mock-data.ts`
  - 定义 `mockUsers` / `mockQuestions` / `mockAnswers` / `mockChildren` 等；
  - 用于：登录 Demo、问题列表 Demo、家长端 Demo、“我的回答”等。
- 文件：`src/lib/test-runner.ts`
  - 基于 mock 数据模拟多个“前端自测场景”（不连后端）。

这些文件本身是为“演示 / 开发”设计，**问题不在于存在本身，而在于生产/联调场景是否误用**。

---

## 3. 后端：有“降级 / 不强制写库”的关键点

> 说明：这些地方已经对接了 Prisma，但出于开发/测试体验考虑，部分失败会被吞掉或退化为“内存行为”，导致前端看起来成功而数据库没有对应记录。

### 3.1 登录验证码：验证码记录可“空保存”

- 文件：`backend/src/services/auth.service.ts`
- 函数：`sendLoginCode`
- 行为：
  - 验证码固定为 `123456`（`FIXED_CODE`），便于联调；
  - 将验证码写入 `verificationCode` 表的逻辑包在 `try/catch` 中：
    ```ts
    try {
      await prisma.verificationCode.create({ ... });
    } catch {
      // 在本地/测试环境无数据库时不影响主流程
    }
    ```
  - 如果数据库不可用，接口仍返回“发送成功”，但数据库中**没有验证码记录**。

影响：随后 `login` 会去查验证码记录，如果 DB 不可用/表缺失，可能出现“前端以为发码成功但实际上无法登录”的非对称状态。

---

### 3.2 注册：用户与 RefreshToken 的“内存降级”

- 文件：`backend/src/services/auth.service.ts`
- 行为：
  - 创建用户：
    ```ts
    try {
      user = await prisma.user.create({ ... });
    } catch {
      // 降级为内存用户
      user = { ... } as any;
    }
    ```
  - 保存 RefreshToken：
    ```ts
    try {
      await prisma.refreshToken.create({ ... });
    } catch {
      // 忽略本地/测试环境下的数据库错误
    }
    ```
  - 在 catch 分支中，会构造一个“内存用户对象”，仍然生成 accessToken 和 refreshToken 返回前端。

影响：在数据库异常时，前端感觉“注册成功并拿到了 token”，但：
- `user` 不在数据库里；
- `refreshToken` 也可能没有持久化；
- 后续涉及用户查询 / 刷新 token / 课时等逻辑可能不一致。

---

### 3.3 白名单 / RefreshToken 检查的降级

- 白名单：
  - 多处 `prisma.userWhitelist.findUnique(...)` 包在 `try/catch` 中，如果出现异常会直接忽略并走默认角色逻辑。
- RefreshToken：
  - 校验时若 `prisma.refreshToken.*` 抛错，会退化为**仅依赖 JWT 过期时间**。

影响：在数据库表缺失或出错时，安全性与一致性会下降，但这是刻意的开发/测试降级策略。

---

## 4. 已经接到真实数据库的关键链路（对照用）

> 这些链路在正常 DB 环境下会真实读写数据库。

- 问题创建与查询：`question.routes.ts` + `question.service.ts` → `question` 表；
- 点赞 / 收藏：`interaction.routes.ts` 相关服务 → `like` / `favorite` 等表；
- 行为日志：`behavior.routes.ts` → `behaviorLogService.logSingle` → `behaviorLog` 表；
- 审核与 AI 回调：`admin-audit.routes.ts`、`internal.routes.ts` `/ai-check` → `question` / `answer` / `comment` 表；
- 课时与会员：`class-hours.service.ts` → `user` / `userWhitelist` 表等。

---

## 5. 去除 Mock 的建议改造顺序（草案）

1. **统一联调开关**
   - 约定：联调 / 测试环境必须设置 `VITE_USE_MOCK=false`；
   - 在部署文档中强调：只在纯前端体验 Demo 时才可开启 Mock。

2. **接通“我的回答 / 我的点赞 / 我的收藏”**
   - 为这三页新增真实接口（或复用现有 `/users/me/likes|favorites` 等接口）；
   - 渐进式地把 `mock*Questions` 替换为从后端拉取的分页数据。

3. **为评论发布接后端接口**
   - 在后端补充 `POST /comments` 等接口（若尚未实现），将 `QuestionDetailPage` 的 `handleSubmitComment` 接上；
   - 确保审核状态、AI 回调与前端显示完全打通。

4. **收紧后端降级逻辑（按环境）**
   - 在 `auth.service.ts` 中，根据 `NODE_ENV` 控制：  
     - `production` 环境禁止“内存用户降级”，数据库异常必须抛错；  
     - `development/test` 环境保留当前降级策略，保证本地体验。

5. **补充监控与结构化日志依赖**
   - 利用现有结构化日志：对“mock/降级路径”输出明显的 `mode` 字段（如 `mode: 'mock' | 'degraded' | 'normal'`），方便后续排查日志时快速区分。

---

## 6. 后续工作建议

- 在 `helloagents/wiki/mock-integration-guidelines.md` 中维护《Mock 功能与真实数据库联调规范》，将本清单转化为正式规范性文档；
- 每完成一块 Mock 改造（例如“我的点赞”改造为真实接口）后，同步更新本文件与规范文档中的对应章节，保持“清单与规范”的一致；
- 在 E2E 测试中，优先覆盖“真实接口路径”而非 Mock 路径，并通过 `npm run test:e2e` 利用 `playwright.config.ts` 中强制 `VITE_USE_MOCK=false` 的配置，确保去除 Mock 后端到端链路可用。  
