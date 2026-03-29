等真的有用再重构把，有用户用了再说吧。

# 重构路线：Vite + Supabase 迁移路线图

> **目标**：将现有 `Vite + React + Express + Prisma + PostgreSQL` 架构迁移至
> `Vite + React + Supabase`，实现 Vercel（前端）+ Supabase（后端即服务）完全免费部署。
>
> **原则**：分阶段、可回滚、最小风险。每个阶段完成后都可独立上线，不阻塞后续开发。

---

## 总览

```
阶段 0 → 阶段 1 → 阶段 2 → 阶段 3 → 阶段 4 → 阶段 5
环境准备  数据库迁移  文件存储  鉴权替换  API迁移  废弃Express
（1天）  （3-5天）  （2-3天）  （1-2周）  （2-3周）  （1-2天）
```

**预计总工时（1人兼职）：6-10 周**

---

## 阶段 0：环境准备与评估
> 预计时间：1 天 | 风险：🟢 低

### 任务清单

- [ ] 注册 Supabase 账号，创建项目（选新加坡或其他亚洲区节点）
- [ ] 注册 Vercel 账号，连接 GitHub 仓库
- [ ] 记录当前所有环境变量（`.env.backend.example`）
- [ ] 在 Supabase Dashboard 确认：
  - [ ] Database 连接字符串（`DATABASE_URL`）
  - [ ] Service Role Key（后端用）
  - [ ] Anon Key（前端用）
- [ ] 确认短信供应商选型（阿里云短信 或 Twilio），用于 Supabase Auth 手机号登录

### 产出
- Supabase 项目已创建，可获取连接信息
- Vercel 项目已关联 Git 仓库，可自动构建前端

---

## 阶段 1：数据库迁移到 Supabase（最低风险）
> 预计时间：3-5 天 | 风险：🟢 低 | **Express 后端保持不动**

### 策略
Supabase 底层就是 PostgreSQL，只需把 `DATABASE_URL` 指向 Supabase，
**Prisma Schema 几乎零改动**，可直接复用。

### 任务清单

- [ ] 将 `backend/.env` 中 `DATABASE_URL` 指向 Supabase PostgreSQL
- [ ] 在 Supabase 上执行 Prisma Migrate：
  ```bash
  cd backend
  npx prisma migrate deploy     # 将现有 migrations 应用到 Supabase
  npx prisma db push            # 或用 db push 快速同步
  ```
- [ ] 迁移现有数据（如有生产数据）：
  ```bash
  # 旧库导出
  pg_dump -h <OLD_HOST> -U <USER> -d <DB> -f backup.sql
  # 导入到 Supabase
  psql -h <SUPABASE_HOST> -U postgres -d postgres -f backup.sql
  ```
- [ ] 运行后端测试，验证数据读写正常：
  ```bash
  cd backend && npm run test
  ```
- [ ] 运行 seed 脚本，确保维度数据完整：
  ```bash
  npm run seed:question-dimensions
  npm run seed:admin
  ```

### 验收标准
- Express 后端连接 Supabase PostgreSQL 正常
- 所有 Jest 集成测试通过
- 数据无丢失

### ⚠️ 注意事项
- Supabase 免费版数据库限制 500MB，评估现有数据量
- Supabase 默认开启 Row Level Security (RLS)，**需要在 Dashboard 中对各表关闭 RLS** 或为 `service_role` 设置绕过策略（因为后端用 service role 调用，不走 RLS）

---

## 阶段 2：文件存储迁移到 Supabase Storage
> 预计时间：2-3 天 | 风险：🟡 中 | Express 后端继续处理上传逻辑

### 策略
将 `upload.routes.ts` 中的文件存储目标从本地/云存储改为 Supabase Storage。
前端上传接口不变，只改后端存储层。

### 任务清单

- [ ] 在 Supabase Dashboard 创建 Storage Bucket：
  - `question-images`（问题图片）
  - `answer-images`（答案图片）
  - `avatars`（用户头像）
- [ ] 配置 Bucket 公开策略（图片需要公开访问）
- [ ] 改造 `backend/src/routes/upload.routes.ts`：
  ```typescript
  // 原来：保存到本地或其他存储
  // 改为：上传到 Supabase Storage
  import { createClient } from '@supabase/supabase-js'
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // upload 逻辑替换
  const { data, error } = await supabase.storage
    .from('question-images')
    .upload(fileName, fileBuffer, { contentType: mimeType })
  ```
