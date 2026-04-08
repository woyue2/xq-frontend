# SubjectManager 组件

科目管理组件，用于管理员管理科目列表。

## 功能特性

- 显示所有科目列表（包括启用和禁用的科目）
- 支持创建新科目
- 支持编辑科目信息
- 支持删除科目（带删除保护）
- 支持选中科目查看考点
- 显示科目的启用状态和排序顺序
- 处理 409 冲突错误（科目有关联数据时）

## Props

```typescript
interface SubjectManagerProps {
  onSubjectSelect?: (subjectKey: string) => void;  // 选中科目时的回调
  className?: string;                               // 自定义样式类名
}
```

## 使用示例

### 基本用法

```tsx
import { SubjectManager } from '@/components/SubjectManager';

function AdminSubjectsPage() {
  const handleSubjectSelect = (subjectKey: string) => {
    console.log('Selected subject:', subjectKey);
    // 可以在这里加载该科目的考点列表
  };

  return (
    <div className="container mx-auto p-6">
      <SubjectManager onSubjectSelect={handleSubjectSelect} />
    </div>
  );
}
```

### 与 TopicManager 配合使用

```tsx
import { useState } from 'react';
import { SubjectManager } from '@/components/SubjectManager';
import { TopicManager } from '@/components/TopicManager';

function AdminSubjectsPage() {
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SubjectManager onSubjectSelect={setSelectedSubject} />
        {selectedSubject && <TopicManager subjectKey={selectedSubject} />}
      </div>
    </div>
  );
}
```

## API 端点

组件使用以下 API 端点：

- `GET /api/subjects` - 获取所有科目列表
- `DELETE /api/subjects?id=:id` - 删除科目

## 错误处理

- 使用 `handleApiError` 统一处理 API 错误
- 409 错误：显示关联数据说明对话框（科目有关联问题或考点时）
- 401 错误：自动清除 token 并重定向到登录页
- 403 错误：显示权限不足提示

## 删除保护

删除科目时，系统会检查：
1. 该科目下是否有关联的问题
2. 该科目下是否有关联的考点

如果存在关联数据，系统会返回 409 错误并显示详细的错误信息。

## 注意事项

1. 需要管理员权限才能访问此组件
2. 删除操作不可撤销，请谨慎操作
3. 科目的 key 字段是唯一标识，不可修改
4. 创建和编辑功能需要配合 SubjectForm 组件使用（待实现）
5. **API 限制**：当前 GET /api/subjects 端点只返回启用的科目（enabled=true）。理想情况下，管理员视图应该显示所有科目（包括禁用的）。这需要在 API 层面添加 admin=1 查询参数支持。

## 依赖组件

- `Button` - 操作按钮
- `Card` - 卡片容器
- `Badge` - 状态标签
- `AlertDialog` - 删除确认对话框

## 相关组件

- `TopicManager` - 考点管理组件
- `SubjectForm` - 科目表单组件（待实现）
- `SubjectTopicSelector` - 科目考点选择器
