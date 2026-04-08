# 前端缓存方案对比

## 问题分析

**现状**: 从问题详情页返回首页时，页面会重新加载所有数据

**原因**: 
1. React Router 默认行为：路由切换时组件会卸载和重新挂载
2. HomePage 组件每次挂载都会触发 `useEffect` 重新请求数据
3. 没有任何前端缓存机制

**影响**:
- 用户体验差（每次返回都要等待加载）
- 浪费网络请求（重复请求相同数据）
- 浪费服务器资源（Vercel Serverless Functions 按请求计费）

---

## 方案对比

### 方案 1: React Query / TanStack Query（推荐 ⭐⭐⭐⭐⭐）

**原理**: 专业的数据获取和缓存库，自动管理缓存、重新验证、后台更新

**优点**:
- ✅ 自动缓存管理（默认 5 分钟缓存）
- ✅ 自动后台重新验证（stale-while-revalidate）
- ✅ 自动去重请求（多个组件请求相同数据只发一次）
- ✅ 乐观更新支持
- ✅ 离线支持
- ✅ 分页和无限滚动内置支持
- ✅ DevTools 调试工具
- ✅ TypeScript 完美支持
- ✅ 行业标准，维护活跃

**缺点**:
- ❌ 需要安装新依赖（~40KB gzipped）
- ❌ 需要重构现有代码（中等工作量）
- ❌ 学习曲线（但文档很好）

**适用场景**: 
- 中大型应用
- 需要复杂缓存策略
- 长期维护的项目

**实现复杂度**: ⭐⭐⭐ (中等)

**代码示例**:
```typescript
// 1. 安装
npm install @tanstack/react-query

// 2. 配置 Provider
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>

// 3. 使用
const { data, isLoading } = useQuery({
  queryKey: ['questions', filters],
  queryFn: () => fetchQuestions(filters),
  staleTime: 5 * 60 * 1000, // 5 分钟内不重新请求
  cacheTime: 10 * 60 * 1000, // 缓存保留 10 分钟
});
```

**预期效果**:
- 返回首页：0ms（从缓存读取）
- 5 分钟后返回：后台静默更新，立即显示缓存数据

---

### 方案 2: SWR（推荐 ⭐⭐⭐⭐）

**原理**: Vercel 官方推荐的数据获取库，stale-while-revalidate 策略

**优点**:
- ✅ Vercel 官方推荐（与 Vercel 生态完美集成）
- ✅ 轻量级（~5KB gzipped）
- ✅ 自动缓存和重新验证
- ✅ 自动去重请求
- ✅ 实时更新支持
- ✅ 简单易用，学习曲线平缓
- ✅ TypeScript 支持

**缺点**:
- ❌ 功能比 React Query 少一些
- ❌ 需要安装新依赖
- ❌ 需要重构现有代码（中等工作量）

**适用场景**:
- Vercel + Supabase 项目（完美匹配）
- 中小型应用
- 需要简单缓存的场景

**实现复杂度**: ⭐⭐ (简单)

**代码示例**:
```typescript
// 1. 安装
npm install swr

// 2. 使用
const { data, error, isLoading } = useSWR(
  `/api/questions?${params}`,
  fetcher,
  {
    revalidateOnFocus: false, // 窗口聚焦时不重新验证
    dedupingInterval: 5000, // 5 秒内去重
  }
);
```

**预期效果**:
- 返回首页：0ms（从缓存读取）
- 自动后台更新，用户无感知

---

### 方案 3: 简单内存缓存（推荐 ⭐⭐⭐）

**原理**: 使用模块级变量或 localStorage 手动缓存数据

**优点**:
- ✅ 无需安装依赖
- ✅ 实现简单，代码量少
- ✅ 完全可控
- ✅ 零学习成本

**缺点**:
- ❌ 需要手动管理缓存失效
- ❌ 需要手动处理并发请求
- ❌ 没有自动重新验证
- ❌ 缓存策略简单

**适用场景**:
- 小型应用
- 简单缓存需求
- 不想引入新依赖

**实现复杂度**: ⭐ (非常简单)

**代码示例**:
```typescript
// 模块级缓存
const questionsCache = new Map<string, {
  data: QuestionDTO[];
  timestamp: number;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 分钟

function getCachedQuestions(key: string) {
  const cached = questionsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}
```

**预期效果**:
- 返回首页：0ms（从缓存读取）
- 5 分钟后自动失效，重新请求

---

### 方案 4: React Router Loader + Cache（推荐 ⭐⭐⭐⭐）

**原理**: 使用 React Router v6.4+ 的 loader 功能 + 自定义缓存