- [ ] 更新返回的文件 URL 格式为 Supabase Storage 公开 URL
- [ ] 测试图片上传、显示流程

### 验收标准
- 图片上传后在前端正常显示
- Supabase Storage Dashboard 中可看到上传文件

---

## 阶段 3：鉴权体系迁移（最复杂，需谨慎）
> 预计时间：1-2 周 | 风险：🔴 高

### 策略
用 Supabase Auth 替换现有 Express JWT 鉴权体系。
这一阶段建议**新老并行**，先在测试账号上验证完整流程，再切换。

### 子任务 3.1：配置 Supabase Auth 短信登录

- [ ] 在 Supabase Dashboard → Authentication → Providers 中开启 Phone 登录
- [ ] 配置 SMS 供应商（二选一）：
  - **阿里云短信**（推荐国内）：在 Supabase 自定义 SMTP/SMS 配置
  - **Twilio**：直接在 Dashboard 填入 Account SID + Auth Token
- [ ] 测试发送验证码到真实手机号

### 子任务 3.2：白名单逻辑（关键自定义逻辑）

现有白名单控制注册权限，Supabase Auth 不原生支持，需要用 **Database Function + Trigger** 实现：

```sql
-- 在 Supabase SQL Editor 中执行
-- 注册前检查白名单
CREATE OR REPLACE FUNCTION check_whitelist_before_register()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "UserWhitelist"
    WHERE phone = NEW.phone AND "deletedAt" IS NULL
  ) THEN
    RAISE EXCEPTION '手机号不在白名单中，无法注册';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] 编写并测试白名单 Trigger
- [ ] 测试未白名单手机号被拒绝注册

### 子任务 3.3：迁移前端鉴权逻辑

- [ ] 安装 Supabase JS SDK：
  ```bash
  cd /mnt/f/QIANQIAN/jiaopeiWeb/xq-frontend
  npm install @supabase/supabase-js
  ```
- [ ] 创建 `src/lib/supabase.ts`：
  ```typescript
  import { createClient } from '@supabase/supabase-js'

  export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )
  ```
- [ ] 改造 `src/stores/useAuthStore.ts`：
  - 手机号发验证码 → `supabase.auth.signInWithOtp({ phone })`
  - 验证码登录 → `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`
  - 登出 → `supabase.auth.signOut()`
  - 获取当前用户 → `supabase.auth.getUser()`
- [ ] 改造 `src/pages/LoginPage.tsx`，适配新的鉴权 API
- [ ] 废弃 `src/services/api.ts` 中的 `Authorization: Bearer <token>` 逻辑
  （Supabase SDK 自动处理 Token）

### 子任务 3.4：迁移后端鉴权中间件

- [ ] 将 Express 中间件从验证自签 JWT 改为验证 Supabase JWT：
  ```typescript
  // backend/src/middlewares/auth.middleware.ts
  // 改为用 Supabase Admin SDK 验证 Token
  import { createClient } from '@supabase/supabase-js'
  const supabaseAdmin = createClient(URL, SERVICE_KEY)

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  ```

### 验收标准
- 新用户（白名单内）可通过手机验证码注册并登录
- 非白名单手机号注册被拒绝
- 登录状态在前端刷新后保持
- 原有已注册用户 **需要数据迁移** 或提供"重置密码/重新注册"流程

---

## 阶段 4：API 层迁移（最大工作量）
> 预计时间：2-3 周 | 风险：🟡 中

### 策略
按模块优先级，逐步将 Express 路由替换为 Supabase SDK 直查（前端直连）或 Edge Functions（复杂逻辑）。

### 迁移优先级与方案

| 路由文件 | 大小 | 建议方案 | 优先级 |
|------|------|------|------|
| `question.routes.ts` | 14.9KB | Supabase SDK 直查 + RLS | P1 |
| `answer.routes.ts` | 0.7KB | Supabase SDK 直查 | P1 |
| `comment.routes.ts` | 2.3KB | Supabase SDK 直查 | P1 |
| `interaction.routes.ts` | 3.7KB | Supabase SDK 直查 | P1 |
| `notification.routes.ts` | 3.3KB | Supabase SDK 直查 | P2 |
| `profile.routes.ts` | 2.7KB | Supabase SDK 直查 | P2 |
| `user-me.routes.ts` | 5.5KB | Supabase SDK 直查 | P2 |
| `parent.routes.ts` | 3.4KB | Edge Function | P2 |
| `admin-whitelist.routes.ts` | 3KB | Edge Function | P2 |
| `admin-audit.routes.ts` | 5.6KB | Edge Function | P3 |
| `admin-question-dimensions.routes.ts` | 5.5KB | Edge Function | P3 |
| `ai-audit.service.ts` | 16.5KB | Edge Function（最复杂） | P3 |
| `behavior.routes.ts` | 3.4KB | Edge Function 或保留 | P4 |
| `internal.routes.ts` | 8.4KB | Edge Function | P4 |

### P1 阶段（CRUD 直查）

- [ ] 在 `src/services/api.ts` 中，逐个替换 axios 调用为 Supabase SDK：
  ```typescript
  // Before（axios 调用 Express）
  const res = await axios.get('/api/questions')

  // After（Supabase SDK 直查）
  const { data, error } = await supabase
    .from('Question')
    .select('*')
    .order('createdAt', { ascending: false })
  ```
- [ ] 为各表配置 RLS 策略（允许已登录用户读写自己数据）
- [ ] 逐页面验收：问题列表、问题详情、发布问题、答题页

### P2/P3 阶段（Edge Functions）

- [ ] 创建 Supabase Edge Functions 项目结构：
  ```
  supabase/
    functions/
      ai-audit/index.ts       ← AI 审核逻辑
      admin-whitelist/index.ts ← 白名单管理
      parent-bind/index.ts    ← 家长绑定
  ```
- [ ] 部署 Edge Functions：
  ```bash
  npx supabase functions deploy ai-audit
  ```
- [ ] 前端调用改为 Edge Function URL：
  ```typescript
  const { data } = await supabase.functions.invoke('ai-audit', {
    body: { questionId, content }
  })
  ```

### 验收标准
- 前端所有页面功能正常，不再依赖 Express 后端
- 通过 Playwright E2E 测试

---

## 阶段 5：废弃 Express 后端
> 预计时间：1-2 天 | 风险：🟢 低（此时 Express 已无流量）

### 任务清单

- [ ] 确认 Express 后端已无任何前端调用（可通过日志/网络请求确认）
- [ ] 下线 Express 后端服务
- [ ] 归档 `backend/` 目录（建议先 git tag 保存）：
  ```bash
  git tag v-pre-supabase-migration
  ```
- [ ] 将 `backend/` 移动到 `_archived/backend-express/`（保留历史参考）
- [ ] 清理 `docker-compose.yml`，移除 Express 服务
- [ ] 更新 README.md，记录新的架构

### 验收标准
- 项目在 Vercel（前端）+ Supabase（后端）上完整运行
- 无任何本地服务依赖
- CI/CD 流程正常

---

## 部署架构（完成后）

```
用户浏览器
    │
    ▼
