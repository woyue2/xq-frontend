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
  const API_BASE = 'http://localhost:4000/api';
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
  {
    validUntil: '2026-12-31T23:59:59Z';
  }
  {
    createdAt: new Date().toISOString();
  }

  // ❌ 错误
  {
    validUntil: '2026-12-31';
  }
  {
    createdAt: Date.now();
  } // 时间戳
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
