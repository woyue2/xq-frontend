# 服务器部署清单

## 目录约定

```bash
/opt/xq/xq-frontend
```

## 一、服务器准备

- 安装 Docker
- 安装 Docker Compose Plugin
- 安装 Node.js 20+
- 安装 Caddy 或 Nginx
- 确保 80 / 443 端口开放
- 准备好域名并解析到服务器公网 IP

## 二、上传代码

```bash
mkdir -p /opt/xq
cd /opt/xq
git clone <你的仓库地址> xq-frontend
cd /opt/xq/xq-frontend
```

## 三、配置后端生产环境变量

在服务器创建：

```bash
/opt/xq/xq-frontend/deploy/.env.production
```

至少确认这些变量已填写：

- `DATABASE_URL`
- `DIRECT_URL`
- `REDIS_URL=redis://redis:6379`
- `JWT_SECRET`
- `BACKEND_URL=https://88888245.xyz`
- `OSS_UPLOAD_BASE_URL`
- `OSS_UPLOAD_TOKEN`
- `AI_AUDIT_BASE_URL`
- `AI_AUDIT_API_KEY`
- `AI_AUDIT_PROVIDER_NAME`
- `AI_INTERNAL_TOKEN`

注意：

- 不要设置 `DEV_FIXED_CODE`
- 生产镜像不会再读取 `backend/.env`

## 四、启动后端与 Redis

```bash
cd /opt/xq/xq-frontend/deploy
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

## 五、后端健康检查

```bash
curl http://127.0.0.1:3000/health
```

预期返回：

```json
{"status":"ok"}
```

## 六、数据库初始化（仅当日志提示表不存在时）

```bash
docker exec -it kpqa-backend sh -c "npx prisma db push"
docker compose -f docker-compose.prod.yml restart backend
```

## 七、构建前端静态文件

```bash
cd /opt/xq/xq-frontend
npm ci
npm run build
```

构建产物目录：

```bash
/opt/xq/xq-frontend/dist
```

## 八、配置 Caddy

参考文件：

```bash
/opt/xq/xq-frontend/deploy/Caddyfile.example
```

推荐同域名部署：

- `https://88888245.xyz/` → 前端静态文件
- `https://88888245.xyz/api/*` → 后端接口
- `https://88888245.xyz/static/*` → 后端静态资源

## 九、上线后最小验收

```bash
curl http://127.0.0.1:3000/health
curl https://88888245.xyz/api/config/subjects
curl https://88888245.xyz/api/config/question-dimensions
```

浏览器打开：

```text
https://88888245.xyz
```

至少检查：

- 首页能看到真实题目
- 学科筛选能正常加载
- 登录页可访问
- 老师登录后 `/test` 可访问

## 十、后续更新流程

```bash
cd /opt/xq/xq-frontend
git pull

cd /opt/xq/xq-frontend/deploy
docker compose -f docker-compose.prod.yml up -d --build

cd /opt/xq/xq-frontend
npm ci
npm run build
```

## 十一、常用排查命令

```bash
cd /opt/xq/xq-frontend/deploy
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=200 backend
docker exec -it kpqa-backend sh
```

## 十二、回滚

```bash
cd /opt/xq/xq-frontend
git checkout <上一个稳定提交>

cd /opt/xq/xq-frontend/deploy
docker compose -f docker-compose.prod.yml up -d --build

cd /opt/xq/xq-frontend
npm ci
npm run build
```
