# AdminSubjectsPage

## 概述

`AdminSubjectsPage` 是科目和考点管理页面，提供管理员界面用于管理教学内容的分类体系。

## 路由

- **路径**: `/admin/subjects`
- **权限**: 需要管理员角色（admin）
- **布局**: 独立页面布局（不使用 AdminLayout）

## 功能特性

### 主从布局

页面采用左右分栏的主从布局：

- **左侧**: `SubjectManager` - 科目管理
  - 显示所有科目列表
  - 支持创建、编辑、删除科目
  - 点击科目可选中，触发右侧考点列表更新

- **右侧**: `TopicManager` - 考点管理
  - 显示选中科目的考点列表
  - 支持创建、编辑、删除考点
  - 未选中科目时显示提示信息

### 科目管理功能

1. **查看科目列表**
   - 显示科目名称、描述、排序顺序
   - 显示启用/禁用状态
   - 按排序顺序显示

2. **创建科目**
   - 点击"添加科目"按钮
   - 填写科目信息（名称、key、描述、排序）
   - 设置启用状态

3. **编辑科目**
   - 点击科目的"编辑"按钮
   - 修改科目信息
   - 保存更新

4. **删除科目**
   - 点击科目的"删除"按钮
   - 确认删除操作
   - 检查关联数据（如有关联问题或考点则阻止删除）

### 考点管理功能

1. **查看考点列表**
   - 显示选中科目下的所有考点
   - 显示考点名称、排序顺序
   - 显示启用/禁用状态

2. **创建考点**
   - 选中科目后点击"添加考点"按钮
   - 填写考点信息（名称、value、排序）
   - 自动关联到当前选中的科目

3. **编辑考点**
   - 点击考点的"编辑"按钮
   - 修改考点信息
   - 保存更新

4. **删除考点**
   - 点击考点的"删除"按钮
   - 确认删除操作
   - 检查关联数据（如有关联问题则阻止删除）

## 组件依赖

### 直接依赖

- `SubjectManager` - 科目管理组件
- `TopicManager` - 考点管理组件
- `Button` - UI 按钮组件
- `ChevronLeft`, `Shield` - Lucide 图标

### 间接依赖

通过 `SubjectManager` 和 `TopicManager`:
- `SubjectForm` - 科目表单组件
- `TopicForm` - 考点表单组件
- `Card`, `Badge`, `AlertDialog` 等 UI 组件

## 状态管理

页面维护一个简单的状态：

```typescript
const [selectedSubjectKey, setSelectedSubjectKey] = useState<string>('');
```

- `selectedSubjectKey`: 当前选中的科目 key
- 通过 `SubjectManager` 的 `onSubjectSelect` 回调更新
- 传递给 `TopicManager` 的 `subjectKey` 属性

## API 交互

页面本身不直接调用 API，所有 API 交互由子组件处理：

- `SubjectManager` 负责科目相关的 API 调用
- `TopicManager` 负责考点相关的 API 调用

## 导航

- **返回按钮**: 点击左上角的返回按钮导航到首页 (`/`)
- **标题**: 显示"科目和考点管理"
- **副标题**: "好好学习，天天向上"

## 响应式设计

- 桌面端：左右分栏布局（`lg:grid-cols-2`）
- 移动端：上下堆叠布局（`grid-cols-1`）

## 样式主题

- 背景色: `#EDEDE9` (米色)
- 主题色: `#D5BDAF` (棕色)
- 卡片: 白色背景，圆角阴影

## 使用示例

### 基本使用

```typescript
import { AdminSubjectsPage } from '@/pages/admin/AdminSubjectsPage';

// 在路由中使用
<Route path="/admin/subjects" element={<AdminSubjectsPage />} />
```

### 导航到页面

```typescript
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/app-constants';

const navigate = useNavigate();
navigate(ROUTES.adminSubjects);
```

## 测试

### 单元测试

位置: `src/test/AdminSubjectsPage.test.tsx`

测试覆盖：
- 页面渲染
- 组件集成
- 状态传递
- 导航功能

### 集成测试

位置: `src/test/AdminSubjectsPage.integration.test.tsx`

测试覆盖：
- 科目加载和选择
- 考点显示
- API 错误处理
- 端到端流程

## 相关需求

- **需求 10.1**: 科目管理界面
- **需求 10.11**: 考点管理界面
- **需求 10.22**: 主从布局 - 科目列表
- **需求 10.23**: 主从布局 - 考点列表

## 注意事项

1. **权限检查**: 页面应该在路由层面进行权限检查，确保只有管理员可以访问
2. **数据同步**: 科目和考点的创建、编辑、删除操作会自动更新列表
3. **删除保护**: 删除科目或考点前会检查是否有关联数据
4. **状态管理**: 页面状态简单，主要依赖子组件的内部状态管理

## 未来改进

1. 添加批量操作功能（批量启用/禁用）
2. 添加搜索和筛选功能
3. 添加拖拽排序功能
4. 添加导入/导出功能
5. 添加操作日志记录
