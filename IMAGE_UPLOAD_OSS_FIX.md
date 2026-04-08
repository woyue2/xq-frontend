# Image Upload OSS 修复

## 问题描述

用户上传图片时遇到 Supabase Storage 错误：
```
[Upload:5lb4k] Supabase upload error: StorageApiError: Bucket not found
status: 400, statusCode: '404'
```

## 根本原因

`api/upload.ts` 使用了 Supabase Storage 上传图片，但项目实际使用的是 **imgurl.org OSS** 存储服务。

**错误代码**:
```typescript
// 错误：使用 Supabase Storage
const { data, error } = await supabase.storage
  .from('images')  // ❌ Bucket 不存在
  .upload(filePath, fileBuffer)
```

**正确配置**（`.env.local`）:
```env
OSS_UPLOAD_BASE_URL=https://www.imgurl.org/api/v3/upload
OSS_UPLOAD_TOKEN=sk-GZqa0eF4eTDzZiuze194MyApMF8JmZk6GXoImZInczAsFASxquqmBQgtxEKai
```

## 架构说明

### 当前架构
```
用户上传图片
    ↓
api/upload.ts (Vercel Serverless Function)
    ↓
imgurl.org OSS (第三方图片存储服务)
    ↓
返回公开访问 URL
    ↓
URL 存储在 Supabase Postgres 数据库
```

**关键点**:
- ✅ 图片文件存储在 imgurl.org OSS
- ✅ 图片 URL 存储在 Supabase Postgres
- ❌ 不使用 Supabase Storage

### 为什么使用 imgurl.org OSS？

1. **成本**: imgurl.org 提供免费或低成本的图片托管
2. **简单**: 无需配置 Supabase Storage bucket
3. **CDN**: imgurl.org 自带 CDN 加速
4. **独立**: 图片存储与数据库分离

## 解决方案

### 1. 修改 api/upload.ts

**修改前**（使用 Supabase Storage）:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// 上传到 Supabase Storage
const { data, error } = await supabase.storage
  .from('images')
  .upload(filePath, fileBuffer)
```

**修改后**（使用 imgurl.org OSS）:
```typescript
// imgurl.org OSS 配置
const OSS_UPLOAD_BASE_URL = process.env.OSS_UPLOAD_BASE_URL
const OSS_UPLOAD_TOKEN = process.env.OSS_UPLOAD_TOKEN

