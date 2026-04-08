# TopicManager 组件

考点管理组件，用于管理员界面中管理选中科目下的考点。

## 功能特性

- ✅ 显示选中科目的考点列表
- ✅ 按 order 字段排序显示
- ✅ 显示考点的启用/禁用状态
- ✅ 提供创建考点入口（待实现表单）
- ✅ 提供编辑考点入口（待实现表单）
- ✅ 提供删除考点功能（带确认对话框）
- ✅ 删除保护：有关联问题的考点无法删除
- ✅ 统一错误处理

## 使用方式

### 基础用法

```tsx
import { TopicManager } from '@/components/TopicManager';

function AdminPage() {
  const [selectedSubjectKey, setSelectedSubjectKey] = useState('math');

  return (
    <div>
      <TopicManager subjectKey={selectedSubjectKey} />
    </div>
  );
}
```

### 与 SubjectManager 配合使用

```tsx
import { SubjectManager } from '@/components/SubjectManager';
import { TopicManager } from '@/components/TopicManager';

function AdminPage() {
  const [selectedSubjectKey, setSelectedSubjectKey] = useState('');

  return (
    <div className="grid grid-cols-2 gap-4">
      <SubjectManager onSubjectSelect={setSelectedSubjectKey} />
      <TopicManager subjectKey={selectedSubjectKey} />
    </div>
  );
}
```

## Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| subjectKey | string | 是 | - | 选中的科目 key |
| className | string | 否 | - | 自定义样式类名 |

## 组件状态

### 1. 未选择科目

当 `subjectKey` 为空时，显示提示信息：

```
请先选择一个科目
```

### 2. 加载中

正在获取考点列表时显示：

```
加载中...
```

### 3. 空状态

科目下没有考点时显示：

```
暂无考点，点击"添加考点"创建第一个考点
```

### 4. 考点列表

显示考点卡片，包含：
- 考点名称（label）
- 考点值（value）
- 启用/禁用徽章
- 排序序号
- 编辑按钮
- 删除按钮

## API 集成

### 获取考点列表

```
GET /api/subjects?key={subjectKey}&topics=1
Authorization: Bearer {token}

Response:
{
  code: 200,
  data: [
    {
      id: "1",
      subjectKey: "math",
      value: "algebra",
      label: "代数",
      order: 1,
      enabled: true
    }
  ]
}
```

### 删除考点

```
DELETE /api/subjects?topicId={topicId}
Authorization: Bearer {token}

Response:
{
  code: 200,
  data: { message: "删除成功" }
}

Error (有关联问题):
{
  code: 409,
  message: "无法删除：该考点下有 5 个关联问题"
}
```

## 错误处理

组件使用统一的 `handleApiError` 处理所有 API 错误：

- **401 未授权**: 清除 token，跳转到登录页
- **403 权限不足**: 显示权限不足提示
- **409 冲突**: 显示关联数据说明（如：该考点下有 X 个关联问题）
- **500 服务器错误**: 显示通用错误提示

## 待实现功能

以下功能的入口已预留，但表单实现待后续任务：

1. **创建考点**: 点击"添加考点"按钮（目前仅 console.log）
2. **编辑考点**: 点击编辑按钮（目前仅 console.log）

这些功能将在后续任务中通过 TopicForm 组件实现。

## 权限要求

- 查看考点列表：需要登录
- 创建/编辑/删除考点：需要 admin 角色

## 相关组件

- `SubjectManager`: 科目管理组件
- `SubjectTopicSelector`: 科目考点选择器（用户端）
- `TopicForm`: 考点表单（待实现）

## 测试

组件包含完整的单元测试，覆盖：

- 初始状态（未选择科目、加载中）
- 考点列表显示
- 考点详情显示
- 创建考点入口
- 编辑考点入口
- 删除考点流程
- API 集成
- 科目切换

运行测试：

```bash
npm test -- TopicManager.test.tsx
```

## 设计模式

TopicManager 遵循与 SubjectManager 相同的设计模式：

1. **卡片布局**: 使用 Card 组件包装
2. **操作按钮**: 统一的编辑/删除按钮样式
3. **确认对话框**: 使用 AlertDialog 确认删除操作
4. **状态徽章**: 使用 Badge 显示启用/禁用状态
5. **错误处理**: 统一使用 handleApiError
6. **加载状态**: 统一的加载和空状态提示

## 注意事项

1. **必须选择科目**: 组件依赖 `subjectKey` prop，未选择科目时显示提示
2. **删除保护**: 有关联问题的考点无法删除，会显示错误提示
3. **自动刷新**: 当 `subjectKey` 变化时，自动重新加载考点列表
4. **排序**: 考点按 `order` 字段升序排列
5. **权限控制**: 所有修改操作需要 admin 权限，由后端验证
