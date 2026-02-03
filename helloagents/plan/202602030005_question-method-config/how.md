# 技术方案：题目「解题方法/办法」维度配置化（方案2，仅规划）

> 状态说明：本方案仅为**未来迭代规划**，当前代码尚未实施；任何实现性描述均为目标设计，而非现状说明。

## 一、整体设计概览

- 目标：针对题目的「解题方法/办法」维度（key=`method`），设计一套可配置、可后台管理、可被前端动态消费的机制；
- 设计原则：
  - **优先兼容现有实现**：不强制重构 `Question` 主模型，仅在 `tags` 使用约定保证可回退；
  - **结构可扩展**：表结构和接口以“题目维度”的概念建模，将来可以追加其它维度而无需重新设计；
  - **配置驱动 UI**：前端不再硬编码「方法」的 label 和选项，完全由后端配置驱动；
  - **可灰度上线**：通过 `enabled` 开关控制是否在前端展示，便于先在测试环境试用。

## 二、数据模型设计（后端）

> ⚠️ 不确定因素：是否会在短期内扩展到多个维度  
> - 假设：中短期内主要围绕「解题方法/办法」维度，但未来存在扩展其它维度的较大可能性  
> - 决策：一次性将模型设计为“多维度可扩展”，但在实施阶段仅落地 `method` 这一维度

### 2.1 新增模型（以 Prisma 为例）

- `QuestionDimension`（题目维度定义）
  - `id` (String/UUID)
  - `key` (String, 唯一，如 `'method'`)  
  - `name` (String, 展示名称，如「解题方法」「办法」)
  - `enabled` (Boolean, 是否在前端展示该维度)
  - `multiSelect` (Boolean, 是否多选；本轮 `method` 固定为 `false`)
  - `description` (String?, 说明文案，前端可选展示)
  - `order` (Int, 在多个维度间排序；本轮可固定为 0)
  - `createdAt` / `updatedAt`

- `QuestionDimensionOption`（题目维度选项）
  - `id` (String/UUID)
  - `dimensionKey` (String, 外键指向 `QuestionDimension.key`)
  - `value` (String, 存储值，例如 `'substitution'`、`'unknown'`)
  - `label` (String, 展示文案，例如「代入法」「暂不确定」)
  - `order` (Int, 选项排序，`'unknown'` 通过该字段固定在最底部)
  - `enabled` (Boolean, 用于软删除/下线某个选项)
  - `createdAt` / `updatedAt`

### 2.2 与现有 Question 模型的关系

- 现状：`Question` 使用 `tags` 数组记录若干标签，其中之一可能是“解题方法”值；
- 本方案的兼容策略：
  - 不在本轮新增 `question.method` 专用字段；
  - 约定：当 `QuestionDimension.key = 'method'` 时，前端提交问题时将所选方法选项的 `value` 继续写入 `tags` 数组；
  - 将来如需要更强的结构化表示，可以在后续迭代中增加 `method` 字段，并提供迁移脚本。

## 三、接口设计

### 3.1 前端读取配置接口

- `GET /api/config/question-dimensions`
  - 功能：为前端提供当前生效的题目维度配置；
  - 请求参数：
    - 可选 `scene`（如 `'create_question'`），用于将来按场景过滤；本轮可先忽略或默认 `'create_question'`；
  - 响应数据（示意）：
    ```json
    {
      "dimensions": [
        {
          "key": "method",
          "name": "解题方法",
          "enabled": true,
          "multiSelect": false,
          "options": [
            { "value": "substitution", "label": "代入法", "order": 10 },
            { "value": "graph", "label": "图像法", "order": 20 },
            { "value": "unknown", "label": "暂不确定", "order": 999 }
          ]
        }
      ]
    }
    ```
  - 约定：
    - `'unknown'` 选项是否存在由配置决定，但推荐在初始化脚本中默认创建；
    - 前端只展示 `enabled = true` 的维度和选项。

### 3.2 后台管理接口（Admin）

- `GET /api/admin/question-dimensions`
  - 返回所有维度的配置列表，用于后台管理页面；
