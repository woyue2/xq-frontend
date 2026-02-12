# 前端 API 层审查报告

> **审查日期**: 2026-02-02  
> **审查依据**: `前端API对接检查清单.md`  
> **审查范围**: `src/services/api.ts`, `src/types/api.ts`

---

## ✅ 通过项 (20/25)

| 检查项                     | 状态 | 说明                                                        |
| -------------------------- | ---- | ----------------------------------------------------------- |
| **1. Base URL 配置**       | ✅   | 使用 `VITE_API_BASE` 环境变量 (L18)                         |
| **2. Axios 实例配置**      | ✅   | 配置完整：baseURL, timeout, headers (L22-28)                |
| **3. Token 拦截器**        | ✅   | 请求拦截器自动添加 Bearer token (L31-37)                    |
| **4. 统一响应格式**        | ✅   | `ApiResponse<T>` 定义正确 (api.ts L4-8)                     |
| **5. 分页响应格式**        | ✅   | `PaginatedResponse<T>` 定义正确 (api.ts L11-16)             |
| **6. 全局错误拦截器**      | ✅   | 处理 401/403/429/500 (api.ts L187-220)                      |
| **7. 401 跳转登录**        | ✅   | 清除 token + 跳转 /login (L203-204)                         |
| **8. 业务错误码检查**      | ✅   | 检查 `code !== 200` 并 toast 提示 (L192-194)                |
| **9. TypeScript 类型定义** | ✅   | `User`, `Question`, `ApiResponse`, `PaginatedResponse` 完整 |
| **10. 请求类型定义**       | ✅   | `LoginPayload`, `CreateQuestionPayload` 等完整              |
| **11. FormData 上传**      | ✅   | `uploadImage` 正确使用 FormData (L246-252)                  |
| **12. 多文件结构**         | ✅   | `services/api.ts` + `types/api.ts` 分离                     |
| **13. Mock 数据支持**      | ✅   | 完整的 Mock 拦截器 (L40-184)                                |
| **14. 响应数据解包**       | ✅   | 服务方法返回 `data.data` (L236, L240, L244)                 |
| **15. Content-Type 设置**  | ✅   | JSON 默认，FormData 动态设置                                |
| **16. 代理配置**           | ✅   | `vite.config.ts` 配置 /api -> localhost:3000                |
| **17. Mock 开关**          | ✅   | `VITE_USE_MOCK` 环境变量控制 (L19)                          |
| **18. 网络延迟模拟**       | ✅   | Mock 模式下 500ms 延迟 (L43)                                |
| **19. 分页参数**           | ✅   | 使用 page/limit (QuestionListParams)                        |
| **20. 服务方法封装**       | ✅   | authService, questionService, interactionService            |

---

## ❌ 缺失项 (5/25)

### 1. 缺少 `.env` 文件 ⚠️

**问题**: 项目根目录没有 `.env` 文件，环境变量未配置

**影响**:

- `VITE_API_BASE` 未设置，将使用默认值 `/api`
- `VITE_USE_MOCK` 未设置，代码强制为 `true`

**建议创建**:

```env
# .env
VITE_API_BASE=/api
VITE_USE_MOCK=true

# .env.production
VITE_API_BASE=https://api.example.com/api/v1
VITE_USE_MOCK=false
```

---

### 2. 缺少埋点分析 API ⚠️

**问题**: 虽然有 Mock 处理 `/behavior/log` (L172-180)，但缺少正式的服务方法

**建议添加**:

```typescript
export const behaviorService = {
  log: async (type: string, metadata?: Record<string, any>) => {
    return api.post<ApiResponse<{ logId: string }>>('/behavior/log', {
      type,
      timestamp: Date.now(),
      metadata,
    });
  },
  batchLog: async (events: Array<{ type: string; timestamp: number; metadata?: any }>) => {
    return api.post<ApiResponse<{ received: number; processed: number }>>('/behavior/batch-log', {
      events,
    });
  },
};
```

---

### 3. 缺少白名单管理 API ⚠️

**问题**: 后端需求文档定义了白名单系统，但前端缺少对应服务

**建议添加**:

```typescript
export const adminService = {
  getWhitelist: async (params: WhitelistParams) => {
    const { data } = await api.get<ApiResponse<PaginatedResponse<WhitelistUser>>>(
      '/admin/whitelist',
      { params },
    );
    return data.data;
  },
  addToWhitelist: async (payload: AddWhitelistPayload) => {
    const { data } = await api.post<ApiResponse<WhitelistUser>>('/admin/whitelist', payload);
    return data.data;
  },
  removeFromWhitelist: async (id: string) => {
    const { data } = await api.delete<ApiResponse<null>>(`/admin/whitelist/${id}`);
    return data.data;
  },
  updateValidity: async (id: string, validUntil: string) => {
    const { data } = await api.patch<ApiResponse<null>>(`/admin/whitelist/${id}/validity`, {
      validUntil,
    });
    return data.data;
  },
};
```

