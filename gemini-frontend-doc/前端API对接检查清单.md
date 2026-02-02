# 前端 API 对接注意事项 - 后端联调前检查清单

> **版本**: v1.0  
> **更新日期**: 2026-02-02  
> **目的**: 确保前端代码符合 API 规范，避免阻塞后端开发

---

## ⚠️ 重要提醒

后端开发即将开始！请前端同学在联调前完成以下检查，确保：
1. API 调用方式符合规范
2. 请求/响应数据结构正确
3. 错误处理逻辑完整

---

## 📋 检查清单

### 1. 基础配置检查

- [ ] **Base URL 配置**
  ```typescript
  // ✅ 正确：使用环境变量
  const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';
  
  // ❌ 错误：硬编码
  const API_BASE = 'http://localhost:3000/api';
  ```

- [ ] **Axios 实例配置**
  ```typescript
  // 确保配置了以下内容
  const api = axios.create({
    baseURL: API_BASE,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  ```

- [ ] **Token 拦截器**
  ```typescript
  // 请求拦截器：自动添加 Authorization
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  ```

---

### 2. 请求格式检查

#### 2.1 日期格式
- [ ] 所有日期字段使用 **ISO 8601** 格式
  ```typescript
  // ✅ 正确
  { validUntil: '2026-12-31T23:59:59Z' }
  { createdAt: new Date().toISOString() }
  
  // ❌ 错误
  { validUntil: '2026-12-31' }
  { createdAt: Date.now() }  // 时间戳
  ```

#### 2.2 分页参数
- [ ] 统一使用 `page` 和 `limit` 参数
  ```typescript
  // ✅ 正确
  GET /api/questions?page=1&limit=20
  
  // ❌ 错误
  GET /api/questions?pageNum=1&pageSize=20
  GET /api/questions?offset=0&count=20
  ```

#### 2.3 布尔值传递
- [ ] Query 参数中布尔值使用字符串
  ```typescript
  // ✅ 正确
  GET /api/notifications?unread=true
  
  // Body 中使用真正的布尔值
  POST /api/interactions/like
  { "isLike": true }  // ✅ 布尔类型
  ```

---

### 3. 响应处理检查

#### 3.1 统一响应格式
- [ ] 所有 API 响应遵循统一格式
  ```typescript
  interface ApiResponse<T> {
    code: number;      // 200 成功，其他为错误码
    message: string;   // 提示信息
    data: T | null;    // 业务数据
  }
  ```

- [ ] 正确解析响应
  ```typescript
  // ✅ 正确：检查 code
  const { code, message, data } = response.data;
  if (code === 200) {
    // 成功处理
  } else {
    toast.error(message);
  }
  
  // ❌ 错误：只检查 HTTP 状态码
  if (response.status === 200) {
    // 业务可能仍然失败！
  }
  ```

#### 3.2 分页响应
- [ ] 正确解析分页数据
  ```typescript
  interface PaginatedResponse<T> {
    code: number;
    message: string;
    data: {
      items: T[];        // 或 questions/users 等
      total: number;
      page: number;
      totalPages: number;
    };
  }
  ```

---

### 4. 错误处理检查

- [ ] **全局错误拦截器**
  ```typescript
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      const { status, data } = error.response || {};
      
      switch (status) {
        case 401:
          // Token 过期，跳转登录
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          toast.error('无权限访问');
          break;
        case 429:
          toast.error('请求过于频繁，请稍后再试');
          break;
        case 500:
          toast.error('服务器繁忙，请稍后再试');
          break;
        default:
          toast.error(data?.message || '网络错误');
      }
      
      return Promise.reject(error);
    }
  );
  ```

- [ ] **业务错误码处理**
  | 错误码 | 说明 | 前端处理 |
  |-------|------|---------|
  | 1001 | 手机号格式错误 | 显示输入框错误提示 |
  | 1002 | 验证码错误 | 显示验证码错误提示 |
  | 4001 | 手机号未在白名单 | 显示"请联系管理员" |
  | 4004 | 课时已过期 | 显示续费提示 |

---

### 5. 接口调用检查

#### 5.1 认证相关
- [ ] **发送验证码**
  ```typescript
  // POST /api/auth/send-code
  // 请求
  { phone: '13800138000' }  // 11位手机号
  
  // 响应
  // 最小合同
  { code: 200, message: 'success', data: null }
  // 实际实现中 data 还会包含 { phone, expireIn, cooldown } 等扩展字段，可用于展示倒计时
  
  // 注意：60秒内不可重复发送
  ```

- [ ] **登录/注册**
  ```typescript
  // POST /api/auth/login 或 /register
  // 请求
  { phone: '13800138000', code: '123456' }
  
  // 响应
  {
    code: 200,
    data: {
      token: 'jwt_token_here',
      refreshToken: 'refresh_token_here',
      user: { id, nickname, role, ... }
    }
  }
  
  // 登录成功后立即保存 token
  localStorage.setItem('token', data.token);
  ```

- [ ] **刷新 Token / 退出登录**
  ```typescript
  // 刷新访问令牌（需在拦截器或专门逻辑中调用）
  // POST /api/auth/refresh-token
  // 请求头: Authorization: Bearer {refreshToken}
  // 响应: { code: 200, data: { token, refreshToken, expiresIn } }

  // 退出登录
  // POST /api/auth/logout
  // 请求头: Authorization: Bearer {token}
  // 响应: { code: 200, message: '退出成功' }
  // 前端应清理本地 token，并跳转到登录页
  ```

