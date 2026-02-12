# 1 核 1 GB 部署方案文档总览（总结）

本总结基于 `deploy/2-one-core-1g-deploy-notes.md`、`deploy/3-one-core-1g-docker-compose-notes.md`、`deploy/4-docker-compose.1c1g.yml`、`deploy/5-生产环境部署Checklist.md` 与 `deploy/6-运维手册-值班指南.md` 等文件，汇总当前项目在 **1 核 1 GB 服务器** 上的推荐部署方案与运行实践，并简要说明 `deploy` 目录下所有文件的用途。

---

## 0. 本目录文件一览与阅读顺序

建议按如下顺序阅读和使用：

1. `1-总结.md`（当前文件）
   - 总体鸟瞰，快速了解 1c1g 部署方案和后端运行策略。
2. `2-one-core-1g-deploy-notes.md`
   - 详细说明 1c1g 环境下的 Node/Postgres/Redis 参数、缓存策略与监控建议。
3. `3-one-core-1g-docker-compose-notes.md`
   - 解释 docker-compose 中各服务（backend/db/redis）的资源限制与配置思路。
4. `4-docker-compose.1c1g.yml`
   - 可直接使用的 Compose 文件：一条命令启动 Postgres + Redis + Backend。
5. `5-生产环境部署Checklist.md`
   - 上线前的检查清单：从机器规格、配置、构建测试到健康检查和备份回滚。
6. `6-运维手册-值班指南.md`
   - 面向值班/运维同学的操作指南：如何看服务是否健康、常见问题如何处理、出问题时要收集哪些信息交给开发。

辅助脚本与参考文件：

- `ai-audit-worker.reference.ts` / `ai-audit-worker.ts`
  - 与未来 AI 审核工作进程相关的参考/实现文件（目前为扩展预留，不影响主应用部署）。
- `dev-backend.sh`
  - 本地/开发环境快速启动后端的辅助脚本（不直接用于生产环境）。

---

## 一、总体思路

- 目标：在 1c1g 单机上同时运行：
  - Node.js 后端（Express + Prisma）。
  - PostgreSQL 数据库。
  - 可选 Redis 作为轻量缓存。
- 策略：
  - 限制各服务的最大内存与连接数，避免某一进程占满内存导致 OOM。
  - 后端采用单进程模型，减少上下文切换。
  - 审核等高频读接口使用轻量内存缓存，降低数据库压力。

---

## 二、后端进程运行规范

- **进程模型**
  - 仅启动 1 个 Node 进程，不使用 cluster，多核扩展留给未来横向扩容。
- **启动方式**
  - 构建：`npm run build`
  - 直接运行：`node dist/server.js`
  - 或使用 PM2：`pm2 start dist/server.js --name kpqa-backend --node-args="--max-old-space-size=512"`
- **关键参数**
  - 环境变量：
    - `NODE_ENV=production`
    - `PORT=3000`
  - Node 堆大小限制：
    - `--max-old-space-size=512`，避免单进程占满 1GB 内存。
- **日志**
  - 使用 pino，日志级别 `info`。
  - 避免输出大对象/完整请求体，用外部工具做日志轮转。

---

## 三、PostgreSQL 与 Redis 资源控制

### 3.1 PostgreSQL（docker 容器）

- docker-compose 中通过 `command` 调参：
  - `max_connections=20`
  - `shared_buffers=128MB`
  - `work_mem=4MB`
  - `maintenance_work_mem=64MB`
- Prisma 连接限制：
  - `DATABASE_URL=...kpqa_db?connection_limit=5`
- 在 `docker-compose.1c1g.yml` 中为 Postgres 设置：
  - CPU 限制：`cpus: "0.7"`。
  - 内存限制：`memory: "384M"`。

### 3.2 Redis（可选）

- 仅作轻量缓存/计数使用，非核心依赖。
- 限制参数：
  - `maxmemory 128mb`
  - `maxmemory-policy allkeys-lru`
- 在 `docker-compose.1c1g.yml` 中：
  - CPU 限制：`cpus: "0.3"`。
  - 内存限制：`memory: "160M"`。
- 若暂时不需要 Redis，可从 compose 中移除该服务。

---

## 四、审核列表与缓存优化（适配低资源）

- 审核接口：`GET /api/admin/audit/pending?type=question|comment&page=&pageSize=`
  - 服务层 `AuditService.listPending` 中引入轻量级内存缓存：
    - key：`"${type}:${page}:${pageSize}"`。
    - TTL：15 秒。
  - 审核操作（通过/驳回/封禁/置顶）后自动清理缓存，确保数据一致。
- 评论审核列表查询：
  - 先查 `Comment` 列表，再批量查询对应 `Question` 并在 Node 内组装。
  - 避免复杂 ORM 关联查询，减轻数据库压力，更适合 1c1g 场景。

---

## 五、docker-compose.1c1g.yml 核心结构

文件：`deploy/docker-compose.1c1g.yml`

- **postgres 服务**
  - 基于 `postgres:16-alpine`。
  - 使用 `command` 设置连接数与内存相关参数。
  - `deploy.resources` 限制 CPU 与内存（示例：0.7 CPU / 384M RAM）。
- **redis 服务**
  - 基于 `redis:7-alpine`。
  - `redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru`。
  - `deploy.resources` 限制为小内存（示例：0.3 CPU / 160M RAM）。
- **backend 服务**
  - 基于 `node:20-alpine`。
  - `working_dir: /app`，挂载本地 `../backend` 目录。
  - 环境变量：
    - `NODE_ENV=production`
    - `PORT=3000`
    - `DATABASE_URL=postgresql://kpqa:kpqa_password@postgres:5432/kpqa_db?connection_limit=5`
    - `REDIS_URL=redis://redis:6379`
    - `JWT_SECRET=please-change-this-in-production`
  - 启动命令：
    - `sh -c "npm ci && npm run build && node dist/server.js"`
  - 健康检查：
    - `GET http://localhost:4000/health`。
  - 资源限制：
    - `cpus: "0.8"`，`memory: "512M"`。

---

## 六、部署与运行顺序（总结版）

1. 准备 `.env`（或使用 Compose 中的环境变量）：
   - 使用生产库/Redis 地址；
   - 将 `JWT_SECRET` 换成高强度随机字符串；
   - `DATABASE_URL` 添加 `connection_limit=5`。
2. 在 `deploy/` 目录执行：
   - `docker compose -f docker-compose.1c1g.yml up -d`
3. 验证：
   - `docker compose -f docker-compose.1c1g.yml ps` 查看服务状态。
   - 浏览器访问 `http://服务器IP:3000/health` 或使用 `curl` 检查健康。
4. 监控：
   - `docker stats` 监控三个容器的 CPU/内存。
   - 确保整体内存占用保持在 80% 以下，如长期接近上限则考虑升级机器或拆分数据库。

---

## 七、适用范围与后续扩展

- 适用场景：
  - 单机早期部署、测试环境、小规模生产（并发/流量有限）。
- 后续扩展方向：
  - 访问量上来后，将 PostgreSQL 迁移到独立实例；
  - 考虑为 Redis 承担更多缓存与限流职能；
  - 后续若升级到多核机器，再考虑 Node 多进程或多实例部署。
