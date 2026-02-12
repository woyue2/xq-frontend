# 1 核 1 GB 服务器部署与运行参数建议

本文件针对当前后端栈（Node.js + Express + TypeScript + Prisma + PostgreSQL + 可选 Redis），在 **1 核 1 GB 单机** 环境下的运行参数与部署/监控建议。

## 1. 可行性结论

- 在中小流量场景（并发几十、QPS 数十级）下，1c1g 可以支撑：
  - 后端应用：Node.js 单进程。
  - 数据库：PostgreSQL 单实例。
  - 可选：Redis 做轻量缓存（也可以暂不启用）。
- 前提条件：
  - 限制数据库连接数和内存。
  - 不在同机上部署重型组件（如 ELK、Prometheus 全套等）。

## 2. Node.js 运行配置

- 进程模型：
  - 在 1 核机器上 **只跑 1 个 Node 进程**，不要启用 cluster 多进程。
- 构建与运行：
  - 构建：`npm run build`
  - 直接运行：`node dist/server.js`
  - 若使用 PM2：
    - `pm2 start dist/server.js --name kpqa-backend --node-args="--max-old-space-size=512"`
- 建议参数：
  - 环境变量：
    - `NODE_ENV=production`
    - `PORT=3000`（或按需调整）
  - Node 堆内存限制：
    - `--max-old-space-size=512`（最大堆 512MB，避免单进程占满 1GB 内存）。
- 日志：
  - 保持使用 pino，日志级别为 `info`。
  - 避免输出巨大对象/请求体。
  - 将日志交给宿主机或 Docker 的日志轮转工具（如 `logrotate`）管理。

## 3. PostgreSQL 配置建议（docker 容器内）

若通过 docker-compose 部署 Postgres，建议：

- 连接数：
  - `max_connections = 20`。
  - Prisma 侧在 `DATABASE_URL` 附加连接限制，例如：
    - `postgresql://user:pass@host:5432/db?connection_limit=5`
- 内存相关（参考值）：
  - `shared_buffers = 128MB`
  - `effective_cache_size = 512MB`
  - `work_mem = 4MB`
  - `maintenance_work_mem = 64MB`
- 其他：
  - 保持自动 vacuum，但无需过度调高相关参数。
  - 不启用不必要的扩展。

## 4. Redis（可选的轻量缓存）

当前代码中核心路径（验证码限流、审核队列缓存）均可使用内存 Map 完成，因此 Redis 可以为可选组件。

- 若启用 Redis：
  - 建议限制内存：
    - `maxmemory 64mb` ~ `128mb`
    - `maxmemory-policy allkeys-lru`
  - 仅存放轻量级 key（会话/简单计数/热点列表），避免大对象或大批量数据。
- 若暂时不需要 Redis：
  - 可以停止 Redis 容器，节省内存。

## 5. 审核列表与缓存策略（已为低资源环境优化）

- 审核列表 `GET /api/admin/audit/pending`：
  - 在 `audit.service.ts` 中增加了 **内存缓存 `pendingCache`**：
    - key 结构：`"${type}:${page}:${pageSize}"`。
    - TTL：约 15 秒。
  - 作用：
    - 在教师频繁刷新审核队列时，减少对数据库的重复查询压力。
  - 一致性：
    - 审核操作（通过/驳回/封禁/置顶）结束后调用 `pendingCache.clear()`，保证下次查询看到最新结果。
- 查询结构优化：
  - 待审核评论列表不使用 Prisma `include` 嵌套关系，而是：
    - 先查 Comment（pending 状态）。
    - 抓取相关 Question，再在 Node 内存中组装数据。
  - 降低 ORM 查询复杂度，适合资源受限的环境。

## 6. 环境变量与运行顺序

- `.env` 示例（backend 目录）：
  ```env
  NODE_ENV=production
  PORT=3000

  DATABASE_URL=postgresql://kpqa:kpqa_password@db:5432/kpqa_db?connection_limit=5
  REDIS_URL=redis://redis:6379

  JWT_SECRET=请在生产环境中替换为高强度随机字符串
  JWT_EXPIRES_IN=7d
  # 如启用 AI 自动审核回调，请为内部回调接口配置独立令牌
  # 仅在后端与 AI 服务之间共享，不对外暴露
  AI_INTERNAL_TOKEN=请生成至少32字节的高强度随机字符串
  ```

- 启动顺序：
  1. 启动 Postgres（和 Redis，如使用）。
  2. 在 `backend/` 目录下：
     - `npm ci`
     - `npm run prisma:migrate`
     - `npm run build`
     - `node dist/server.js` 或 `pm2 start dist/server.js ...`

- 健康检查：
  - 使用已有的 `GET /health` 端点作为探活：
    - Docker 健康检查、负载均衡探活、外部监控都可基于此。

## 7. 监控与告警建议

### 7.1 系统/容器层

- SSH 登录后：
  - `htop` / `top` 查看整体 CPU/内存。
  - Docker 环境：`docker stats` 观察各容器资源占用。

### 7.2 应用层

- 若使用 PM2：
  - `pm2 monit`：查看进程 CPU/内存波动。
  - `pm2 logs kpqa-backend`：查看错误日志。
- 数据库：
  - 可按需开启 Postgres 慢查询日志，定期检查热点 SQL。

### 7.3 阈值参考（1c1g）

- Node 进程常态内存：**< 400MB**。
- Postgres 容器常态内存：**< 400MB**。
- 整机内存使用：
  - 常态 < 80–85%。
  - 若长期 > 90% 且出现 OOM，优先考虑：
    - 降低日志量、减少不必要的中间件。
    - 将数据库迁移到独立实例或升级为更大规格。

