现在的结构化日志没有单独写文件，都是直接打到「后端
  进程的标准输出」，所以你在哪里跑后端，就在哪里看得
  到：

  - 本地开发看日志
      - 终端执行：cd backend && npm run dev
      - 保持这个终端开着，然后在前端里点「登录/提
        问」等操作，就会在这个终端看到 pino 打出来的
        JSON 日志（包含 method/url/statusCode，错误
        时还有 type/status/code/error/path/
        method）。
  - 用 Docker 跑时看日志
      - 在项目根目录：docker compose logs -f
        backend（服务名以你 docker-compose.yml 里的
        为准）
      - 同样是操作前端，然后在这个命令的输出里看结构
        化日志。
  - 如果你想落盘成文件（选做）
      - 最简单是启动时重定向：cd backend && npm run
        dev 2>&1 | tee backend.log，之后就可以用
        rg / 编辑器去查 backend.log 里的记录。

  你可以先用第一种（npm run dev）跑一下，然后随便触
  发一个 400/500 的接口，就能看到我前面说的那种带
  app_error/validation_error/unknown_error 字段的日
  志行。


   这些是 pino 的结构化日志，level 是“日志级别”，用数字表示严重程
  度，不是 HTTP 状态码：

  - 常见对应关系：
      - 10 trace（跟踪）
      - 20 debug（调试）
      - 30 info（信息）
      - 40 warn（警告）
      - 50 error（错误）
      - 60 fatal（致命错误）
  - 你贴的三条日志含义分别是：
      1. {"level":30,... "msg":"request completed"}：info 级别，表
         示 POST /api/auth/login 请求正常完成，res.statusCode:
         200。
      2. {"level":50,...
         "type":"app_error","status":401,"error":"UNAUTHORIZED",...
         }：error 级别，表示处理 GET /api/questions 时在
         authMiddleware 里抛出了“未登录”业务错误（HTTP 401）。
      3. 之后那条 {"level":30,... "statusCode":401,"msg":"request
         completed"}：info 级别的访问日志，说明这个请求最终以 401
         状态返回给客户端。