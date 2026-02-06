# 学生“弄懂了”个人理解标记功能 - 技术方案

## 一、数据模型设计

### 1.1 Question 表聚合字段扩展

在 `backend/prisma/schema.prisma` 的 `Question` 模型上新增两个整型统计字段，用于聚合“理解状态”的计数：

- `understoodCount Int @default(0)`：标记为“弄懂了”的用户数；
- `notUnderstoodCount Int @default(0)`：标记为“没弄懂”的用户数。

说明：
- 当前业务场景中仅有“提问学生”一个用户会进行标记，但采用聚合字段可兼容未来扩展到“多个学生对同一道题的理解状态”的需求。
- 统计值通过对个人状态表的变更进行增量更新，避免在每次查询时做全表聚合。

### 1.2 个人理解状态表 QuestionUnderstanding

在 Prisma 中新增模型：

- 表名建议：`QuestionUnderstanding`；
- 主要字段：
  - `id: String`（cuid，主键）
  - `questionId: String`（关联 `Question`）
  - `userId: String`（关联 `User`，无需显式 Prisma 关系，保持与 `Like`、`Favorite` 一致风格）
  - `status: String`，约定枚举值：`'understood' | 'not_understood'`
  - `createdAt: DateTime`
  - `updatedAt: DateTime`
  - 关系：`question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)`
  - 约束与索引：
    - `@@unique([questionId, userId])`：一个用户对同一题目只有一条状态记录；
    - `@@index([userId])`：便于查询某个用户的整体理解列表。

### 1.3 约束与默认规则

- 默认状态：数据库中“没有记录”视为“未标记”，前端可不展示或以灰色“未标记”呈现。
- 状态切换规则：
  - `未标记 → 弄懂了`：写入一条 `status = 'understood'` 记录；
  - `未标记 → 没弄懂`：写入一条 `status = 'not_understood'` 记录；
  - `弄懂了 → 没弄懂`：更新记录并同步调整 `Question` 上的计数；
  - `没弄懂 → 弄懂了`：同上；
  - 可选：支持“撤销标记”（删除记录并回退计数）。

## 二、接口设计

### 2.1 标记理解状态接口

新增接口（需要鉴权）：

- `POST /api/questions/:questionId/understanding`

请求体：
- `{ "status": "understood" | "not_understood" }`

业务规则：
- 仅允许“该题目的提问学生”调用：
  - 从 `Question` 表读取 `authorId`，要求 `authorId === req.user.id`，否则返回 `403`；
- 可选：要求该题目至少有一条来自教师的回答且状态为 `approved`，否则返回 `400` 提示“老师回答后才能标记理解状态”。

实现逻辑（事务内完成）：
- 查询现有 `QuestionUnderstanding` 记录（按 `questionId + userId` 唯一键）；
- 根据当前状态与目标状态，决定是插入、更新或删除记录；
- 按差值更新 `Question.understoodCount` / `Question.notUnderstoodCount`；
- 返回当前用户最新状态与题目聚合统计。

响应示例：
- 成功（理解状态更新后）：
  - `{ code: 200, message: "success", data: { status: "understood", understoodCount: 1, notUnderstoodCount: 0 } }`

### 2.2 获取理解状态接口

为了支持前端列表与详情渲染，新增只读接口或扩展现有接口：

- 方案 A：独立接口
  - `GET /api/questions/:questionId/understanding`
  - 返回当前登录用户的 `status` 及题目聚合计数。
- 方案 B：扩展现有问题详情接口
  - 在 `GET /api/questions/:id` 中新增字段：
    - `understoodCount`
    - `notUnderstoodCount`
    - `currentUserUnderstandingStatus`（当前登录用户的理解状态或 null）

推荐优先实现方案 B（减少前端额外请求），若问答主页列表数据量较大，可视情况在列表接口中仅返回当前用户的 `currentUserUnderstandingStatus`，聚合数用于详情页展示或后续分析。

## 三、前端对接与交互设计（概述）

### 3.1 问答主页展示

- 在问答主页的题目卡片中，在“日期”旁边增加一段小字文本，用颜色区分：
  - 红色文本：`"没弄懂"`，对应 `status = 'not_understood'`；
  - 绿色文本：`"弄懂了"`，对应 `status = 'understood'`；
  - 未标记：可不显示，或以灰色 `"未标记"` 显示，并作为点击入口。
- 仅在“当前用户是该题目提问者”时展示该段文案，否则不显示（避免干扰其他用户）。

### 3.2 点击交互

- 点击状态文本时：
  - 若当前为“未标记”，可以弹出简单的二选一操作（例如小弹窗或菜单：“弄懂了 / 没弄懂”），或直接在两种状态之间轮换；
  - 若当前为“弄懂了”，再次点击可切换为“没弄懂”或“撤销标记”（按产品决定）；
  - 交互完成后调用 `POST /api/questions/:questionId/understanding`，成功后本地乐观更新 UI。
- 建议通过 React Query（现已使用）对理解状态做缓存，以减少重复请求。

## 四、权限与安全考虑

- 鉴权：所有理解状态相关接口必须依赖 `Authorization` 头部和现有用户身份解析逻辑。
- 授权：
  - 写操作仅允许 `question.authorId === currentUser.id`；
  - 读操作可放宽（仅返回当前用户自己的状态），也可与写操作同一接口统一控制。
- 数据一致性：
  - 所有插入/更新/删除个人状态记录与 `Question` 聚合字段更新必须在单个事务中完成，防止并发下计数错乱。
- 兼容性：
  - 新增字段在 Prisma 迁移时默认值为 0，不影响现有查询；
  - 对外 API 保持向后兼容：新增字段仅作为扩展，不影响原有 JSON 结构解析。

## 五、测试与回归范围

- 单元/集成测试（后端）：
  - 用例覆盖：创建/更新/删除理解状态，计数同步更新，权限校验（非提问学生调用返回 403）。
  - 数据边界：重复调用同一状态不会导致计数异常；在事务失败时不产生脏数据。
- 前端集成测试：
  - 提问学生在问答主页能正确看到并切换状态，刷新后仍然正确。
  - 非提问学生或未登录用户访问同一页面时，不展示理解标记。