## 8. AI 审核 Worker（异步模式 3）部署说明

> 适用场景：使用「提示词 + 文本 → 审核服务 → 回调 /api/internal/ai-check」的异步审核流程。

### 8.1 相关文件与环境变量

- 代码位置：
  - 审核 Worker 示例：`deploy/ai-audit-worker.ts`
  - 审核配置：`backend/src/config/ai-audit.ts`
- 关键环境变量（可在根目录 `.env` 或运行命令时设置）：
  - `BACKEND_BASE_URL`：当前后端地址（例如 `http://localhost:3000`）
  - `AI_AUDIT_BASE_URL`：你的审核服务 base_url（例如 `https://audit.example.com/api`）
  - 可选：`AI_AUDIT_PROMPT`：自定义审核提示词（不设置则使用脚本内默认中文提示词）

### 8.2 从数据库拉取待审核内容（显式示例）

- 在 `backend/src/config/ai-audit.ts` 中保存了一条示例查询命令：
  ```ts
  await prisma.question.findMany({ where: { status: 'pending' } })
  ```
- 在 `deploy/ai-audit-worker.ts` 中对应实现为：
  ```ts
  const questions = await prisma.question.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
    take: 10
  });
  ```
- 你可以直接在自己的脚本/服务里复制使用这条查询，按需调整 `where` 条件和 `take` 数量。

### 8.3 审核服务调用与回调分段说明

1. **向审核服务发送「提示词 + 文本」**
   - Worker 中构造的内容（可改）：
     ```ts
     const payload = {
       prompt: AI_AUDIT_PROMPT 或默认提示词,
       text: `标题: ${question.title}\n内容: ${question.content ?? ''}`
     };
     ```
   - 默认请求地址（可改成你真实路径）：
     ```ts
     const url = new URL('/v1/audit', AI_AUDIT_BASE_URL);
     await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
     ```

   - 🔎 **你提到的简单示例（当注释理解即可）**
     ```ts
     // 假设你的审核接口就是这个 URL：
     //   https://www.baidu.com/thisIsMyAPI
     //
     // 你发送的内容示例：
     const payload = {
       prompt: '你是一个内容审核助手，我想和你说话，请你只返回 JSON 格式，包含 safe 字段。',
       text: '这里是学生提问或回答的具体内容……'
     };
     //
     // 期望审核服务返回一个非常简单的 JSON，例如：
     //   { "safe": true }
     // 或者：
     //   { "safe": false }
     //
     // 然后在 worker 里把这个 safe 布尔值直接映射到 result.safe：
     //   const data = await res.json();
     //   const safe = Boolean(data.safe);
     ```

2. **解析审核服务返回的结果**
   - 期望从返回体中拿到：
     - `safe: boolean` — 是否通过；
     - `score?: number` — 风险评分（0~1 或 0~100，你自己约定）；
     - `reason?: string` — 简短原因；
     - `raw: any` — 原始返回，方便排查问题。
   - 若你的服务目前只返回一段 answer 文本，可以在 Worker 里先用正则或 `JSON.parse` 把 answer 转成上述结构，然后再继续下一步。

3. **回调当前后端 `/api/internal/ai-check`**
   - Worker 中构造的回调请求体（必须与后端路由一致）：
     ```jsonc
     {
       "targetType": "question",
       "targetId": "q-xxxx",
       "result": {
         "safe": true,
         "score": 0.95,
         "reason": "正常教学内容",
         "provider": "custom-llm",
         "raw": { ...审核原始返回... }
       }
     }
     ```
   - 实际请求示例（curl）：
     ```bash
     curl -X POST "$BACKEND_BASE_URL/api/internal/ai-check" \
       -H "Content-Type: application/json" \
       -d '{
         "targetType": "question",
         "targetId": "q-audit-123",
         "result": {
           "safe": false,
           "score": 0.18,
           "reason": "包含侮辱性词汇",
           "provider": "custom-llm",
           "raw": { "your": "original-response" }
         }
       }'
     ```

### 8.4 幂等性与重复回调注意事项

- 后端当前逻辑：对于同一个 `targetId`，多次回调会覆盖 `status/aiResult`，最后一次为准。
- 建议：
  - 在你的审核服务里保证「同一条内容只发送一次最终结果」；
  - 遇到网络重试时，保持 `result` 一致，这样重复回调是幂等的（写入同样的状态）。
- 如需更严格的后端幂等控制，可考虑：
  - 只允许 `pending → approved/rejected` 的状态迁移；
  - 在 `audit_logs` 中记录 `jobId`，当相同 `jobId` 再次回调时直接忽略。

### 8.5 在 1 核 1G 机器上如何运行 Worker

1. **一次性手动运行（调试用）**
   ```bash
   # 在项目根目录
   BACKEND_BASE_URL="http://localhost:3000" \
   AI_AUDIT_BASE_URL="https://your-audit-service/api" \
   npx tsx deploy/ai-audit-worker.ts
   ```

2. **使用 crontab 定时执行（示例）**
   - 编辑 crontab：
     ```bash
     crontab -e
     ```
   - 每 2 分钟跑一次（仅示例，按你的审核延迟要求调整）：
     ```cron
     */2 * * * * cd /path/to/your/project && \
     BACKEND_BASE_URL="http://127.0.0.1:3000" \
     AI_AUDIT_BASE_URL="https://your-audit-service/api" \
     npx tsx deploy/ai-audit-worker.ts >> logs/ai-audit-worker.log 2>&1
     ```
   - 建议：
     - 控制 `take` 数量（脚本里目前写的是 10 条），避免一次处理过多导致小机器抖动。
     - 如果流量上来，可拆分为多个 worker 或改成队列模式，但对 1c1g 来讲先保持简单。
