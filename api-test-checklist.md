# API 测试清单

## 环境变量检查
- [ ] `.env.local` 包含所有必需变量：
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `JWT_SECRET`
  - `OSS_UPLOAD_BASE_URL`
  - `OSS_UPLOAD_TOKEN`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`

---

## T1 — Comments 路由（语法修复验证）

### 测试 OPTIONS 请求
```bash
curl -X OPTIONS http://localhost:3000/api/comments \
  -H "Access-Control-Allow-Origin: *"
```
**预期**: 200 OK

### 测试 GET 请求（无 questionId）
```bash
curl -X GET "http://localhost:3000/api/comments" \
  -H "Content-Type: application/json"
```
**预期**: 400 Bad Request，message: "问题ID不能为空"

### 测试 GET 请求（有 questionId）
```bash
curl -X GET "http://localhost:3000/api/comments?questionId=test-id&page=1&limit=20" \
  -H "Content-Type: application/json"
```
**预期**: 200 OK，返回评论列表（可能为空）

---

## T4 — Upload 路由（环境变量 + 鉴权修复）

### 测试 OPTIONS 请求（应该不被拦截）
```bash
curl -X OPTIONS http://localhost:3000/api/upload \
  -H "Access-Control-Allow-Origin: *"
```
**预期**: 200 OK

### 测试 POST 请求（无 token）
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d '{"file":"data:image/png;base64,iVBORw0KGgo=","fileName":"test.png","fileType":"image/png"}'
```
**预期**: 401 Unauthorized，message: "未登录或token已过期"

### 测试 POST 请求（有 token）
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"file":"data:image/png;base64,iVBORw0KGgo=","fileName":"test.png","fileType":"image/png"}'
```
**预期**: 201 Created 或 500（取决于 OSS 配置）

---

## T5 — Auth 路由（基础验证）

### 测试登录
```bash
curl -X POST http://localhost:3000/api/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"password123"}'
```
**预期**: 200 OK + token，或 401 Unauthorized

### 测试注册
```bash
curl -X POST http://localhost:3000/api/auth?action=register \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138001","password":"password123","nickname":"TestUser","role":"student"}'
```
**预期**: 201 Created + token，或 403 Forbidden（白名单检查）

---

## 部署测试（Vercel）

1. **提交代码到 Git**
   ```bash
   git add .
   git commit -m "fix: T1 comments syntax, T4 env vars, T5 upload auth"
   git push origin main
   ```

2. **Vercel 自动部署**
   - 访问 Vercel Dashboard 查看部署状态
   - 检查 Function Logs 是否有错误

3. **测试生产环境**
   ```bash
   curl -X GET "https://your-vercel-domain.vercel.app/api/comments?questionId=test"
   ```

---

## 检查清单

- [ ] 本地构建成功（`npm run build`）
- [ ] 所有 API 路由编译无错误
- [ ] OPTIONS 请求返回 200
- [ ] 鉴权逻辑正确（401 for unauthorized）
- [ ] 环境变量完整（.env.example 已更新）
- [ ] Vercel 部署成功
- [ ] 生产环境 API 可访问

