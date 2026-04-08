# 性能审计 - 额外发现的问题

## 已完成的优化（回顾）

✅ **优化 1**: 移除 N+1 查询（answers.ts & comments.ts）
✅ **优化 2**: Prisma Client 连接池配置（_helpers.ts）
✅ **优化 3**: 首页列表查询优化（questions.ts - 使用 _count）
✅ **优化 4**: 前端并行请求（QuestionDetailPage.tsx）
✅ **优化 5**: 移除重复用户查询（questions.ts, answers.ts, comments.ts）
✅ **优化 6**: SubjectTopicSelector 缓存（5分钟 TTL）
✅ **优化 7**: 生产环境 console.log 移除（auth.ts, upload.ts）

---

## 新发现的性能问题

### 问题 8：数据库索引缺失 ⚠️ 高优先级

**位置**: `prisma/schema.prisma`

**问题描述**:
Question 表缺少关键查询字段的索引，导致列表查询和筛选性能差。

**当前索引**:
```prisma
@@index([isGoodQuestion])
@@index([status, createdAt])
```

**缺失的索引**:
1. `subject` - 首页按科目筛选时使用
2. `tags` - 按考点筛选时使用（数组字段需要 GIN 索引）
3. `authorId` - 查询用户的问题时使用
4. `createdAt` - 单独的时间排序索引

**影响**:
- 首页按科目筛选：全表扫描
- 按考点筛选：全表扫描
- 按时间排序：可能使用不到复合索引

**建议修复**:
```prisma
model Question {
  // ... existing fields ...
  
  @@index([subject])           // 科目筛选
  @@index([tags])              // 考点筛选（PostgreSQL 会自动使用 GIN）
  @@index([authorId])          // 作者查询
  @@index([createdAt(sort: Desc)])  // 时间排序
  @@index([isGoodQuestion])    // 保留
  @@index([status, createdAt]) // 保留
}
```

**预期效果**: 列表查询性能提升 50-80%

---

### 问题 9：API 响应未压缩 ⚠️ 中优先级

**位置**: 所有 API 文件（questions.ts, answers.ts, comments.ts, subjects.ts）

**问题描述**:
Vercel Serverless Functions 默认不启用 gzip/brotli 压缩，导致 JSON 响应体积大。

**影响**:
- 首页列表响应：~50KB 未压缩 → ~10KB 压缩后（80% 减少）
- 问题详情响应：~20KB 未压缩 → ~5KB 压缩后（75% 减少）
- 网络传输时间增加 3-5 倍

**建议修复**:
在 `vercel.json` 中启用压缩：
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Content-Encoding",
          "value": "gzip"
        }
      ]
    }
  ]
}
```

或在每个 API handler 中添加：
```typescript
res.setHeader('Content-Encoding', 'gzip');
```

**预期效果**: 网络传输时间减少 60-75%

---

### 问题 10：前端服务层冗余请求 ⚠️ 低优先级

**位置**: `src/services/question.service.ts`

**问题描述**:
`question.service.ts` 中的 `getQuestions()` 方法构造了复杂的参数映射，但实际上前端页面（HomePage.tsx）直接调用 `/api/questions`，绕过了这个服务层。

**代码冗余**:
```typescript
// question.service.ts - 未被使用
export const questionService = {
  getQuestions: async (params: QuestionListParams = {}): Promise<PaginatedResponse<Question>> => {
    // 复杂的参数映射逻辑
    const backendParams: Record<string, string | number | boolean | undefined> = {};
    // ...
  }
}

// HomePage.tsx - 直接调用 API
const response = await fetch(`/api/questions?${params.toString()}`);
```

**影响**:
- 代码维护混乱
- 可能导致未来的重复开发

**建议修复**:
1. 统一使用 `question.service.ts` 作为唯一的 API 调用入口
2. 或者删除未使用的服务层代码

---

### 问题 11：HomePage 无防抖搜索 ⚠️ 低优先级

**位置**: `src/pages/HomePage.tsx` + `src/components/QuestionFilter.tsx`

**问题描述**:
搜索框每次输入都会立即触发 API 请求，没有防抖（debounce）机制。

**影响**:
- 用户输入 "数学题" 会触发 3 次请求：
  1. "数" → API 请求
  2. "数学" → API 请求
  3. "数学题" → API 请求
- 浪费服务器资源和数据库查询

**建议修复**:
在 QuestionFilter 组件中添加防抖：
```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (value: string) => {
    onFilterChange?.({ ...filters, search: value });
  },
  500 // 500ms 延迟
);
```

**预期效果**: 搜索请求减少 60-80%

---

### 问题 12：图片未使用 CDN 或懒加载 ⚠️ 低优先级

**位置**: `src/components/QuestionCard.tsx`, `src/components/ImageGallery.tsx`

**问题描述**:
1. 图片直接从图床加载，没有 CDN 加速
2. 首页列表中的图片没有懒加载（lazy loading）
3. 没有使用 WebP 格式或响应式图片

**影响**:
- 首页加载 10 个问题，每个 3 张图片 = 30 张图片同时加载
- LCP (Largest Contentful Paint) 时间增加 1-2 秒

**建议修复**:
1. 使用 `loading="lazy"` 属性
2. 使用 Intersection Observer 实现懒加载
3. 在上传时生成多种尺寸（缩略图、中图、原图）

```typescript
<img 
  src={image} 
  loading="lazy" 
  decoding="async"
  alt="问题图片"
/>
```

**预期效果**: 首页加载时间减少 30-50%

---

### 问题 13：无 HTTP 缓存策略 ⚠️ 低优先级

**位置**: 所有 API 文件

**问题描述**:
API 响应没有设置 `Cache-Control` 头，浏览器无法缓存静态数据（如科目列表）。

**影响**:
- 每次访问首页都重新请求科目列表
- 每次切换页面都重新请求相同数据

**建议修复**:
在 `api/subjects.ts` 中添加缓存头：
```typescript
// GET subjects - 可以缓存 5 分钟
if (req.method === 'GET' && !topics && !topicId) {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  // ...
}
```

**预期效果**: 重复访问时响应时间减少 90%

---

## 优先级排序

### 高优先级（立即修复）
1. **问题 8**: 数据库索引缺失 - 影响最大，修复最简单

### 中优先级（本周修复）
2. **问题 9**: API 响应未压缩 - 网络传输优化

### 低优先级（有时间再优化）
3. **问题 11**: 搜索无防抖
4. **问题 12**: 图片懒加载
5. **问题 13**: HTTP 缓存策略
6. **问题 10**: 服务层代码冗余（代码质量问题，非性能问题）

---

## 预期总体效果

完成所有优化后：
- **首页加载时间**: ~3s → ~0.5s（83% 提升）
- **问题详情页**: ~3s → ~0.8s（73% 提升）
- **搜索响应**: ~1s → ~0.3s（70% 提升）
- **网络传输**: 减少 70% 数据量
- **数据库查询**: 减少 60% 查询时间

---

## 下一步行动

建议按以下顺序执行：

1. **立即执行**: 添加数据库索引（问题 8）
   - 修改 `prisma/schema.prisma`
   - 运行 `npx prisma migrate dev --name add-performance-indexes`
   - 部署到生产环境

2. **本周执行**: 启用 API 压缩（问题 9）
   - 修改 `vercel.json` 或 API handlers
   - 测试压缩效果
   - 部署到生产环境

3. **有时间再做**: 其他低优先级优化（问题 10-13）

---

生成时间: 2026-04-09
审计人员: Kiro AI Assistant
