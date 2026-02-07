# 模块文档：题目维度与解题方法配置（backend-question-dimensions）

## 一、模块职责

- 为"题目维度"（如解题方法/办法等）提供统一的数据模型与配置能力；
- 支持通过后台接口管理维度的启用状态、展示名称与选项集合；
- 为前端提问页面提供统一的配置读取接口，实现"下拉选项可后台调整、无需改代码"的目标。

当前仅落地单一维度：

- `key = 'method'`：用于表示题目的"解题方法/办法"维度，包含若干可选方法以及兜底选项 `'unknown'`（展示为"暂不确定"）。

## 二、数据模型

Prisma 模型定义见 `backend/prisma/schema.prisma`：

- `QuestionDimension`
  - `id: string` — 主键；
  - `key: string` — 维度键名（例如 `'method'`），全局唯一；
  - `name: string` — 展示名称（例如"解题方法""办法"等，可后台修改）；
  - `enabled: boolean` — 是否在前端展示该维度；
  - `multiSelect: boolean` — 是否允许多选（当前 `method` 固定为 `false`）；
  - `description?: string` — 说明文案；
  - `order: number` — 多个维度间的排序；
  - `options: QuestionDimensionOption[]` — 关联的选项列表。

- `QuestionDimensionOption`
  - `id: string` — 主键；
  - `dimensionKey: string` — 外键，指向所属维度的 `key`；
  - `value: string` — 存储值（写入 Question.tags 的值，`method` 维度中 `'unknown'` 对应"暂不确定"）；
  - `label: string` — 展示文案；
  - `order: number` — 同一维度内选项排序；
  - `enabled: boolean` — 是否启用该选项。

在本轮实现中，问题模型本身仍使用 `tags: string[]` 存储方法相关信息：

- 前端在创建问题时，将所选方法的 `value` 写入 `tags`；
- 对于兜底选项，"暂不确定"对应的 `value` 为 `'unknown'`，便于后续做精细统计或筛选。

## 三、后端接口

### 3.1 面向前端的配置读取接口

- 路由文件：`backend/src/routes/config.routes.ts`
- 接口：`GET /api/config/question-dimensions`
  - 作用：为前端提供当前启用的题目维度配置；
  - 返回结构（简化）：
    ```json
    {
      "code": 200,
      "data": {
        "dimensions": [
          {
            "key": "method",
            "name": "解题方法",
            "enabled": true,
            "multiSelect": false,
            "options": [
              { "id": "...", "value": "配方法", "label": "配方法", "order": 10 },
              { "id": "...", "value": "公式法", "label": "公式法", "order": 20 },
              { "id": "...", "value": "unknown", "label": "暂不确定", "order": 999 }
            ]
          }
        ]
      }
    }
    ```
  - 注意：
    - 仅返回 `enabled = true` 的维度及其中 `enabled = true` 的选项；
    - `'unknown'` 选项通过 `order = 999` 保证位于列表底部。

### 3.2 管理端接口（Admin）

- 路由文件：`backend/src/routes/admin-question-dimensions.routes.ts`
- 中间件：
  - 使用 `authMiddleware` + `createRequireTeacher({ bizCode: 3006, message: '无题目维度管理权限' })`；
  - 目前沿用 `teacher` 角色作为维度配置管理权限的入口。

#### 3.2.1 列表与维度更新

- `GET /api/admin/question-dimensions`
  - 返回所有维度（含禁用维度）及其选项，用于后台配置页面；
- `PUT /api/admin/question-dimensions/:key`
  - 支持更新维度的 `name`、`enabled` 与 `multiSelect` 字段；
  - 当维度不存在时抛出 `404/DIMENSION_NOT_FOUND`。

#### 3.2.2 选项管理

- `POST /api/admin/question-dimensions/:key/options`
  - 为指定维度新增选项；
  - 校验 `value` / `label` 非空，避免同一维度中 `value` 重复；
  - 成功返回 201 与新建选项实体。
- `PUT /api/admin/question-dimensions/:key/options/:optionId`
  - 支持更新选项的 `label`、`order` 与 `enabled`；
  - 当选项不存在时抛出 `404/OPTION_NOT_FOUND`。

对应的 Service 封装在：

- `backend/src/services/question-dimension.service.ts`
  - `getPublicDimensions()`：前端配置读取；
  - `listAllDimensions()`：管理端列表；
  - `updateDimension(...)`：更新维度基础信息；
  - `createOption(...)` / `updateOption(...)`：选项增删改封装。

## 四、前端对接要点

- 全局配置调用：
  - 服务位置：`src/services/api.ts` 中新增 `configService.getQuestionDimensions()`；
  - 调用链：前端提问页 `CreateQuestionPage` 在挂载时调用该接口，读取包含 `method` 在内的维度配置。

- 提问页使用方式：
  - 文件：`src/pages/CreateQuestionPage.tsx`
  - 行为：
    - 组件加载后，通过 `configService.getQuestionDimensions()` 拉取维度配置；
    - 若返回中存在 `key = 'method' && enabled = true` 的维度：
      - 使用 `method.name` 作为字段标题（可在后台改为"办法"等）；
      - 使用 `method.options` 渲染"解题方法/办法"下拉选项，并按 `order` 排序；
      - 若其中存在 `value = 'unknown'` 的选项，则自然排在列表底部。
    - 若接口调用失败或返回结果中不包含 `method` 维度：
      - 前端回退使用内置 `TAXONOMY` 配置，仅保留原有静态方法列表；
      - 这种情况下不会出现 `'unknown'` 选项。
  - 数据提交：
    - 提问时仍使用 `tags: [selectedTopic, selectedMethod].filter(Boolean)` 向后端提交；
    - 若用户选择了"暂不确定"，则 `selectedMethod = 'unknown'`，从而在 `Question.tags` 中写入 `'unknown'`。

## 五、测试与验证

- 后端集成测试：
  - 文件：`backend/src/tests/integration/question-dimensions.api.spec.ts`
  - 覆盖点：
    - `GET /api/config/question-dimensions` 返回启用维度且 `'unknown'` 选项在底部；
    - 教师角色可以通过 Admin 接口读取和更新 `method` 维度配置；
    - 非教师访问 Admin 接口会得到 `403/PERMISSION_DENIED`；
    - 在 Admin 接口中新增/更新选项成功，且返回结构正确。

- 前端 E2E 测试：
  - 文件：`tests/e2e/question-method-dimension-config.spec.ts`
  - 场景：
    1. 使用内部 `/api/internal/test-token` 生成学生测试账号并写入 `auth-storage`（`bootstrapAuth`）；
    2. 打开 `/create` 提问页，选择科目后展开"解题方法/办法"下拉；
    3. 根据后端配置获取 `'unknown'` 对应的展示文案（如"暂不确定"），在前端下拉中点击该选项；
    4. 拦截前端提交到 `/api/questions` 的请求体，断言 `tags` 中包含 `'unknown'`。

## 六、后续演进方向

- 扩展到更多题目维度：
  - 例如"题型""知识点""难度"等，通过新增 `QuestionDimension` 记录及其选项即可复用当前机制；
  - 可以按学科/年级加入额外字段或关联表，实现差异化配置。

- 后台管理页面：
  - 目前仅提供管理端 API，前端管理 UI 仍在规划中；
  - 后续会在 `AdminManagementPage` 或独立的后台页面中接入维度列表与选项管理界面。
