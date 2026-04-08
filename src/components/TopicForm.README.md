# TopicForm 组件

考点创建和编辑表单组件，用于管理员界面的考点管理功能。

## 功能特性

- ✅ 支持创建和编辑两种模式
- ✅ 表单字段验证（value 格式、必填字段）
- ✅ 调用 subjects API 的 topics 端点进行 CRUD 操作
- ✅ 使用统一错误处理器处理 API 错误
- ✅ 响应式设计，适配移动端和桌面端

## 使用方法

### 基本用法

```tsx
import { TopicForm } from '@/components/TopicForm';

function MyComponent() {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (data) => {
    // 处理表单提交
    console.log('Form data:', data);
  };

  return (
    <TopicForm
      open={open}
      onOpenChange={setOpen}
      subjectKey="math"
      onSubmit={handleSubmit}
    />
  );
}
```

### 创建模式

```tsx
<TopicForm
  open={createOpen}
  onOpenChange={setCreateOpen}
  subjectKey="math"
  onSubmit={async (data) => {
    const response = await fetch('/api/subjects?topics=1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    // 处理响应
  }}
/>
```

### 编辑模式

```tsx
<TopicForm
  open={editOpen}
  onOpenChange={setEditOpen}
  subjectKey="math"
  initialData={existingTopic}
  onSubmit={async (data) => {
    const response = await fetch(`/api/subjects?topicId=${topicId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        label: data.label,
        order: data.order,
        enabled: data.enabled,
      }),
    });
    // 处理响应
  }}
/>
```

## Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `open` | `boolean` | ✅ | 控制对话框的打开/关闭状态 |
| `onOpenChange` | `(open: boolean) => void` | ✅ | 对话框状态变化时的回调 |
| `subjectKey` | `string` | ✅ | 所属科目的 key |
| `initialData` | `Partial<TopicDTO>` | ❌ | 初始数据（编辑模式） |
| `onSubmit` | `(data: TopicFormData) => Promise<void>` | ✅ | 表单提交回调 |
| `onCancel` | `() => void` | ❌ | 取消按钮点击回调 |

## 表单字段

### value (必填)
- 考点的唯一标识符
- 只能包含字母、数字、下划线和短横线
- 编辑模式下不可修改
- 示例：`algebra`, `geometry`, `calculus`

### label (必填)
- 考点的显示名称
- 用于界面展示
- 示例：`代数`, `几何`, `微积分`

### order (必填)
- 排序值，数字类型
- 数字越小越靠前
- 示例：`1`, `2`, `3`

### enabled
- 启用状态，布尔类型
- 默认值：`true`
- 控制考点是否在前端显示

## 表单验证

组件内置以下验证规则：

1. **value 验证**
   - 必填项
   - 只能包含字母、数字、下划线和短横线
   - 错误提示：`value 为必填项` 或 `value 只能包含字母、数字、下划线和短横线`

2. **label 验证**
   - 必填项
   - 错误提示：`label 为必填项`

3. **order 验证**
   - 必填项
   - 必须为数字
   - 错误提示：`order 必须为数字`

## 错误处理

组件使用统一的错误处理器 `handleApiError`：

- **401 未授权**：清除 token，跳转到登录页
- **403 权限不足**：显示权限不足提示
- **400 请求错误**：在表单字段旁显示错误信息
- **409 冲突**：显示关联数据说明对话框
- **500 服务器错误**：显示通用错误提示

## API 集成

### 创建考点

```
POST /api/subjects?topics=1
Authorization: Bearer {token}
Content-Type: application/json

{
  "subjectKey": "math",
  "value": "algebra",
  "label": "代数",
  "order": 1,
  "enabled": true
}
```

### 更新考点

```
PUT /api/subjects?topicId={id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "label": "高等代数",
  "order": 2,
  "enabled": false
}
```

注意：更新时不能修改 `subjectKey` 和 `value`。

## 与 TopicManager 集成

TopicForm 通常与 TopicManager 组件配合使用：

```tsx
function TopicManager({ subjectKey }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);

  const handleCreate = () => {
    setEditingTopic(null);
    setFormOpen(true);
  };

  const handleEdit = (topic) => {
    setEditingTopic(topic);
    setFormOpen(true);
  };

  return (
    <>
      <Button onClick={handleCreate}>添加考点</Button>
      
      <TopicForm
        open={formOpen}
        onOpenChange={setFormOpen}
        subjectKey={subjectKey}
        initialData={editingTopic}
        onSubmit={handleFormSubmit}
      />
    </>
  );
}
```

## 样式定制

组件使用 shadcn/ui 组件库，支持通过 Tailwind CSS 进行样式定制：

- Dialog 组件：对话框容器
- Input 组件：文本输入框
- Switch 组件：启用状态开关
- Button 组件：提交和取消按钮

## 相关组件

- `SubjectForm` - 科目表单组件（类似模式）
- `TopicManager` - 考点管理组件（使用此表单）
- `SubjectTopicSelector` - 科目考点选择器（使用考点数据）

## 注意事项

1. **权限控制**：考点的创建和编辑需要管理员权限
2. **value 唯一性**：同一科目下的 value 必须唯一
3. **编辑限制**：编辑模式下 value 字段不可修改
4. **删除保护**：有关联问题的考点无法删除
5. **表单重置**：对话框关闭时会自动重置表单状态

## 测试

组件包含完整的单元测试，覆盖以下场景：

- ✅ 创建模式渲染
- ✅ 编辑模式渲染
- ✅ 表单字段输入
- ✅ 表单验证
- ✅ 提交处理
- ✅ 取消操作
- ✅ 启用状态切换
- ✅ 提交状态显示

运行测试：

```bash
npm test -- src/test/TopicForm.test.tsx
```