- `PUT /api/admin/question-dimensions/:key`
  - 更新某一维度的基础配置（`name`、`enabled`、`multiSelect` 等）；
- `POST /api/admin/question-dimensions/:key/options`
  - 新增某个维度的选项；
- `PUT /api/admin/question-dimensions/:key/options/:optionId`
  - 更新单个选项（`label`、`order`、`enabled` 等）。

权限控制建议：
- 仅限具有「系统管理员/运营配置」权限的用户访问上述 admin 接口；
- 短期可通过简单的角色枚举实现（例如 `role in ['admin', 'operator']`），后续可接入更精细的 RBAC。

## 四、前端改造方案

### 4.1 提问页面消费配置

- 受影响页面：
  - 所有“创建问题”入口（包括学生/老师侧创建提问的页面）。
  - 现有实现中，`CreateQuestionPage` 使用 `TAXONOMY` 的 `methods` 字段渲染“解题方法”下拉。
- 改造方案：
  - 页面初始化时调用 `GET /api/config/question-dimensions`；
  - 在内存状态中找到 `key === 'method'` 的维度：
    - 若不存在或 `enabled === false`：不渲染“方法/办法”字段；
    - 若存在且 `enabled === true`：
      - label 使用 `dimension.name`（可以是「解题方法」或「办法」）；
      - 下拉选项使用 `dimension.options`，按 `order` 排序；
      - 若存在 `value === 'unknown'` 的选项，排序上保证在最底部。
  - 表单提交时：
    - 若用户选择了某个方法选项 `value`，将其写入 `tags` 数组（保持与当前后端兼容）；
    - 若未选择或维度关闭，则不向 `tags` 写入任何与 `method` 相关的值。

### 4.2 后台维度管理页面

- 新增后台页面路由（举例）：`/admin/question-dimensions`
  - 显示维度列表，本轮只会显示 `method`；
  - 支持基本操作：
    - 启用/停用该维度；
    - 修改维度名称；
    - 查看该维度下的所有选项。
- 选项编辑子页/弹窗：
  - 列表展示所有选项（包含 `value`、`label`、`order`、`enabled`）；
  - 支持新增、修改和禁用选项；
  - 对 `'unknown'` 选项给出明确标识，并在交互上提醒“建议保留作为兜底选项”。

## 五、测试与验证策略

### 5.1 后端测试

- 单元/集成测试要点：
  - 初始化时正确创建 `method` 维度及其默认选项（包括 `'unknown'`）；
  - `GET /api/config/question-dimensions` 在维度开启/关闭时返回正确数据；
  - Admin 接口能够安全地修改 `enabled`、`name` 和选项集合。

### 5.2 前端测试

- 组件级或集成测试：
  - 当接口返回 `method.enabled = false` 时，创建问题页面不出现“方法/办法”字段；
  - 当 `method.enabled = true` 且包含 `'unknown'` 选项时，下拉框中存在「暂不确定」且排在最底部；
  - 选择不同方法选项时，提交 payload 的 `tags` 中正确包含对应 `value`。

### 5.3 端到端（E2E）测试（未来可追加）

- 新增 Playwright 用例，验证从后台配置 → 前端提问表单联动的完整闭环：
  1. 管理员在后台开启 `method` 维度并配置若干选项；
  2. 老师/学生打开创建问题页面，看到对应下拉；
  3. 选择某个方法并提问成功；
  4. 后端保存的问题数据中 `tags` 包含所选方法的 `value`。

## 六、风险与后续演进

- 主要风险：
  - 若未来需要对历史问题的「方法」进行统计或过滤，单纯依赖 `tags` 可能不够清晰，需要后续迭代时增加专用字段并迁移数据；
  - 维度与选项完全配置化后，如后台误操作（例如禁用全部选项）可能导致前端体验下降，需要在实现阶段通过校验/回滚保护。
- 未来演进方向：
  - 将本机制扩展到更多题目维度（题型、知识点、难度等），形成统一的“题目维度系统”；
  - 为维度和选项增加多语言支持，以及按学科/年级的差异化配置；
  - 在统计分析中引入各维度数据，支持按“解题方法”等维度进行学习行为分析。

