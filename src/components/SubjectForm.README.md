# SubjectForm 组件

科目创建和编辑表单组件，用于管理员创建和编辑科目信息。

## 功能特性

- 支持创建和编辑两种模式
- 表单字段：key, name, description, order, enabled
- 客户端表单验证
- 统一错误处理
- 编辑模式下 key 字段不可修改

## 使用示例

```tsx
import { SubjectForm } from '@/components/SubjectForm';
import type { SubjectFormData } from '@/components/SubjectForm';

function MyComponent() {
  const [open, setOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectDTO | null>(null);

  const handleSubmit = async (data: SubjectFormData) => {
    const token = localStorage.getItem('token');
    
    if (editingSubject) {
      // Update existing subject
      const response = await fetch(`/api/subjects?id=${editingSubject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      
      if (result.code === 200) {
        // Handle success
      }
    } else {
      // Create new subject
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      
      if (result.code === 201) {
        // Handle success
      }
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>创建科目</Button>
      
      <SubjectForm
        open={open}
        onOpenChange={setOpen}
        initialData={editingSubject || undefined}
        onSubmit={handleSubmit}
        onCancel={() => setEditingSubject(null)}
      />
    </>
  );
}
```

## Props

### SubjectFormProps

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `open` | `boolean` | 是 | 对话框打开状态 |
| `onOpenChange` | `(open: boolean) => void` | 是 | 对话框状态变化回调 |
| `initialData` | `Partial<SubjectDTO>` | 否 | 初始数据（编辑模式） |
| `onSubmit` | `(data: SubjectFormData) => Promise<void>` | 是 | 表单提交回调 |
| `onCancel` | `() => void` | 否 | 取消回调 |

### SubjectFormData

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `key` | `string` | 是 | 科目唯一标识（只能包含字母、数字、下划线和短横线） |
| `name` | `string` | 是 | 科目名称 |
| `description` | `string` | 否 | 科目描述 |
| `order` | `number` | 是 | 排序值（数字越小越靠前） |
| `enabled` | `boolean` | 是 | 启用状态 |

## 表单验证规则

- **key**: 必填，只能包含字母、数字、下划线和短横线，编辑模式下不可修改
- **name**: 必填
- **order**: 必填，必须为数字
- **description**: 可选
- **enabled**: 默认为 true

## 错误处理

组件使用统一的 `handleApiError` 处理 API 错误：

- **400 错误**: 显示字段级错误信息
- **401 错误**: 清除 token 并跳转到登录页
- **403 错误**: 显示权限不足提示
- **409 错误**: 显示冲突错误（如 key 已存在）
- **500 错误**: 显示服务器错误提示

## 注意事项

1. 编辑模式下，key 字段不可修改（由 API 限制）
2. 表单提交时会先进行客户端验证
3. API 错误会通过 toast 提示用户
4. 提交成功后会自动关闭对话框
