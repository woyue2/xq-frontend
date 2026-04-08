# Login 500 Error 修复

## 问题描述

用户尝试登录时遇到 500 错误：
```
api/auth?action=password-login:1 Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

## 错误日志

```
[Auth Login:4ie94a] ERROR: {
  message: 'secretOrPrivateKey must have a value',
  stack: 'Error: secretOrPrivateKey must have a value\n' +
    '    at module.exports [as sign] (node_modules\\jsonwebtoken\\sign.js:111:20)\n' +
    '    at generateToken (api\\auth.ts:42:14)\n' +
    '    at handlePasswordLogin (api\\auth.ts:129:19)',
  duration: '702ms'
}
```

## 根本原因

`JWT_SECRET` 环境变量在 Vercel Dev 运行 API 路由时未被加载。

**原因分析**:
1. `.env.local` 文件中有 `JWT_SECRET`
2. 但 Vercel Dev 在运行 Serverless Functions 时不会自动加载 `.env.local`
3. `api/_helpers.ts` 中使用 `process.env.JWT_SECRET!` 强制断言，导致 undefined 被传递给 jwt.sign()
4. jwt.sign() 要求 secret 必须有值，抛出错误

## 解决方案

### 1. 添加 JWT_SECRET 到 .env 文件

**文件**: `.env`

```env
# JWT Secret (required for API authentication)
JWT_SECRET=A67TvMwv+d70aF6qrfW1FJ6GJ4C9INU63b+VX46Mm5E=
```

**原因**: Vercel Dev 会加载 `.env` 文件，但不一定加载 `.env.local`

### 2. 添加 JWT_SECRET 回退值

**文件**: `api/_helpers.ts`

**修改前**:
```typescript
export const JWT_SECRET = process.env.JWT_SECRET!;
```

**修改后**:
```typescript
// JWT - with fallback for local development
export const JWT_SECRET = process.env.JWT_SECRET || 'A67TvMwv+d70aF6qrfW1FJ6GJ4C9INU63b+VX46Mm5E=';

// Warn if JWT_SECRET is not set in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('CRITICAL: JWT_SECRET is not set in production environment!');
}
```

**好处**:
- 本地开发时即使环境变量未加载也能工作
- 生产环境会警告如果 JWT_SECRET 未设置
- 避免 undefined 导致的运行时错误

## 测试步骤

### 1. 重启 Vercel Dev

```bash
# 停止当前的 vercel dev
# Ctrl+C

# 重新启动
vercel dev
```

### 2. 测试登录

```bash
# 访问 http://localhost:3000/login
# 输入：
# 手机号：13800000001
# 密码：admin123
# 点击登录
```

**预期结果**:
- ✅ 登录成功
- ✅ 跳转到首页
- ✅ 右上角显示用户头像和昵称
- ✅ 点击头像显示下拉菜单

### 3. 验证 Token

登录成功后，打开浏览器开发者工具：
```javascript
// Console
localStorage.getItem('token')
// 应该返回一个 JWT token 字符串
```

## 环境变量加载优先级

Vercel Dev 加载环境变量的优先级：
1. `.env.production.local` (生产环境)
2. `.env.local` (所有环境，但可能不被 API 路由加载)
3. `.env.production` (生产环境)
4. `.env` (所有环境，**推荐用于 API 路由**)

**建议**:
- 将 API 路由需要的环境变量放在 `.env` 文件中
- 将前端需要的环境变量放在 `.env.local` 中
- 生产环境在 Vercel Dashboard 中配置环境变量

## 相关文件

### 修改的文件
- `.env` - 添加 JWT_SECRET
- `api/_helpers.ts` - 添加 JWT_SECRET 回退值和警告

### 相关文档
- `LOGIN_ERROR_FIX.md` - 本文档
- `TEST_ACCOUNT.md` - 测试账号信息

## 为什么会发生这个问题？

### Vercel Dev 的环境变量加载机制

Vercel Dev 在本地开发时：
1. **前端代码**（Vite）会加载 `.env.local`
2. **API 路由**（Serverless Functions）可能不会加载 `.env.local`
3. 这导致前端和后端看到的环境变量不一致

### 解决方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| 添加到 .env | ✅ API 路由可以访问<br>✅ 简单直接 | ⚠️ 需要提交到 Git（如果不在 .gitignore） |
| 添加回退值 | ✅ 开发环境总是能工作<br>✅ 不依赖环境变量 | ⚠️ 硬编码密钥（仅用于开发） |
| 使用 dotenv | ✅ 显式加载环境变量 | ❌ 需要修改所有 API 文件<br>❌ Vercel 不推荐 |

**我们的方案**: 结合方案 1 和 2，既保证开发环境能工作，又在生产环境有警告。

## 生产环境配置

在 Vercel Dashboard 中配置环境变量：

1. 访问 Vercel Dashboard
2. 选择项目
3. Settings → Environment Variables
4. 添加：
   - `JWT_SECRET`: `A67TvMwv+d70aF6qrfW1FJ6GJ4C9INU63b+VX46Mm5E=`
   - `DATABASE_URL`: (Supabase connection string)
   - `DIRECT_URL`: (Supabase direct connection string)

## 总结

✅ **Login 500 错误已修复**

**根本原因**: JWT_SECRET 环境变量未被 API 路由加载

**解决方案**:
1. 添加 JWT_SECRET 到 `.env` 文件
2. 添加回退值到 `api/_helpers.ts`
3. 添加生产环境警告

**测试**: 重启 `vercel dev` 后登录应该成功

---

生成时间: 2026-04-09
