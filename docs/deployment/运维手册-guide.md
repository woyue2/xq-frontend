# 运维手册 / 值班指南（1 核 1 GB 部署）

本手册面向运维值班同学，聚焦 **"如何看服务是否健康、常见问题怎么处理、需要开发介入时如何收集信息"**。后端服务基于 `docker-compose.1c1g.yml` 在 1c1g 服务器上运行。

---

## 一、核心服务一览

- 后端应用：`backend` 容器（Node.js + Express）。
- 数据库：`postgres` 容器（PostgreSQL）。
- 缓存：`redis` 容器（可选，用于轻量缓存）。

启动方式（在 `deploy/` 目录）：

- 启动全部：`docker compose -f docker-compose.1c1g.yml up -d`
- 停止全部：`docker compose -f docker-compose.1c1g.yml down`
- 查看状态：`docker compose -f docker-compose.1c1g.yml ps`

---

## 二、快速健康检查

### 2.1 HTTP 健康检查

- 浏览器或命令行访问：`http://<服务器IP>:3000/health`
- 正常返回示例：
  ```json
  {
    "status": "ok",
    "timestamp": "2026-02-01T..."
  }
  ```
- 如返回非 200 或无法访问，继续查看容器状态和日志。

### 2.2 容器状态检查

在服务器上执行（`deploy/` 目录）：

- 查看所有容器状态：
  ```bash
  docker compose -f docker-compose.1c1g.yml ps
  ```
- 查看实时资源占用：
  ```bash
  docker stats
  ```
  重点观察：`backend`、`postgres`、`redis` 的 CPU 和内存。

### 2.3 基础连通性

- 检查数据库服务：
  ```bash
  docker logs kpqa-postgres --tail 50
  ```
- 检查 Redis 服务（如在用）：
  ```bash
  docker logs kpqa-redis --tail 50
  ```
- 检查后端服务：
  ```bash
  docker logs kpqa-backend --tail 100
  ```

---

## 三、常见故障与处理步骤

### 3.1 HTTP 接口全部不可用

现象：`/health` 无法访问、前端报"服务器错误"或超时。

排查步骤：

1. 查看容器是否还在运行：
   ```bash
   docker compose -f docker-compose.1c1g.yml ps
   ```
2. 如 `backend` 容器状态为 `exited` 或 `unhealthy`：
   - 先看日志：`docker logs kpqa-backend --tail 100`
   - 根据日志判断是数据库连接问题、端口占用还是 OOM。
3. 如是偶发错误且资源还充足，可重启后端：
   ```bash
   docker restart kpqa-backend
   ```
4. 如频繁重启或日志出现大量错误，请记录日志并通知开发。

### 3.2 数据库连接失败

现象：后端日志中出现 "`ECONNREFUSED`"、"`connection terminated`" 等 Postgres 错误。

处理步骤：

1. 检查 Postgres 容器：
   ```bash
   docker ps | grep kpqa-postgres
   docker logs kpqa-postgres --tail 100
   ```
2. 如 Postgres 已退出，可尝试重启：
   ```bash
   docker restart kpqa-postgres
   ```
3. 若重启后仍报错，避免多次尝试，及时通知开发，保留日志。

### 3.3 内存占用过高 / 机器卡顿

现象：系统响应慢、SSH 卡顿，`docker stats` 显示某容器内存接近限制。

处理步骤：

1. 使用：
   ```bash
   docker stats
   ```
   找出占用最高的容器（通常是 `backend` 或 `postgres`）。
2. 如短时间内峰值增加但很快回落，可先观察，不必立即操作。
3. 如长期接近 100% 且伴随容器重启：
   - 优先重启单个容器（例如 `docker restart kpqa-backend`）。
   - 如依旧不稳定，通知开发评估是否需要升级机器规格或拆分数据库。

### 3.4 单个接口异常（例如审核/上传出错）

现象：某一类接口（审核队列、上传签名等）报错，但其他接口正常。

处理步骤：

1. 通过前端错误信息或运维工具确认接口路径（如 `/api/admin/audit/pending`、`/api/upload/signature`）。
2. 在后端日志中搜索对应路径：
   ```bash
   docker logs kpqa-backend --tail 200 | grep "/api/admin/audit" -n
   ```
3. 如日志提示业务错误（例如权限不足、参数无效），通常是前端或用户操作问题，参考错误信息即可。
4. 如日志为异常栈，建议截取相关日志内容发给开发排查。

---

## 四、例行巡检建议

建议按日/周做简要巡检，避免问题积累：

- [ ] `docker ps` / `docker stats` 确认各容器运行正常、资源使用稳定。
- [ ] `curl http://localhost:4000/health` 返回正常。
- [ ] 后端日志中无持续性高频错误（可简单搜索 `ERROR`/`500`）。
- [ ] 确认磁盘空间充足：`df -h`，确保数据库和日志所在分区未超过 80%。

---

## 五、与开发协作时建议准备的信息

在向开发反馈问题时，优先整理以下信息，可极大减少沟通成本：

- 问题发生时间段（精确到分钟）。
- 受影响功能（例如：登录、提问、审核、上传图片等）。
- 是否必现？（操作步骤 + 账号/角色类型）。
- 相关日志片段：
  - `docker logs kpqa-backend --tail 200` 中出错时段。
  - 如为数据库问题，附上 `docker logs kpqa-postgres --tail 200`。
- 当前资源情况截图或输出：`docker stats` / `df -h`。

---

## 六、注意事项

- 不要在生产环境随意执行 `npm install` 或修改代码文件，如有需要应走规范发布流程。
- 不要在生产数据库上直接执行危险 SQL（如 `DROP TABLE`、`TRUNCATE` 等）。
- 任何涉及数据删除或大规模变更的操作，务必先与开发确认并做好备份。
