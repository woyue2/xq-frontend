# 1 核 1 GB 环境 docker-compose 参数建议（示意）

> 说明：此文件给出与现有后端项目兼容的资源约束示例，不替代你当前的 `docker-compose.yml`，而是提供在 1c1g 环境下可参考的配置方向。

## 1. backend 服务资源控制（示例）

```yaml
services:
  backend:
    image: node:20
    working_dir: /app/backend
    command: ["node", "dist/server.js"]
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://kpqa:kpqa_password@db:5432/kpqa_db?connection_limit=5
      REDIS_URL: redis://redis:6379
      JWT_SECRET: "请在生产环境替换为随机长串"
      JWT_EXPIRES_IN: "7d"
    depends_on:
      - db
      # - redis   # 如启用 Redis 再取消注释
    ports:
      - "3000:3000"
    deploy:
      resources:
        limits:
          cpus: "0.8"     # 尽量不占满整核
          memory: "512M"  # 最大 512MB
        reservations:
          cpus: "0.3"
          memory: "256M"
```

> 如果你使用的是 `docker compose` v2，本段可以合并到现有 `backend` 服务中，仅调整 `resources` 与环境变量。

## 2. PostgreSQL 服务资源控制（示例）

```yaml
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: kpqa_db
      POSTGRES_USER: kpqa
      POSTGRES_PASSWORD: kpqa_password
    volumes:
      - db-data:/var/lib/postgresql/data
      # - ./deploy/postgresql.conf:/etc/postgresql/postgresql.conf
    command: >
      -c max_connections=20
      -c shared_buffers=128MB
      -c work_mem=4MB
      -c maintenance_work_mem=64MB
    deploy:
      resources:
        limits:
          cpus: "0.7"
          memory: "384M"
        reservations:
          cpus: "0.3"
          memory: "256M"
```

> 若采用挂载方式自定义 `postgresql.conf`，则可以把 `max_connections` 等配置放入文件中，上述 `command` 可简化。

## 3. Redis 服务资源控制（可选）

如需要 Redis，可添加：

```yaml
  redis:
    image: redis:7
    command: >
      redis-server
      --maxmemory 128mb
      --maxmemory-policy allkeys-lru
    deploy:
      resources:
        limits:
          cpus: "0.3"
          memory: "160M"
        reservations:
          cpus: "0.1"
          memory: "64M"
```

如果当前阶段不需要 Redis，可以完全移除此服务，减少内存占用。

## 4. 健康检查与日志

### 4.1 健康检查

在 `backend` 服务中可以加上：

```yaml
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
```

### 4.2 日志

- 默认可使用 Docker 的日志驱动（json-file），定期清理或设置 `max-size`。
- 例如：

```yaml
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
```

## 5. 生产环境 Checklist（结合本项目）

- [ ] `.env` 中使用生产数据库和 Redis 地址，不使用默认开发密码。
- [ ] `JWT_SECRET` 更换为高强度随机字符串。
- [ ] `DATABASE_URL` 添加 `connection_limit=5` 限制。
- [ ] Postgres 容器的 `max_connections` 值与 Prisma 侧限制匹配（避免连接过多）。
- [ ] 确认 `docker stats` 下 backend 和 db 容器内存峰值在可接受范围（例如总和 < 900MB）。
- [ ] 使用 `GET /health` 作为负载均衡和外部健康检查端点。

