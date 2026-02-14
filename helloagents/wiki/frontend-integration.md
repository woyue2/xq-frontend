# 前端集成与 E2E 联调规范（Playwright + 真实后端）

## 1. 目标与范围

- 保障前端在 **关闭 Mock**、连上 **真实后端 + 真实数据库** 的前提下，可以通过一键 E2E 测试覆盖核心业务链路：登录/注册、提问、审核、通知、点赞/收藏、评论、家长 & 课时权限等。
- 规范本地开发、联调、CI 环境中运行 Playwright 测试的前置条件与命令，避免错误地落入前端 Mock 路径。
- 本文适用于仓库根目录（前端） + `backend/`（后端 Node/Express + Prisma）协同环境。

---

## 2. 环境准备

### 2.1 Node / 依赖

- Node 版本：**>= 18**（同时适配前后端）
- 前端依赖安装（在仓库根目录）：
  - `npm install`
- 后端依赖安装：
  - `cd backend`
  - `npm install`

### 2.2 数据库与 Prisma

后端使用 Prisma 连接关系型数据库（推荐本地 Postgres）。E2E 测试依赖真实 DB Schema 与基础数据表。

1. 在 `backend/.env` 或通过 `BACKEND_ENV_PATH` 指定的 env 文件中，至少配置：
   - `NODE_ENV=development`
   - `PORT=4000`  
   - `DATABASE_URL=postgres://...`（或其他受支持的数据库 URL）
   - `REDIS_URL=redis://...`（可指向本地 Redis，E2E 不依赖复杂特性，仅需运行正常）
   - `JWT_SECRET=至少16位随机字符串`
2. 初始化/迁移数据库（在 `backend/` 下）：
   - `npm run prisma:migrate`  
   这会应用所有历史迁移（包括 Question/Answer/Comment/Interaction/Whitelist 等模型），确保测试所需表结构存在。

> 说明：当前 Playwright E2E 通过 `/api/internal/test-token` 自动创建/复用测试用户，不需要额外 seed 脚本；只要迁移成功，E2E 即可自造数据。

---

## 3. 后端服务启动规范

Playwright 测试默认通过 `BACKEND_BASE_URL` 访问后端；如未设置，则使用：

- `http://localhost:3000`（见 `tests/e2e/utils/bootstrapAuth.ts`）

推荐启动步骤：

```bash
cd backend
npm run dev    # 启动 Express + Prisma 后端，端口使用 env.PORT（建议 4000）
```

确认后端健康：

- 浏览器或 curl 访问 `http://localhost:3000/health`，应返回 `{"status":"ok",...}`。

如需自定义端口：

- 在 `backend/.env` 设置 `PORT=<自定义端口>`，并在运行 E2E 前设置：  
  `BACKEND_BASE_URL=http://localhost:<自定义端口>`

---

## 4. 前端 E2E 运行方式

### 4.1 Playwright 配置回顾

`playwright.config.ts` 中关键配置：

- `testDir: 'tests/e2e'`
- `webServer`：
  - `command: 'npm run dev -- --port 4173'`
  - `url: process.env.FRONTEND_BASE_URL || 'http://localhost:4173'`
  - `env: { ...process.env, VITE_USE_MOCK: 'false' }`  
    → **强制关闭前端 Mock**，所有请求都会走真实后端。

因此：

- 无需手动启动前端 dev 服务器，Playwright 会自动执行 `npm run dev -- --port 4173`，并等待可用后再开始测试。

### 4.2 全量 E2E

在仓库根目录执行：

```bash
# 确保 backend(端口 4000) 已经启动
cd backend
npm run dev

# 新开终端，回到仓库根目录
cd ..
npm run test:e2e
```

这将：

- 启动前端 dev server（端口 4173，禁用 Mock）；
- 使用默认 `BACKEND_BASE_URL=http://localhost:3000` 调用真实后端；
- 运行 `tests/e2e/*.spec.ts` 中全部用例。

### 4.3 只跑某些业务链路

常用子集示例（全部在仓库根目录执行）：

```bash
# 仅跑“学生角色端到端链路 + 点赞/收藏 + 评论持久化”
npm run test:e2e -- --project=chromium --grep "学生角色端到端业务链路"

# 仅跑“教师回答与我的回答列表”相关
npm run test:e2e -- --project=chromium --grep "教师回答与我的回答列表"

# 仅跑“角色注册与身份展示”（三种邀请码注册 + 个人中心角色 Badge）
npm run test:e2e -- --project=chromium --grep "角色注册与身份展示"
```

> 建议：本地开发调试时，先用 `--grep` 跑小范围回归；改动稳定后再执行一次完整 `npm run test:e2e`。

---

