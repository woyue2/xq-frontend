# 前端 API 对接文档

**版本**: v1.1
**更新日期**: 2026-02-02

## 1. 概览

本项目已完成前端 API 层的基础设施建设，符合《前端 API 对接检查清单》的要求。

- **Base URL**: 通过环境变量 `VITE_API_BASE` 配置。
- **Mock**: 支持本地 Mock 数据，通过 `VITE_USE_MOCK=true` 开启。
- **Proxy**: 开发环境配置了 `/api` 代理到本地后端（默认 `http://localhost:3000`）。

## 2. 目录结构

- `src/services/api.ts`: 核心 API 客户端、拦截器及服务方法。
- `src/services/parentService.ts`: 家长端业务服务。
- `src/types/api.ts`: API 响应接口定义（DTO）。
- `src/test/api.test.ts`: API 层自动化测试用例。

## 3. 使用示例

### 3.1 调用接口

```typescript
import { questionService } from '@/services/api';

// 获取问题列表
const data = await questionService.getQuestions({ page: 1, limit: 10 });
console.log(data.items);

// 创建问题
await questionService.createQuestion({
    title: '如何学好 TypeScript?',
    subject: 'programming',
    difficulty: 'medium'
});
```

### 3.2 错误处理

全局拦截器已处理常见错误（401 跳转登录，403/500 弹窗提示）。业务代码中只需处理特定的业务逻辑错误。

## 4. 联调指南

1. **后端准备**: 确保后端服务运行在 `http://localhost:3000` (或修改 `vite.config.ts`)。
2. **关闭 Mock**: 在 `.env` 或启动命令中设置 `VITE_USE_MOCK=false`。
3. **运行测试**: `npm run test src/test/api.test.ts` 验证接口连通性。

## 5. 变更记录

- **2026-02-02**: 初始化 API 层，实现 Auth/Question/Interaction 服务，集成 Mock 适配器。
- **2026-02-02**: 新增家长端服务 (ParentService) 及相关 Mock 接口。

## 6. 家长端接口 (v2)

所有家长端接口统一前缀 `/api/v2/parent`。

### 6.1 绑定孩子
- **URL**: `/api/v2/parent/bind`
- **Method**: `POST`
- **Payload**:
  ```typescript
  {
    childName: string;
    phone: string;
    code: string;
    school?: string;
  }
  ```
- **Response**: `ChildInfo`

### 6.2 获取绑定列表
- **URL**: `/api/v2/parent/children`
- **Method**: `GET`
- **Response**: `ChildInfo[]`

### 6.3 获取孩子提问
- **URL**: `/api/v2/parent/questions/:childId`
- **Method**: `GET`
- **Params**:
  - `page`: number
  - `limit`: number
  - `subject`: string (optional)
  - `topic`: string (optional)
- **Response**: `PaginatedResponse<Question>`

### 6.4 解绑孩子
- **URL**: `/api/v2/parent/unbind`
- **Method**: `POST`
- **Payload**:
  - `childId`: string
- **Response**: `void`