#### 5.2 问题相关
- [ ] **创建问题**
  ```typescript
  // POST /api/questions
  {
    title: string,      // 必填，max 100
    content?: string,   // 可选，max 500
    images?: string[],  // 可选，max 3 个 URL
    tags?: string[],
    difficulty?: 'easy' | 'medium' | 'hard'
  }
  ```

- [ ] **图片上传**
  ```typescript
  // POST /api/questions/upload-image
  // 使用 FormData
  const formData = new FormData();
  formData.append('file', file);
  
  const { data } = await api.post('/questions/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  // 返回: { imageUrl: 'https://...' }
  ```

#### 5.3 互动相关
- [ ] **点赞/收藏**
  ```typescript
  // POST /api/interactions/like
  {
    targetType: 'question' | 'answer',
    targetId: 'q_123',
    action: 'like' | 'unlike'
  }
  
  // 响应
  { liked: true, likesCount: 42 }
  ```

- [ ] **我的点赞/收藏列表**
  ```typescript
  // GET /api/users/me/likes?page=1&pageSize=20
  // GET /api/users/me/favorites?page=1&pageSize=20
  // 响应（示例）
  {
    code: 200,
    data: {
      list: [ /* 问题列表，包含 likes/favorites/createdAt 等字段 */ ],
      pagination: { page, pageSize, total, totalPages }
    }
  }
  // 注意：字段命名与排序以后端文档和实现为准，最小依赖是问题基本信息 + 分页字段
  ```

---

### 6. 埋点相关检查

- [ ] **事件类型命名**
  ```typescript
  // ✅ 正确：下划线分隔
  analytics.track('question_like', { questionId: '123' });
  analytics.track('page_view', { path: '/home' });
  
  // ❌ 错误：驼峰或连字符
  analytics.track('questionLike', ...);
  analytics.track('page-view', ...);
  ```

- [ ] **必填属性**
  | 事件 | 必填属性 |
  |-----|---------|
  | `question_like` | `questionId`, `isLike` |
  | `question_favorite` | `questionId`, `isFavorite` |
  | `page_view` | `path` |
  | `search` | `query` |

- [ ] **timestamp 格式**
  ```typescript
  // ✅ 正确：毫秒时间戳
  { timestamp: Date.now() }  // 1738425600000
  
  // ❌ 错误：秒时间戳或 ISO 字符串
  { timestamp: Math.floor(Date.now() / 1000) }
  { timestamp: new Date().toISOString() }
  ```

---

### 7. Mock 数据迁移检查

- [ ] **Mock 数据结构与 API 一致**
  - [ ] `mockQuestions` 字段命名与 API 响应一致
  - [ ] `mockUsers` 包含 `validUntil` 课时有效期字段
  - [ ] `userLikes` / `userFavorites` 状态管理

- [ ] **API 切换开关**
  ```typescript
  // 环境变量控制
  const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
  
  // 或使用 MSW (Mock Service Worker)
  if (process.env.NODE_ENV === 'development') {
    const { worker } = await import('./mocks/browser');
    worker.start();
  }
  ```

---

### 8. TypeScript 类型检查

- [ ] **API 响应类型定义**
  ```typescript
  // src/types/api.ts
  export interface User {
    id: string;
    phone: string;
    nickname: string;
    avatar?: string;
    role: 'student' | 'parent' | 'teacher';
    grade?: string;
    validUntil?: string;  // ISO 日期
  }
  
  export interface Question {
    id: string;
    title: string;
    content?: string;
    authorId: string;
    authorName: string;
    status: 'pending' | 'approved' | 'rejected' | 'banned';
    isGoodQuestion: boolean;
    isPinned: boolean;
    stats: {
      likes: number;
      comments: number;
      favorites: number;
    };
    createdAt: string;
  }
  ```

- [ ] **确保前端类型与后端 API 一致**
  - [ ] 字段名完全匹配（注意大小写）
  - [ ] 可选字段正确标记
  - [ ] 枚举值一致

---

## 🔍 自检命令

```bash
# 1. 检查是否有硬编码的 API 地址
grep -r "localhost" src/ --include="*.ts" --include="*.tsx"
grep -r "127.0.0.1" src/ --include="*.ts" --include="*.tsx"

# 2. 检查日期格式使用
grep -r "new Date()" src/ --include="*.ts" --include="*.tsx"

# 3. 检查事件命名
grep -r "analytics.track" src/ --include="*.ts" --include="*.tsx"

# 4. 运行类型检查
npm run typecheck
```

---

## 📞 联调联系人

| 角色 | 负责人 | 联系方式 |
|-----|-------|---------|
| 后端开发 | 张三 | Backend Lead |
| 前端开发 | 李四 | Frontend Lead |

---

## ✅ 签署确认

完成以上检查后，请在下方签署：

- [ ] **前端负责人确认**: _______ 日期: _______
- [ ] **后端负责人确认**: _______ 日期: _______

---

**文档版本**: v1.0  
**最后更新**: 2026-02-02
