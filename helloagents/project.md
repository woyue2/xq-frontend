# 项目技术约定（HelloAGENTS 知识库）

> 本文档作为知识星球问答小程序的技术约定总览，前后端实现应以此为基准进行演进和同步。

## 一、整体技术栈

- 前端：React 18 + TypeScript + Vite、React Router、Zustand、TanStack Query、Axios。
- UI 与样式：TailwindCSS 4、Radix UI 组件、部分 MUI 组件、动画与图表库等。
- 后端：Node.js 20 + Express + TypeScript。
- 数据访问：Prisma ORM，数据库使用 PostgreSQL。
- 缓存与限流：Redis（验证码发送频率控制、后续课时与会话扩展）。
- 鉴权与安全：JWT + 中间件校验、Zod 运行时参数校验。

## 二、后端目录与分层约定（摘要）

- `src/app.ts`：Express 应用入口，挂载中间件与路由。
- `src/config/`：环境变量、数据库、缓存等基础配置。
- `src/services/`：领域服务层，承载业务逻辑（例如认证、白名单、问题管理等）。
- `src/routes/`：HTTP 路由层，只做参数解析和结果返回，不直接访问数据库。
- `src/middlewares/`：日志、错误处理、鉴权、限流等中间件。
- `src/tests/`：单元测试与集成测试，按照模块拆分，集成测试覆盖关键业务路径。

具体编码规范与更细粒度要求详见 `codex-develop-doc/BACKEND-CODING_STANDARDS.md`。

## 三、API 设计约定

- 所有后端接口统一使用 RESTful 风格，基础前缀为 `/api`。
- 返回结构统一为：

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1706832000000
}
```

- 错误时使用 `code + message + error` 三元组，并在需要时补充 `data` 字段提供结构化错误信息。
- 与前端 `src/types/api.ts` 中定义的 `ApiResponse<T>`、`LoginResponse` 等类型保持一致。

## 四、测试与质量门槛

- 单元测试与集成测试覆盖率目标：整体行覆盖率 ≥ 80%，关键业务路径（认证、白名单、课时、问题创建与审核、行为埋点等）达到 100% 覆盖。
- 所有新模块在合入前必须至少有：
  - Service 层单元测试；
  - 关键接口的集成测试；
  - 若涉及对外接口变更，需同步更新 `wiki/api.md` 与对应模块文档。

## 五、知识库维护约定

- 当代码与文档冲突时，以代码为运行事实，文档必须在本次变更中同步更新。
- 所有架构与 API 决策需要在方案包的 `how.md` 中沉淀，并在合并后同步到 `wiki/arch.md` 或 `wiki/api.md`。