## 5. 与“去除 Mock 改造清单”的关系

本仓库前端 Mock 与真实后端联调规范详见：`helloagents/wiki/mock-integration-guidelines.md`。与本 E2E 规范的关系如下：

- Playwright E2E 已通过 `VITE_USE_MOCK=false` 强制走真实 API，确保：
  - 登录/注册、发送验证码；
  - 提问、审核、通知；
  - 点赞/收藏 + “我的点赞/我的收藏”列表；
  - 教师回答 + “我的回答”列表；
  - 评论创建 + 刷新后仍可见；
  - 家长 & 课时有效期权限防护；
  均经过真实后端与数据库链路验证。
- 前端残留 Mock（`src/lib/mock-data.ts` 等）仍用于单元测试或纯前端演示，不会出现在 E2E 路径中。

当继续根据《去除 Mock 与接入真实数据库改造清单》扩展功能时：

- 对于 **新增真实接口**（如新的“我的xx列表”），应优先在 Playwright 中补一条端到端用例，确保：
  1. 通过真实 API 创建/变更数据；
  2. 在对应前端页面中看到 UI 变化（列表、计数、状态等）。
- 对于 **调整后端降级策略**（例如生产环境不再静默忽略白名单/RefreshToken DB 错误），优先用 backend 集成测试覆盖；如行为会影响前端体验（错误提示变更），则再酌情增加 E2E。

---

## 6. 常见问题排查（FAQ）

1. **E2E 报错 `ECONNREFUSED` 或卡在 /health**  
   - 检查后台是否已启动：`cd backend && npm run dev`。  
   - 确认 `PORT` 与 `BACKEND_BASE_URL` 一致（默认后端 4000，前端测试使用 `http://localhost:3000`）。

2. **用例中报 401/UNAUTHORIZED**  
   - 检查 `/api/internal/test-token` 是否可用（生产环境禁止，测试环境需 `NODE_ENV !== 'production'`）。  
   - 确认 JWT_SECRET 未变更为与数据库中 Token 不兼容的值（本项目 E2E 会在每次运行前自动 upsert 测试用户，通常不需要手工干预）。

3. **页面看起来是 Mock 数据而非真实接口**  
   - 确认 Playwright 输出中已看到 `VITE_USE_MOCK=false` 注入（`playwright.config.ts` 已默认设置）。  
   - 若本地单独启动前端 dev 服务器调试，请手动在 `.env` 或运行命令中设置 `VITE_USE_MOCK=false`，以便行为与 E2E 保持一致。

---

## 7. 建议的日常流程

- **开发阶段**：
  - 后端改动 → 先跑 `backend` 的单元/集成测试（`cd backend && npm test`）。
  - 前端改动 → 先跑 Vitest 单测（`npm test`），再按需跑单条 Playwright 用例（`--grep`）。
- **功能合并前**：
  - 至少跑一次完整 `npm run test:e2e`，确认所有关键链路仍然通过。
- **联调/排障**：
  - 遇到“前端看起来成功但数据库无记录”类问题时，优先检查：
    - 是否开启了 Mock（E2E 默认不会）；
    - 对应链路是否已有 Playwright 覆盖；
    - 若无，则按本规范在 `tests/e2e` 中新增端到端用例，将问题固化为自动化回归。

---

## 8. 访问权限边界补充说明

- “我的提问状态列表”页面（`/my-questions/status/:status`，对应 `StatusListPage`）仅对已登录且非家长角色开放：
  - 未登录用户直接访问该路径时会被提示登录并重定向到登录页；
  - 家长角色访问该路径时会看到错误提示并被带回个人中心；
  - 页面内部通过当前登录用户 `authorId` 过滤问题列表，不会展示他人问题的状态。
- 管理后台页面 `/admin`（对应 `AdminManagementPage`）仅对老师账号开放：
  - 未登录用户访问时会收到“请先登录”提示并重定向到登录页；
  - 学生或家长角色访问时会收到“只有老师可以访问管理后台”提示并被带回个人中心；
  - 该防护属于前端兜底，入口本身仅在老师个人中心中展示。
- 通知中心 `/notifications`（对应 `NotificationsPage`）需要登录才能访问：
  - 未登录用户访问时会收到“请先登录”提示并重定向到登录页；
  - 登录后的学生、家长、老师均可查看各自的通知列表。
- “我的提问”页面 `/my-questions`（对应 `MyQuestionsPage`）也要求登录：
  - 未登录用户访问时会收到“请先登录”提示并重定向到登录页；
  - 登录后，页面通过当前用户 `authorId` 从后端拉取其全部提问（含待审核与已通过），并提供按状态跳转到 `/my-questions/status/:status` 的入口。
