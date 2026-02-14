# 本地构建上传（小朋友版）

把部署想成“做一个便当盒”：
- 本地把饭菜装好（构建镜像）
- 把便当送到服务器（上传）
- 服务器直接开吃（启动容器）

你要用到的文件，我已经给你准备好了：
- `backend/Dockerfile`
- `deploy/4-docker-compose.1c1g.yml`
- `deploy/.env.prod.example`
- `deploy/Caddyfile.example`

---

## 第1步：在本地做“后端便当盒”

在项目根目录执行：

```bash
docker build --platform linux/amd64 -t kpqa-backend:local ./backend
```

这条命令会产出一个本地镜像：`kpqa-backend:local`。

---

## 第2步：把“后端便当盒”打包

```bash
docker save kpqa-backend:local | gzip > kpqa-backend-local.tar.gz
```

---

## 第3步：把“前端网页”和“部署文件”也打包

```bash
npm ci
npm run build
tar -czf kpqa-deploy-files.tgz dist deploy
```

---

## 第4步：把两个包上传到服务器

```bash
scp kpqa-backend-local.tar.gz kpqa-deploy-files.tgz user@your-server:/opt/
```

---

## 第5步：服务器上解包并启动

```bash
ssh user@your-server
cd /opt

# 解包部署文件
tar -xzf kpqa-deploy-files.tgz

# 导入后端镜像
gunzip -c kpqa-backend-local.tar.gz | docker load

# 进入部署目录
cd /opt/zsxq-4/deploy

# 复制生产环境变量模板（必须改密码和域名）
cp .env.prod.example .env.prod
vi .env.prod

# 如需 HTTPS 入口，复制 Caddy 模板并改域名
cp Caddyfile.example Caddyfile
vi Caddyfile

# 启动
docker compose -f 4-docker-compose.1c1g.yml up -d
```

---

## 第6步：检查是否成功

```bash
docker compose -f /opt/zsxq-4/deploy/4-docker-compose.1c1g.yml ps
curl -I http://127.0.0.1:3000/health
```

如果你有域名和 HTTPS，再测：

```bash
curl -I https://your-domain.com/health
```

---

## 3个最容易踩坑的地方

1. `JWT_SECRET` 没改  
会有安全风险，必须改成随机长字符串。

2. `CORS_ORIGIN` 乱填  
必须写你的前端域名（例如 `https://qa.example.com`），不能写 `*`。

3. 端口看错  
这个项目后端端口是 `3000`，健康检查也要看 `3000/health`。