---

### 4. 缺少收藏 API ⚠️

**问题**: 有 `like` 但没有 `favorite` 服务方法

**建议添加**:

```typescript
export const interactionService = {
  like: async (payload: LikePayload) => {
    /* existing */
  },
  favorite: async (payload: FavoritePayload) => {
    const { data } = await api.post<ApiResponse<FavoriteResponse>>(
      '/interactions/favorite',
      payload,
    );
    return data.data;
  },
};
```

---

### 5. 缺少通知 API ⚠️

**问题**: 后端需求文档定义了通知系统 (3.10)，但前端缺少实现

**建议添加**:

```typescript
export const notificationService = {
  getNotifications: async (params: { page?: number; limit?: number; unread?: boolean }) => {
    const { data } = await api.get<ApiResponse<PaginatedResponse<Notification>>>('/notifications', {
      params,
    });
    return data.data;
  },
  markAsRead: async (ids: string[]) => {
    const { data } = await api.post<ApiResponse<null>>('/notifications/read', { ids });
    return data.data;
  },
  getUnreadCount: async () => {
    const { data } = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return data.data;
  },
};
```

---

## ⚠️ 改进建议 (7项)

### 1. 日期格式验证

**当前**: 代码中没有日期格式验证  
**建议**: 添加辅助函数确保 ISO 8601 格式

```typescript
export const toISODate = (date: Date | string): string => {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
};
```

---

### 2. Mock 模式强制启用

**当前**: `USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || true;` (L19)  
**问题**: 即使设置 `VITE_USE_MOCK=false` 仍会启用 Mock

**建议修复**:

```typescript
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
```

---

### 3. 响应拦截器逻辑

**当前**: 同时检查 HTTP 状态码和 `code` 字段  
**建议**: 统一处理顺序，避免重复 toast

```typescript
api.interceptors.response.use(
  (response) => {
    // 优先检查业务 code
    if (response.data?.code && response.data.code !== 200) {
      toast.error(response.data.message || '请求失败');
      return Promise.reject(new Error(response.data.message));
    }
    return response;
  },
  (error) => {
    // HTTP 错误处理...
  },
);
```

---

### 4. 缺少请求 ID

**建议**: 添加 `X-Request-ID` 用于链路追踪

```typescript
api.interceptors.request.use((config) => {
  config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return config;
});
```

---

### 5. 缺少客户端版本号

**建议**: 添加 `X-Client-Version` 头

```typescript
api.interceptors.request.use((config) => {
  config.headers['X-Client-Version'] = import.meta.env.VITE_APP_VERSION || '1.0.0';
  return config;
});
```

---

### 6. Mock 数据类型不完整

**当前**: Mock 登录返回 `mockUsers[0]`，但可能缺少 `validUntil` 等字段  
**建议**: 确保 Mock 数据结构与后端 API 完全一致

---

### 7. 缺少注册 API

**当前**: 只有 `login`，没有 `register`  
**建议**: 添加注册接口

```typescript
export const authService = {
  sendCode: async (payload: SendCodePayload) => {
    /* existing */
  },
  login: async (payload: LoginPayload) => {
    /* existing */
  },
  register: async (payload: RegisterPayload) => {
    const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/register', payload);
    return data.data;
  },
};
```

---

## 📊 总体评分

| 类别           | 得分           |
| -------------- | -------------- |
| **基础配置**   | 5/5 ⭐⭐⭐⭐⭐ |
| **请求处理**   | 4/5 ⭐⭐⭐⭐   |
| **响应处理**   | 5/5 ⭐⭐⭐⭐⭐ |
| **错误处理**   | 5/5 ⭐⭐⭐⭐⭐ |
| **类型安全**   | 4/5 ⭐⭐⭐⭐   |
| **API 完整性** | 3/5 ⭐⭐⭐     |
| **Mock 支持**  | 5/5 ⭐⭐⭐⭐⭐ |

**综合评分**: **20/25 (80%)** ✅ 良好

---

## 🎯 优先级建议

### P0 (必须修复，阻塞联调)

1. ✅ 创建 `.env` 文件
2. ✅ 修复 Mock 强制启用问题
3. ✅ 添加埋点分析服务 (`behaviorService`)
4. ✅ 添加注册 API (`authService.register`)

### P1 (重要，建议补充)

5. ⚠️ 添加收藏服务 (`interactionService.favorite`)
6. ⚠️ 添加通知服务 (`notificationService`)
7. ⚠️ 添加白名单管理服务 (`adminService`)

### P2 (优化，提升体验)

8. 🔧 添加请求 ID 和客户端版本号
9. 🔧 日期格式验证辅助函数
10. 🔧 确保 Mock 数据结构完整

---

**审查人**: AI Assistant  
**下一步**: 根据优先级实施改进方案
