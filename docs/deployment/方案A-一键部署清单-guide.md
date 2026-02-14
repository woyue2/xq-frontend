# 方案A一键部署清单（Docker Compose + Caddy HTTPS）

> 适用日期：2026-02-14  
> 适用项目：`zsxq-4`（前端 Vite + 后端 Express + Postgres + Redis）

## 0. 三种部署方案对比（先看这个）

| 方案 | 结构 | 优点 | 风险点 | 适用阶段 |
|---|---|---|---|---|
| 方案A（推荐） | 单机 Docker Compose + Caddy HTTPS（前端静态、后端、DB、Redis） | 一套命令可复现，最贴合“能跑 + 易改” | 单机单点；服务器资源紧张时要关注内存 | 早期上线/小规模生产 |
| 方案B | 前端 Vercel/Netlify + 后端自托管 | 前端发布最快 | 跨域、证书、域名配置更容易踩坑 | 前端迭代很快、后端相对稳定 |
| 方案C | 全自托管非容器（Nginx/Caddy + PM2） | 进程排障直观 | 可重复性弱，环境漂移风险更高 | 运维经验较强时 |

当前推荐：**方案A**。

---

## 1. 发布前原则（必须）

1. 从已提交版本发布，不要直接发布本地脏工作区。  
2. 生产环境必须设置强随机 `JWT_SECRET`，禁止默认值。  
3. `CORS_ORIGIN` 必须是正式域名（`https://...`），不要用 `*`。  
4. 录音功能依赖 HTTPS；裸 IP + HTTP 会被浏览器拦截麦克风权限。

---

## 2. 服务器一次性准备

```bash
# Ubuntu/Debian 示例
sudo apt update
sudo apt install -y ca-certificates curl git

# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 重新登录后验证
docker --version
docker compose version
```

---

## 3. 拉代码并固定版本

```bash
# 服务器任意目录
git clone <你的仓库地址> zsxq-4
cd zsxq-4

# 固定到你确认的发布版本（示例：最新两个提交之一）
git checkout 6b042d2
# 或
# git checkout 1926766

git rev-parse --short HEAD
```

---

## 4. 构建前端静态资源

```bash
cd /path/to/zsxq-4
npm ci
npm run build
```

成功后会生成：`dist/`。

---

## 5. 准备部署文件（方案A）

### 5.1 创建 `deploy/.env.prod`

```bash
cat > /path/to/zsxq-4/deploy/.env.prod << 'EOF'
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://kpqa:请替换数据库密码@postgres:5432/kpqa_db?connection_limit=5
REDIS_URL=redis://redis:6379

JWT_SECRET=请替换为至少16位高强度随机字符串
JWT_EXPIRES_IN=7d

# 必须是正式前端域名，禁止 *
CORS_ORIGIN=https://qa.example.com

# 后端对外地址（可选但建议配置）
BACKEND_URL=https://qa.example.com

# 音频目录（已做持久卷映射）
AUDIO_BASE_DIR=/data/audio
EOF
```

### 5.2 创建 `deploy/Caddyfile`

> 把 `qa.example.com` 替换成你的实际域名。

```bash
cat > /path/to/zsxq-4/deploy/Caddyfile << 'EOF'
qa.example.com {
  encode gzip

  # API
  handle /api/* {
    reverse_proxy backend:3000
  }

  # 健康检查与文档
  handle /health {
    reverse_proxy backend:3000
  }
  handle /api-docs* {
    reverse_proxy backend:3000
  }
  handle /api-docs.json {
    reverse_proxy backend:3000
  }
  handle /static/* {
    reverse_proxy backend:3000
  }

  # 前端静态站点（SPA）
  root * /srv
  try_files {path} /index.html
  file_server
}
EOF
```

### 5.3 创建 `deploy/docker-compose.prod.yml`

```bash
cat > /path/to/zsxq-4/deploy/docker-compose.prod.yml << 'EOF'
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: kpqa
      POSTGRES_PASSWORD: 请替换数据库密码
      POSTGRES_DB: kpqa_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    command: >
      postgres
      -c max_connections=20
      -c shared_buffers=128MB
      -c work_mem=4MB
      -c maintenance_work_mem=64MB

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: >
      redis-server
      --maxmemory 128mb
      --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data

  backend:
    image: node:20-alpine
    restart: unless-stopped
    working_dir: /app
    volumes:
      - ../backend:/app
      - audio_data:/data/audio
    env_file:
      - ./.env.prod
    command: >
      sh -c "npm ci && npm run build && node dist/server.js"
    expose:
      - "3000"
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ../dist:/srv:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
  audio_data:
  caddy_data:
  caddy_config:
EOF
```

---

## 6. 启动与初始化

```bash
cd /path/to/zsxq-4/deploy
docker compose -f docker-compose.prod.yml up -d

# 查看状态
docker compose -f docker-compose.prod.yml ps

# 看后端日志（首次启动）
docker compose -f docker-compose.prod.yml logs -f backend
```

数据库初始化（如首次上线）：

```bash
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec backend npm run seed:admin
```

---

## 7. 验收（最小可用）

```bash
# 后端健康检查
curl -I https://qa.example.com/health

# 前端首页
curl -I https://qa.example.com/
```

浏览器手工验收：
1. 登录/注册可用。  
2. 提问、回答、评论可提交。  
3. 图片上传后可访问。  
4. 老师录音可授权并上传（HTTPS 下验证）。  

---

## 8. 回滚（最快）

1. 回到上一个可用提交：`git checkout <旧commit>`。  
2. 重新构建前端：`npm run build`。  
3. 重启容器：`docker compose -f deploy/docker-compose.prod.yml up -d --force-recreate`。  

---

## 9. 当前项目已知注意事项

1. 现有 `deploy/4-docker-compose.1c1g.yml` 中 backend 健康检查写的是 `localhost:4000`，但 `PORT=3000`，会导致探活口径不一致。  
2. 若多节点部署，当前本地文件上传/音频持久卷不会跨主机自动共享，需要对象存储或共享存储。  
3. 生产上线前务必替换默认数据库密码和 `JWT_SECRET`。  

---

## 10. 你下一步只要做这 5 条

1. 准备域名并解析到服务器。  
2. 执行本文件第 3-6 节命令。  
3. 用第 7 节验收功能。  
4. 验收通过后再切真实用户流量。  
5. 保留上一个可用 commit 作为回滚点。  
