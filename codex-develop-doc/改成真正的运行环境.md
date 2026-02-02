backend/.env
PORT=4000
bash deploy/dev-backend.sh
http://localhost:4000/health ===> it is good



一、把后端端口改成 4000 再启动

  1. 编辑 backend/.env，把这一行：
      - 原来：PORT=3000
      - 改成：PORT=4000
  2. 在仓库根目录重新执行一次：
      - bash deploy/dev-backend.sh
  3. 这次迁移部分会很快 “Already in sync”，然后 dev 服务器
     应该在 4000 端口 启动成功。
      - 可以在浏览器打开 http://localhost:4000/health，看到
        JSON（有 status: "ok"）就说明后端 OK 了。

  ———

  二、前端需要改什么？（让它连到真实后端）

  1. 确认前端不再用 mock：
      - 打开根目录的 .env，改成：
          - VITE_API_BASE=/api（已经是这样就不用改）
          - VITE_USE_MOCK=false（默认是 true，需要改成
            false 才会走真实后端）
  2. 修改 Vite 的代理端口，让 /api 代理到 4000：
      - 打开 vite.config.ts，找到：

        server: {
          proxy: {
            '/api': {
              target: 'http://localhost:3000',
      - 把 3000 改成 4000：

        target: 'http://localhost:4000',
  3. 重启前端 dev 服务：
      - 在项目根目录执行：npm run dev
      - 浏览器访问前端（一般是 http://localhost:5173），前
        端所有调用 /api/... 的请求会被 Vite 代理到 http://
        localhost:4000/...，也就是你刚启动的后端。

  ———

  三、会不会影响以后环境/部署？

  - 上面修改只影响你本机的开发环境：
      - 后端端口从 3000 换到 4000；
      - 前端 dev 代理从 3000 换到 4000；
      - 关闭 mock，让前端真正打到后端。
  - 生产环境用的是 .env.production 和部署脚本（deploy/
    docker-compose.1c1g.yml 等），这些都没动，所以不会影响
    以后上线/正式环境。

  如果你愿意，我下一步可以帮你一起确认一下：

  - backend/.env 里的 PORT 和
  - 根 .env 里的 VITE_USE_MOCK

  是不是已经按上面的值改好了，然后你再贴一下 bash deploy/
  dev-backend.sh 和 npm run dev 前端的最新启动日志，我帮你
  看是否已经进入“联调就绪”状态。