# backend 数据库配置与数据流说明

本项目的运行时数据库配置已经集中在 `src/config` 目录下，本文件用于在 `backend/config` 下对这些配置做统一说明，方便查阅和运维。

## 1. 环境变量与连接信息

- 数据库与缓存等连接信息在 `backend/.env` 中配置，常用字段包括：
  - `DATABASE_URL`：PostgreSQL 连接字符串
  - `REDIS_URL`：Redis 连接字符串
- `src/config/env.ts` 负责加载 `.env` 并用 `zod` 校验后导出 `env`，所有需要环境变量的模块都从这里读取。

## 2. 数据库客户端集中管理

- `src/config/database.ts` 使用 `@prisma/client` 创建 PrismaClient 单例：
  - `export const prisma = new PrismaClient();`
- 所有 Service / 路由层代码都通过 `import { prisma } from '../config/database';` 访问数据库，业务代码中禁止直接 `new PrismaClient()`。

## 3. 典型请求的完整代码链路示意（以“获取问题列表”为例）

以下以 `GET /api/questions` 为例，把从数据库到最终返回给前端的所有关键代码位置列出来，方便你逐个文件查：

1. **数据库模型定义（Prisma Schema）**  
   - 文件：`prisma/schema.prisma`  
   - 模型：`model Question { ... }`  
   - 这里定义了问题表的字段（`title/content/tags/status/isGoodQuestion/...`）与索引，Prisma 会据此生成 `prisma.question.findMany(...)`、`prisma.question.count(...)` 等方法。

2. **数据库客户端与连接配置**  
   - 文件：`src/config/env.ts`  
     - 从 `.env` 读取 `DATABASE_URL` 并用 `zod` 校验后导出 `env`。  
   - 文件：`src/config/database.ts`  
     - 创建 Prisma 客户端单例：`export const prisma = new PrismaClient();`  
     - 所有 Service / 测试 / 路由层代码都通过 `import { prisma } from '../config/database';` 使用该单例访问数据库。

3. **Service 层封装查询逻辑**  
   - 文件：`src/services/question.service.ts`  
   - 方法：`QuestionService.list(params)`  
     - 解析 `page/pageSize/status/isGoodQuestion/tags`，构造 `where` 条件。  
     - 并行执行两条 Prisma 查询：  
       - `prisma.question.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take })`  
       - `prisma.question.count({ where })`  
     - 将数据库原始记录映射为接口约定的返回结构（`list` + `pagination`）。

4. **路由层定义 HTTP 接口**  
   - 文件：`src/routes/question.routes.ts`  
   - 路由定义：  
     - `questionRouter.get('/', authMiddleware, async (req, res, next) => { ... })`  
   - 关键步骤：  
     - 从 `req.query` 中读取 `page/pageSize/status/isGoodQuestion/tags`。  
     - 调用 `questionService.list({ ... })` 获取列表数据。  
     - 统一响应格式返回：  
       - `res.json({ code: 200, message: 'success', data: result, timestamp: Date.now() });`

5. **中间件与应用注册位置**  
   - 文件：`src/app.ts`  
     - 创建应用并挂载路由：  
       - `const app = express();`  
       - `app.use('/api/questions', questionRouter);`  
     - 注册通用中间件：`helmet/cors/express.json/loggerMiddleware/errorMiddleware` 等。  
   - 文件：`src/server.ts`  
     - 从 `env.PORT` 读取端口：`const port = env.PORT;`  
     - 启动 HTTP 服务：  
       - `const app = createApp();`  
       - `app.listen(port, () => console.log(...));`

6. **集成测试对该请求的使用与验证**  
   - 文件：`src/tests/integration/question.api.spec.ts`  
   - 关键用例：  
     - `Q-API-005`：  
       - 使用 `prisma.question.createMany(...)` 预先写入多条问题数据。  
       - 通过 `request(app).get('/api/questions?page=1&pageSize=20&status=approved')` 调用接口。  
       - 断言返回列表中所有项 `q.status === 'approved'`，并检查分页信息。  
     - `Q-API-006` / `Q-API-007`：  
       - 分别插入不同 `isGoodQuestion` / `tags` 的记录，然后调用 `/api/questions?isGoodQuestion=true`、`/api/questions?tags=...` 验证筛选逻辑。  
   - 这些测试串联起：**Prisma 写入测试数据 → Service 查询 → 路由返回 → Supertest 断言** 的完整链路。

7. **前端如何调用该接口获取数据（示例）**  
   - 在前端可以这样请求问题列表（示意代码）：  
     ```ts
     async function fetchQuestions(token: string) {
       const res = await fetch('/api/questions?page=1&pageSize=20', {
         method: 'GET',
         headers: {
           'Content-Type': 'application/json',
           Authorization: `Bearer ${token}`
         }
       });
       const json = await res.json();
       // json.data.list 为问题数组，json.data.pagination 为分页信息
       return json.data;
     }
     ```  
   - 只要前端请求的 URL 保持 `/api/questions`，并携带合法的 `Authorization`，就会走上述这条从数据库到响应的完整流程。

## 4. 使用与维护建议

- 修改数据库连接信息时，优先在 `.env` 中更新 `DATABASE_URL`，无需改动业务代码。  
- 新增 Service 或路由时，统一从 `src/config/database.ts` 导入 `prisma`，保持数据库访问入口单一、便于连接池管理与故障排查。  
- 如需在生产环境区分不同数据库实例，可以通过环境变量管理多套 `.env` 文件，并通过 `BACKEND_ENV_PATH` 指定加载路径。  