**优点**:
- ✅ 利用 React Router 内置功能
- ✅ 数据在路由级别管理
- ✅ 支持预加载（hover 时预加载）
- ✅ 无需额外依赖（如果已用 React Router v6.4+）
- ✅ 与路由深度集成

**缺点**:
- ❌ 需要升级到 React Router v6.4+（如果版本低）
- ❌ 需要重构路由配置
- ❌ 缓存需要手动实现

**适用场景**:
- 已使用 React Router v6.4+
- 希望数据与路由紧密结合
- 需要预加载功能

**实现复杂度**: ⭐⭐⭐ (中等)

**代码示例**:
```typescript
// 路由配置
{
  path: '/',
  element: <HomePage />,
  loader: homePageLoader, // 数据在这里加载
}

// Loader 函数
async function homePageLoader({ request }) {
  const url = new URL(request.url);
  const cacheKey = url.search;
  
  // 检查缓存
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  // 请求数据
  const data = await fetchQuestions();
  setCache(cacheKey, data);
  return data;
}
```

**预期效果**:
- 返回首页：0ms（从缓存读取）
- 支持链接预加载

---

### 方案 5: Zustand + 持久化（推荐 ⭐⭐⭐）

**原理**: 使用 Zustand 状态管理 + localStorage 持久化

**优点**:
- ✅ 轻量级（~1KB）
- ✅ 简单易用
- ✅ 支持持久化（刷新页面也保留）
- ✅ 全局状态管理
- ✅ TypeScript 完美支持

**缺点**:
- ❌ 需要安装依赖
- ❌ 需要手动管理缓存失效
- ❌ 不是专门的数据获取库

**适用场景**:
- 需要全局状态管理
- 需要跨页面共享数据
- 需要持久化到 localStorage

**实现复杂度**: ⭐⭐ (简单)

**代码示例**:
```typescript
// 创建 store
const useQuestionsStore = create(
  persist(
    (set) => ({
      questions: [],
      timestamp: 0,
      setQuestions: (data) => set({ 
        questions: data, 
        timestamp: Date.now() 
      }),
    }),
    { name: 'questions-cache' }
  )
);
```

**预期效果**:
- 返回首页：0ms（从 store 读取）
- 刷新页面也保留数据

---

## 推荐方案

### 🏆 最佳方案：SWR（方案 2）

**理由**:
1. ✅ **Vercel 官方推荐**，与你的技术栈完美匹配
2. ✅ **轻量级**（5KB），不会显著增加包体积
3. ✅ **简单易用**，重构工作量适中
4. ✅ **自动缓存和重新验证**，用户体验最佳
5. ✅ **行业验证**，被大量 Vercel 项目使用

**实施步骤**:
1. 安装 SWR：`npm install swr`
2. 创建 fetcher 函数
3. 重构 HomePage 使用 `useSWR`
4. 配置缓存策略
5. 测试验证

**预计工作量**: 1-2 小时

---

### 🥈 备选方案：简单内存缓存（方案 3）

**理由**:
1. ✅ **零依赖**，不增加包体积
2. ✅ **实现简单**，30 分钟完成
3. ✅ **完全可控**，适合小型项目
4. ⚠️ 功能有限，但满足基本需求

**实施步骤**:
1. 创建缓存工具函数
2. 修改 HomePage 的 fetchQuestions
3. 添加缓存读取逻辑
4. 测试验证

**预计工作量**: 30 分钟

---

## 性能对比

| 方案 | 返回首页速度 | 数据新鲜度 | 实现复杂度 | 包体积增加 |
|------|------------|----------|----------|----------|
| React Query | 0ms | 自动更新 | 中等 | +40KB |
| SWR | 0ms | 自动更新 | 简单 | +5KB |
| 简单缓存 | 0ms | 手动控制 | 非常简单 | 0KB |
| Router Loader | 0ms | 手动控制 | 中等 | 0KB |
| Zustand | 0ms | 手动控制 | 简单 | +1KB |

---

## 我的建议

**如果你想要最佳实践**: 选择 **SWR**（方案 2）
- Vercel 官方推荐
- 轻量且功能完善
- 长期维护有保障

**如果你想要快速实现**: 选择 **简单内存缓存**（方案 3）
- 30 分钟完成
- 零依赖
- 满足基本需求

**如果你想要最强大功能**: 选择 **React Query**（方案 1）
- 功能最全
- 社区最大
- 适合复杂场景

---

## 下一步

请告诉我你的选择，我会帮你实现：

1. **SWR** - 推荐，平衡性能和易用性
2. **简单缓存** - 快速实现，零依赖
3. **React Query** - 功能最强，适合长期项目
4. **其他方案** - 如果你有特殊需求

---

生成时间: 2026-04-09
