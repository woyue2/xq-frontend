# 统一错误处理系统

本文档描述应用简化重构中实现的统一错误处理系统。

## 概述

统一错误处理系统提供了一致的方式来处理 API 错误，包括：

- **401 错误**：清除 token，重定向到登录页
- **403 错误**：显示权限不足提示
- **400 错误**：在表单字段旁显示错误信息
- **409 错误**：显示关联数据说明对话框
- **500 错误**：显示通用错误提示

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      React 组件层                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useErrorHandler Hook                                │   │
│  │  - 状态管理                                           │   │
│  │  - 字段错误                                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    错误处理核心层                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  handleApiError                                      │   │
│  │  - 错误分类                                           │   │
│  │  - 统一处理                                           │   │
│  │  - 回调触发                                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      HTTP 拦截器层                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  axios response interceptor                          │   │
│  │  - 自动调用 handleApiError                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 核心文件

### 1. `src/lib/error-handler.ts`

核心错误处理工具，提供：

- `handleApiError(error, options)` - 统一错误处理函数
- `showConflictDialog(details)` - 显示 409 冲突对话框
- `extractFieldErrors(error)` - 提取字段级错误信息

### 2. `src/hooks/useErrorHandler.ts`

React Hook，提供：

- 错误状态管理
- 字段错误管理
- 便捷的错误处理方法

### 3. `src/components/ui/error-message.tsx`

表单字段错误消息显示组件。

### 4. `src/services/http.ts`

HTTP 拦截器，自动调用 `handleApiError`。

## 使用方法

### 方法 1: 使用 useErrorHandler Hook（推荐）

适用于需要在组件中管理错误状态的场景。

```tsx
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ErrorMessage } from '@/components/ui/error-message';
import { api } from '@/services/http';

function CreateQuestionForm() {
  const [title, setTitle] = useState('');
  const { fieldErrors, handleError, clearFieldError } = useErrorHandler();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await api.post('/api/questions', { title });
      // 成功处理...
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <Label htmlFor="title">标题</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            clearFieldError('title'); // 清除该字段的错误
          }}
          className={fieldErrors.title ? 'border-destructive' : ''}
        />
        {fieldErrors.title && (
          <ErrorMessage>{fieldErrors.title}</ErrorMessage>
        )}
      </div>
      <Button type="submit">提交</Button>
    </form>
  );
}
```

### 方法 2: 直接使用 handleApiError

适用于不需要在组件中管理错误状态的场景。

```tsx
import { handleApiError } from '@/lib/error-handler';
import { api } from '@/services/http';

async function deleteSubject(id: string) {
  try {
    await api.delete(`/api/subjects?id=${id}`);
    toast.success('删除成功');
  } catch (error) {
    // handleApiError 会自动显示适当的错误提示
    handleApiError(error, {
      onConflict: (details) => {
        // 可选：执行额外的操作
        console.log('冲突详情:', details);
      },
    });
  }
}
```

### 方法 3: 依赖 HTTP 拦截器（最简单）

HTTP 拦截器会自动处理所有错误，无需手动调用。

```tsx
import { api } from '@/services/http';

async function fetchQuestions() {
  try {
    const response = await api.get('/api/questions');
    return response.data;
  } catch (error) {
    // 错误已被拦截器自动处理
    // 这里只需要处理业务逻辑
    return [];
  }
}
```

## 错误类型处理

### 401 - 未登录

**自动行为：**
- 清除本地 token
- 显示"登录已过期，请重新登录"提示
- 1 秒后重定向到 `/login`

**自定义处理：**

```tsx
const { handleError } = useErrorHandler({
  onUnauthorized: () => {
    // 执行额外的清理操作
    console.log('用户未登录');
  },
});
```

### 403 - 权限不足

**自动行为：**
- 显示"权限不足，无法执行此操作"提示

**自定义处理：**

```tsx
const { handleError } = useErrorHandler({
  onForbidden: () => {
    // 显示自定义对话框
    setShowPermissionDialog(true);
  },
});
```

### 400 - 请求参数错误

**自动行为：**
- 如果有字段级错误（`details`），保存到状态
- 否则显示通用错误提示

**使用字段错误：**

```tsx
const { fieldErrors, handleError } = useErrorHandler();

// API 返回格式：
// {
//   code: 400,
//   message: "请求参数错误",
//   details: {
//     title: "标题不能为空",
//     content: "内容不能超过500字"
//   }
// }

// 在表单中显示
{fieldErrors.title && <ErrorMessage>{fieldErrors.title}</ErrorMessage>}
{fieldErrors.content && <ErrorMessage>{fieldErrors.content}</ErrorMessage>}
```