// 上传到 imgurl.org OSS
async function uploadToOSS(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  const FormData = (await import('form-data')).default
  const formData = new FormData()
  
  formData.append('file', fileBuffer, {
    filename: fileName,
    contentType: mimeType
  })

  const response = await fetch(OSS_UPLOAD_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OSS_UPLOAD_TOKEN}`,
      ...formData.getHeaders()
    },
    body: formData as any
  })

  const result = await response.json()
  return result.data.url  // 返回图片 URL
}
```

### 2. 安装依赖

```bash
npm install form-data
npm install --save-dev @types/form-data
```

## imgurl.org API 说明

### 请求格式

```http
POST https://www.imgurl.org/api/v3/upload
Authorization: Bearer {OSS_UPLOAD_TOKEN}
Content-Type: multipart/form-data

file: (binary)
```

### 响应格式

```json
{
  "status": 200,
  "data": {
    "url": "https://example.imgurl.org/images/xxx.jpg",
    "thumbnail": "https://example.imgurl.org/images/xxx_thumb.jpg",
    "delete_url": "https://example.imgurl.org/delete/xxx"
  }
}
```

## 测试步骤

### 1. 重启 Vercel Dev

```bash
# 停止当前的 vercel dev (Ctrl+C)
# 重新启动
vercel dev
```

### 2. 测试图片上传

```bash
# 1. 登录账号
# 访问 http://localhost:3000/login
# 手机号：13800000001
# 密码：admin123

# 2. 创建问题
# 访问 http://localhost:3000/create
# 点击"上传图片"按钮
# 选择一张图片（< 5MB）
# 点击上传
```

**预期结果**:
- ✅ 图片上传成功
- ✅ 返回 imgurl.org 的 URL
- ✅ 图片在问题中正常显示

### 3. 验证图片 URL

上传成功后，检查返回的 URL：
```
https://example.imgurl.org/images/1234567890-abc123.jpg
```

应该是 imgurl.org 域名，而不是 Supabase 域名。

## 环境变量配置

### 本地开发（.env.local）

```env
OSS_UPLOAD_BASE_URL=https://www.imgurl.org/api/v3/upload
OSS_UPLOAD_TOKEN=sk-GZqa0eF4eTDzZiuze194MyApMF8JmZk6GXoImZInczAsFASxquqmBQgtxEKai
```

### 生产环境（Vercel Dashboard）

在 Vercel Dashboard 中配置：
1. Settings → Environment Variables
2. 添加：
   - `OSS_UPLOAD_BASE_URL`: `https://www.imgurl.org/api/v3/upload`
   - `OSS_UPLOAD_TOKEN`: `sk-GZqa0eF4eTDzZiuze194MyApMF8JmZk6GXoImZInczAsFASxquqmBQgtxEKai`

## 支持的图片格式

- ✅ JPG / JPEG
- ✅ PNG
- ✅ GIF
- ✅ WEBP

**最大文件大小**: 5MB

## 错误处理

### 1. OSS Token 无效

```
Error: OSS upload failed: 401 Unauthorized
```

**解决**: 检查 `OSS_UPLOAD_TOKEN` 是否正确

### 2. 文件过大

```
Error: 图片大小不能超过 5MB
```

**解决**: 压缩图片或选择更小的图片

### 3. 格式不支持

```
Error: 不支持的图片格式，仅支持 jpg, jpeg, png, gif, webp
```

**解决**: 转换图片格式

## 相关文件

### 修改的文件
- `api/upload.ts` - 从 Supabase Storage 改为 imgurl.org OSS

### 新增依赖
- `form-data` - 用于构建 multipart/form-data 请求
- `@types/form-data` - TypeScript 类型定义

### 环境变量
- `OSS_UPLOAD_BASE_URL` - imgurl.org API 地址
- `OSS_UPLOAD_TOKEN` - imgurl.org API Token

## TypeScript 检查

```bash
npx tsc --noEmit
```

**结果**: ✅ `api/upload.ts: No diagnostics found`

## 数据流程

### 上传流程

```
1. 用户选择图片
   ↓
2. 前端发送 POST /api/upload
   Content-Type: multipart/form-data
   Authorization: Bearer {JWT_TOKEN}
   ↓
3. api/upload.ts 验证用户登录
   ↓
4. 解析 multipart/form-data
   ↓
5. 验证文件格式和大小
   ↓
6. 上传到 imgurl.org OSS
   POST https://www.imgurl.org/api/v3/upload
   Authorization: Bearer {OSS_UPLOAD_TOKEN}
   ↓
7. 返回图片 URL
   { url: "https://example.imgurl.org/images/xxx.jpg" }
   ↓
8. 前端将 URL 保存到问题/答案的 images 数组
   ↓
9. 提交问题/答案时，URL 存储到 Supabase Postgres
```

### 显示流程

```
1. 用户访问问题详情页
   ↓
2. 从 Supabase Postgres 读取问题数据
   包含 images: ["https://example.imgurl.org/images/xxx.jpg"]
   ↓
3. 前端渲染 <img src="..." />
   ↓
4. 浏览器从 imgurl.org CDN 加载图片
```

## 总结

✅ **Image Upload OSS 修复完成**

**根本原因**: 使用了 Supabase Storage 而不是 imgurl.org OSS

**解决方案**:
1. 修改 api/upload.ts 使用 imgurl.org API
2. 安装 form-data 依赖
3. 配置 OSS 环境变量

**架构**:
- 图片存储：imgurl.org OSS
- 图片 URL：Supabase Postgres
- 不使用：Supabase Storage

**测试**: 重启 vercel dev 后上传图片应该成功

---

生成时间: 2026-04-09
