💡【HelloAGENTS】- 咨询问答

可以，给你一套“本地把后端完整拉起来”的最小执行方案（按你当
前项目结构）。

一、前置检查（先做）

1. 确认 Docker 可用
    docker --version
    docker compose version
2. 确认端口未占用

- 3000（backend）
- 5432（postgres）
- 6379（redis）

二、准备后端环境文件

1. 进入部署目录
    cd /mnt/c/Users/Administrator/Downloads/zsxq-4/deploy
2. 确认有 deploy/.env.prod（这是你当前 compose 用的
    env_file）
    至少保证这些变量有值：

- POSTGRES_PASSWORD
- DATABASE_URL（通常指向 compose 内 postgres，如
postgresql://kpqa:密码@postgres:5432/kpqa_db?
schema=public）
- 你后端其余必需变量（按现有 .env.prod 保持）

三、构建后端镜像（关键）
你现在 compose 用的是本地镜像 kpqa-backend:local 且
pull_policy: never，所以必须先构建：

在项目根目录执行：

cd /mnt/c/Users/Administrator/Downloads/zsxq-4
docker buildx build --load -t kpqa-backend:local ./backend

说明：

- 第一次会比较慢（Playwright 基镜像 + Chromium 安装）。
- 如果这里失败，多半是网络拉取 mcr.microsoft.com/
playwright 受限。

四、启动后端整套依赖（postgres/redis/backend）

cd /mnt/c/Users/Administrator/Downloads/zsxq-4
docker compose -f deploy/4-docker-compose.1c1g.yml up -d
postgres redis backend

五、初始化数据库（首次必做）
后端容器启动后执行：

docker exec -it kpqa-backend npx prisma migrate deploy
docker exec -it kpqa-backend npx prisma generate

如果你本地没有 migration 历史可部署，可用开发模式（仅本
地）：

docker exec -it kpqa-backend npx prisma migrate dev

六、健康检查与日志

1. 健康检查：
    curl http://localhost:3000/health
2. 看后端日志：
    docker logs -f kpqa-backend
3. 看 compose 服务状态：
    docker compose -f deploy/4-docker-compose.1c1g.yml ps

七、验证 PDF 能力（最关键）

- 先用家长/学生/老师正常登录拿 token。
- 在前端走“打印题目 -> 导出 PDF”。
- 若失败，看 kpqa-backend 日志里是否出现：
    - PDF_RENDER_FAILED（通常是浏览器运行环境问题）
    - FORBIDDEN（角色或题目范围校验问题）

———

如果你愿意，我下一步可以给你一份“从 0 到可登录可导出”的一
键检查清单（每一步附期望结果），你照着逐条打勾即可。


## 前端
cd /mnt/c/Users/Administrator/Downloads/zsxq-4
npm install
npm run build
docker compose --env-file deploy/.env.prod -f deploy/4-docker-compose.1c1g.yml up -d caddy


cd /mnt/c/Users/Administrator/Downloads/zsxq-4
docker compose --env-file deploy/.env.prod -f deploy/4-docker-compose.1c1g.yml up -d postgres redis backend caddy
docker compose --env-file deploy/.env.prod -f deploy/4-docker-compose.1c1g.yml ps

---------

科普 整理 

💡【HelloAGENTS】- 咨询问答

你现在的环境文件可以按这张“完整线路图”理解：

前端开发（Vite）主要读：/mnt/c/Users/Administrator/Downloads/zsxq-4/.env
作用：前端变量（VITE_*），例如 VITE_API_BASE、VITE_USE_MOCK。
影响对象：前端（npm run dev / npm run build）。

前端生产构建可读：.env.production
作用：前端生产变量（VITE_*）。
影响对象：前端（生产构建时）。

前端测试读：.env.test
作用：Vitest 测试变量。
影响对象：前端测试（vitest，vite.config.ts 里指定了 envFile: '.env.test'）。

后端本机运行默认读：/mnt/c/Users/Administrator/Downloads/zsxq-4/backend/.env
作用：DATABASE_URL、REDIS_URL、JWT_SECRET、CORS_ORIGIN 等。
影响对象：后端（你在 backend/ 目录执行 npm run dev 时）。
代码入口：env.ts，默认 dotenv.config({ path: '.env' })。

后端容器运行读：.env.prod
作用：通过 compose 的 env_file 注入 backend 容器；也可通过 --env-file 给 compose 变量替换用。
影响对象：后端容器 + compose 变量替换。
注意：4-docker-compose.1c1g.yml 里 backend 用 .env.prod。

Postgres 容器密码来源（compose 变量替换）
文件来源通常也是 .env.prod，但前提是命令要带：.env.prod。
变量是 POSTGRES_PASSWORD。
影响对象：postgres 容器初始化参数（不是前端）。

示例文件（不直接生效）
.env.example、.env.prod.example、.env.backend.example 都是模板/示例，不会自动生效，除非你复制成真正 .env 并被对应启动命令读取。

你这次混乱的核心原因只有一个：
本机后端读的是 backend/.env，容器后端读的是 .env.prod，两边 DB 密码不一致就会 P1000。

最稳做法（给你一个规则）：

本机联调：统一改 backend/.env
容器联调：统一改 .env.prod + 启动时带 .env.prod



明白，你说的是容器联调时前端。

结论先说：
容器联调里前端（Caddy 提供 dist/ 静态文件）不在运行时读 .env，它读的是你构建 dist 当时注入的前端环境变量。

在你这个项目里：

.env.prod
主要给 compose / backend / postgres 用，不是前端运行时配置。

前端容器联调实际取值来源
取决于你执行 npm run build 时的 mode：

默认 npm run build（vite build）=> production mode，主要用 .env.production（也会合并 .env，同名以后者优先级规则覆盖）。
若你显式 vite build --mode xxx，就会用 .env.xxx。
你当前 caddy 配置是挂载 ../dist
所以前端环境已经“烘焙进 dist”，改 .env.production 后必须重新 build 才生效。

最实用一句：

容器联调前端看哪个 env，不看 compose，而看你最后一次 npm run build 用的 mode。
默认就是 .env.production（加上 .env 基础项）。