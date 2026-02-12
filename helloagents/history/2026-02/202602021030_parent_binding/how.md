# 技术设计

## 1. 架构变更
- **前端路由**: 新增 `/parent/questions/:childId` 路由。
- **状态管理**: 在 `useAuthStore` 或组件本地状态中管理绑定列表。

## 2. 模块设计

### 2.1 注册绑定 (LoginPage)
- 复用现有注册表单。
- 当邀请码为 `PARENT2024` 时，显示绑定子表单（孩子姓名、手机号、验证码）。
- 验证码使用模拟接口通过。
- 注册成功后调用绑定接口（模拟）。

### 2.2 绑定管理 (ProfilePage)
- 新增「我的孩子」Tab/Section。
- 展示已绑定孩子列表（头像、姓名、年级）。
- 提供「添加孩子」按钮（复用注册时的绑定表单）。
- 提供「解绑」按钮（置灰，Tooltip 提示联系班主任）。

### 2.3 提问查看 (ParentQuestionPage)
- 复用 `QuestionList` 组件。
- 传入 `filter` 参数或 `childId` props。
- 仅展示指定孩子的提问。

## 3. API 接口 (模拟/对接)
- `POST /api/v2/parent/bind`: 绑定孩子
- `GET /api/v2/parent/children`: 获取绑定列表
- `POST /api/v2/parent/unbind`: 解绑 (暂不支持前端直接调用，仅用于文档)
- `GET /api/v2/parent/questions`: 获取孩子提问

## 4. 风险与规避
- **数据隐私**: 确保家长只能看到自己绑定的孩子数据（后端鉴权，前端过滤）。
- **重复绑定**: 接口层需校验唯一性索引。
- **性能**: 列表页分页加载。