### 409 - 操作冲突

**自动行为：**
- 解析冲突详情（科目/考点删除保护）
- 显示详细的冲突说明对话框

**冲突消息格式：**

API 应返回以下格式的消息：

```
"无法删除科目「数学」，存在 15 个关联问题"
"无法删除科目「数学」，存在 3 个关联考点"
"无法删除考点「代数」，存在 8 个关联问题"
```

**自定义处理：**

```tsx
const { handleError } = useErrorHandler({
  onConflict: (details) => {
    if (details) {
      console.log('冲突类型:', details.type); // 'subject' | 'topic'
      console.log('名称:', details.name);
      console.log('关联数量:', details.relatedCount);
      console.log('关联类型:', details.relatedType); // 'questions' | 'topics'
    }
  },
});
```

### 500 - 服务器错误

**自动行为：**
- 显示"服务器繁忙，请稍后再试"提示

**自定义处理：**

```tsx
const { handleError } = useErrorHandler({
  onServerError: () => {
    // 记录错误日志
    console.error('服务器错误');
  },
});
```

## API 错误响应格式

所有 API 错误应遵循以下格式：

```typescript
{
  code: number;        // HTTP 状态码
  message: string;     // 人类可读的错误信息（中文）
  timestamp?: number;  // Unix 时间戳
  details?: {          // 字段级错误（仅 400 错误）
    [fieldName: string]: string;
  };
}
```

### 示例

**400 错误（字段验证）：**

```json
{
  "code": 400,
  "message": "请求参数错误",
  "timestamp": 1704067200000,
  "details": {
    "title": "标题不能为空",
    "content": "内容不能超过500字",
    "images": "最多只能上传3张图片"
  }
}
```

**409 错误（删除冲突）：**

```json
{
  "code": 409,
  "message": "无法删除科目「数学」，存在 15 个关联问题",
  "timestamp": 1704067200000
}
```

## 最佳实践

### 1. 表单验证错误

使用 `useErrorHandler` 管理字段错误：

```tsx
const { fieldErrors, handleError, clearFieldError } = useErrorHandler();

// 用户输入时清除错误
<Input
  onChange={(e) => {
    setValue(e.target.value);
    clearFieldError('fieldName');
  }}
/>

// 显示错误
{fieldErrors.fieldName && (
  <ErrorMessage>{fieldErrors.fieldName}</ErrorMessage>
)}
```

### 2. 删除操作

处理可能的冲突错误：

```tsx
const handleDelete = async (id: string) => {
  if (!confirm('确定要删除吗？')) return;
  
  try {
    await api.delete(`/api/subjects?id=${id}`);
    toast.success('删除成功');
    refetch(); // 刷新列表
  } catch (error) {
    // handleApiError 会自动显示冲突对话框
    handleApiError(error);
  }
};
```

### 3. 权限检查

在执行需要权限的操作前检查：

```tsx
const { user } = useAuthStore();

const handleAdminAction = async () => {
  if (user?.role !== 'admin') {
    toast.error('权限不足');
    return;
  }
  
  try {
    await api.post('/api/subjects', data);
  } catch (error) {
    handleApiError(error);
  }
};
```

### 4. 登录检查

在需要登录的操作前检查：

```tsx
const { isAuthenticated } = useAuthStore();

const handleCreateQuestion = () => {
  if (!isAuthenticated) {
    toast.error('请先登录');
    navigate('/login');
    return;
  }
  
  // 继续操作...
};
```

## 测试

错误处理系统包含完整的单元测试：

```bash
npm test -- src/test/error-handler.test.ts
```

测试覆盖：
- ✅ 401 错误处理（清除 token + 重定向）
- ✅ 403 错误处理（权限不足提示）
- ✅ 400 错误处理（字段错误 + 通用错误）
- ✅ 409 错误处理（冲突对话框）
- ✅ 500 错误处理（服务器错误提示）
- ✅ 网络错误处理
- ✅ 冲突消息解析（科目/考点删除保护）

## 相关需求

本实现满足以下需求：

- **需求 10.8**: 删除科目时检查关联问题
- **需求 10.9**: 删除科目时检查关联考点
- **需求 10.10**: 存在关联数据时阻止删除并提示
- **需求 10.19**: 删除考点时检查关联问题
- **需求 10.20**: 存在关联问题时阻止删除
- **需求 10.21**: 无关联数据时允许删除

## 示例代码

完整的使用示例请参考：

- `src/lib/error-handler.example.tsx` - 各种场景的使用示例
- `src/test/error-handler.test.ts` - 单元测试示例