Vercel（免费）
  └── Vite + React 静态文件
        │
        ├── Supabase SDK（直接查询数据库）
        │     └── Supabase PostgreSQL（免费 500MB）
        │
        ├── Supabase Auth（手机号短信登录）
        │
        ├── Supabase Storage（图片文件，免费 1GB）
        │
        └── Supabase Edge Functions（AI审核、管理逻辑）
              └── 免费 50万次/月
```

---

## 风险与应对

| 风险 | 可能性 | 应对方案 |
|------|------|------|
| 中国手机号短信不稳定 | 🔴 高 | 提前测试阿里云短信 + Supabase 集成；备选：保留密码登录 |
| 老用户数据无法迁移 | 🟡 中 | Supabase Auth 用户与原 User 表分离，需编写数据映射脚本 |
| RLS 策略配置错误导致数据泄露 | 🟡 中 | 每个 RLS 策略编写后必须进行安全测试 |
| Edge Functions 冷启动延迟 | 🟢 低 | AI 审核本来就是异步，可接受 |
| Supabase 免费版项目 7 天无活跃暂停 | 🟢 低 | 定期访问项目即可恢复；生产上线后流量足以保持活跃 |

---

## 参考资源

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase + Vite 快速入门](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)
- [Supabase Auth 手机号登录](https://supabase.com/docs/guides/auth/phone-login)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Prisma + Supabase 集成](https://supabase.com/docs/guides/database/prisma)

---

*生成时间：2026-03-30 | 基于 xq-frontend 项目当前代码库分析*
