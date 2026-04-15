# Loading 状态审计报告

## 当前状态总结

### ✅ 有 Loading 提示的页面

1. **HomePage (首页)**
   - 文件: `src/pages/HomePage.tsx`
   - Loading 状态:
     - ✅ 初始加载: 显示 3 个骨架屏 (skeleton)
     - ✅ 加载更多: 底部显示旋转图标
     - ✅ 空状态: 显示"暂无相关提问"
   - 实现方式: `isLoading && !data` 判断

2. **QuestionDetailPage (问题详情页)**
   - 文件: `src/pages/QuestionDetailPage.tsx`
   - Loading 状态:
     - ✅ 问题加载: 显示骨架屏
     - ✅ 回答/评论加载: 显示旋转图标
   - 实现方式: `isLoadingQuestion` 和 `isLoading` 判断

3. **AnswerQuestionPage (回答问题页)**
   - 文件: `src/pages/AnswerQuestionPage.tsx`
   - Loading 状态:
     - ✅ 问题加载: 显示居中的旋转图标
   - 实现方式: `loading` 判断

4. **CommentQuestionPage (评论问题页)**
   - 文件: `src/pages/CommentQuestionPage.tsx`
   - Loading 状态:
     - ✅ 问题加载: 显示居中的旋转图标
   - 实现方式: `loading` 判断

### ✅ 已修复的地方

1. **MainLayout (主布局)** - ✅ 已完成
   - 文件: `src/layouts/MainLayout.tsx`
   - 实现:
     - ✅ 页面切换时显示顶部蓝色进度条
     - ✅ 使用 `useLocation` + `useEffect` 监听路由变化
     - ✅ 最小显示时间 300ms，避免闪烁
     - ✅ 渐变动画效果 (shimmer)
   - 部署状态: 已部署到生产环境 (2026-04-15)

### ❌ 可选的改进项 (低优先级)

2. **SubjectManager (科目管理)**
   - 文件: `src/components/SubjectManager.tsx`
   - 当前状态:
     - ✅ 有 loading 状态: "加载中..."
   - 但可以改进为骨架屏

3. **TopicManager (考点管理)**
   - 文件: `src/components/TopicManager.tsx`
   - 当前状态:
     - ✅ 有 loading 状态: "加载中..."
   - 但可以改进为骨架屏

4. **QuestionFilter (筛选组件)**
   - 文件: `src/components/QuestionFilter.tsx`
   - 问题:
     - ❌ 科目和考点下拉加载时没有 loading 提示
   - 影响: 用户点击下拉框时可能看到空白

## 建议改进方案

### 优先级 1: 添加全局页面切换 Loading

在 `MainLayout.tsx` 中添加路由切换 loading 指示器：

```tsx
import { useNavigation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export function MainLayout() {
  const navigation = useNavigation();
  const isNavigating = navigation.state === 'loading';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 全局 Loading 指示器 */}
      {isNavigating && (
        <div className="fixed top-14 left-0 right-0 h-1 bg-blue-100 z-50">
          <div className="h-full bg-blue-600 animate-pulse" style={{ width: '60%' }} />
        </div>
      )}
      
      {/* 或者使用全屏遮罩 */}
      {isNavigating && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}
      
      {/* ... 其他内容 */}
    </div>
  );
}
```

### 优先级 2: 改进首页初始加载体验

当前首页已有骨架屏，但可以添加更平滑的过渡：

```tsx
// HomePage.tsx
{isLoading && !data ? (
  <div className="space-y-4">
    {/* 添加淡入动画 */}
    {Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className="bg-white rounded-lg p-4 space-y-3 animate-pulse"
        style={{ animationDelay: `${i * 100}ms` }}
      >
        <div className="h-40 bg-gray-200 rounded-lg w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    ))}
  </div>
) : (
  // ...
)}
```

### 优先级 3: QuestionFilter 下拉加载状态

在 `SubjectTopicSelector.tsx` 中添加 loading 状态：

```tsx
// 科目下拉
<Select value={subject} onValueChange={onSubjectChange}>
  <SelectTrigger>
    <SelectValue placeholder={isLoadingSubjects ? "加载中..." : "选择科目"} />
  </SelectTrigger>
  <SelectContent>
    {isLoadingSubjects ? (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    ) : (
      // ... 科目列表
    )}
  </SelectContent>
</Select>
```

## 实现优先级

1. **立即实现** (影响用户体验):
   - 全局页面切换 loading (MainLayout)
   
2. **短期实现** (1-2 天):
   - QuestionFilter 下拉 loading
   - 改进骨架屏动画
   
3. **长期优化** (可选):
   - 添加 Suspense 边界
   - 实现渐进式加载
   - 添加加载进度条

## 技术方案

### 方案 A: React Router useNavigation (推荐)

```tsx
import { useNavigation } from 'react-router-dom';

const navigation = useNavigation();
const isLoading = navigation.state === 'loading';
```

优点:
- 原生支持
- 自动检测路由切换
- 性能好

### 方案 B: 自定义 Loading Context

```tsx
// LoadingContext.tsx
const LoadingContext = createContext({ isLoading: false });

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}
```

优点:
- 更灵活
- 可以手动控制

缺点:
- 需要手动管理状态
- 容易遗漏

## 测试清单

实现后需要测试的场景:

- [ ] 首次进入应用
- [ ] 从首页切换到详情页
- [ ] 从详情页返回首页
- [ ] 筛选条件变化时
- [ ] 网络慢速时 (Chrome DevTools → Network → Slow 3G)
- [ ] 移动端体验

---

生成时间: 2026-04-13
更新时间: 2026-04-15
状态: ✅ 全局页面切换 loading 已完成并部署
