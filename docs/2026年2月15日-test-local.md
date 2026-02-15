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