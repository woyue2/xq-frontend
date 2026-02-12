# 任务清单：题目「解题方法/办法」维度配置化（方案2）

> 状态：已获确认，当前任务清单用于实际开发实施与跟踪；请按项更新状态。

## 一、后端任务

- [√] B1. 新增题目维度与选项模型
  - 在 `prisma/schema.prisma` 中新增 `QuestionDimension` 与 `QuestionDimensionOption` 模型（或等价结构），并生成迁移。
  - 为 key=`'method'` 初始化一条维度记录，默认 `enabled=true`、`multiSelect=false`。

- [√] B2. 初始化「解题方法」默认选项
  - 编写种子脚本或迁移逻辑，在 `QuestionDimensionOption` 中为 `method` 维度创建一组默认选项。
  - 包含并强调 `value='unknown'` 的「暂不确定」选项，`order` 值确保排在列表底部。

- [√] B3. 对外暴露读取配置接口
  - 新增 `GET /api/config/question-dimensions` 接口，返回当前有效的题目维度配置。
  - 确保仅返回 `enabled=true` 的维度及其中 `enabled=true` 的选项。

- [√] B4. 新增后台管理接口
  - 新增 `GET /api/admin/question-dimensions`、`PUT /api/admin/question-dimensions/:key` 等接口。
  - 支持对 `method` 维度的启用/停用、重命名及选项增删改。
  - 接口需加上角色/权限校验，仅允许管理员/运营访问。

- [√] B5. 后端测试
  - 单元/集成测试覆盖：
    - 维度与选项的创建与更新逻辑；
    - 不同 `enabled` 状态下配置接口返回值的正确性；
    - 基本权限控制（非管理角色无法访问 admin 接口）。

## 二、前端任务（提问页面）

- [√] F1. 从接口读取维度配置
  - 在所有创建问题页面（例如 `src/pages/CreateQuestionPage.tsx` 及其它提问入口）中，增加对 `GET /api/config/question-dimensions` 的调用。
  - 将返回结果缓存到本地状态或全局 store 中，供表单组件使用。

- [√] F2. 动态渲染「解题方法/办法」下拉
  - 用接口返回的 `method` 维度替换当前基于 `TAXONOMY.methods` 的静态配置。
  - 当 `method.enabled=false` 或接口中不存在该维度时，不渲染对应表单项。
  - 当 `method.enabled=true` 时：
    - 字段标题使用 `method.name`（例如「解题方法」或「办法」）；
    - 选项使用 `method.options`，按 `order` 排序；
    - 确保 `value='unknown'` 的选项在下拉列表底部。

- [√] F3. 提问数据提交兼容性
  - 保持当前使用 `tags` 数组向后端提交方法信息的方式，避免一次性修改后端接口。
  - 明确约定：当选择了方法时，将所选选项的 `value` 写入 `tags` 中；未选择或维度关闭时不写入。

- [√] F4. 前端测试
  - 为提问页面新增单元/集成测试（或调整现有测试）：
    - 模拟不同配置（开启/关闭、不同选项集合）时的渲染行为；
    - 确认「暂不确定（unknown）」在下拉列表中的显示位置及提交行为。

## 三、前端任务（后台管理页面）

- [√] A1. 新增题目维度管理入口
  - 在已有后台或运营管理入口中新增「题目维度配置」模块（当前集成在 `/admin` 页面内，位于白名单列表下方）。

- [√] A2. 维度配置页面
  - 在 `AdminManagementPage` 中展示 `method` 维度的名称与启用状态，并提供「刷新配置」「启用/停用」「保存维度配置」操作。

- [√] A3. 选项管理页面/弹窗
  - 在 `AdminManagementPage` 中展示 `QuestionDimensionOption` 列表，支持新增选项（使用浏览器 prompt）、编辑 label/order/enabled，并通过“保存”按钮调用后端接口。
  - 对 `value='unknown'` 的选项在 UI 上增加“（暂不确定）”标记。

- [√] A4. 后台页面测试
  - 在 `src/test/advanced_coverage.test.tsx` 中补充维度配置相关用例（DIM-001/002），覆盖：
    - Admin 进入 `/admin` 时可以看到“题目维度配置（解题方法/办法）”卡片；
    - 点击“刷新配置”会触发 `adminService.getQuestionDimensions` 调用。

## 四、端到端（E2E）任务

- [√] E1. 配置生效链路 E2E 测试
  - 新增 Playwright 用例，覆盖如下场景：
    1. 管理员在后台开启 `method` 维度并配置若干选项（含 `'unknown'`）；
    2. 老师或学生打开创建问题页面，看到对应下拉及选项；
    3. 选择某个方法后成功创建问题；
    4. 后端存储的问题数据中 `tags` 包含所选方法的 `value`。

## 五、文档与知识库同步

- [√] D1. 更新系统整体文档
  - 在 `helloagents/wiki` 或等价位置新增/更新“题目维度配置”相关文档。
  - 说明维度的概念、可配置项以及当前仅落地 `method` 维度的事实。

- [√] D2. 更新 CHANGELOG 与设计文档引用
  - 在 `helloagents/CHANGELOG.md` 中记录本方案实施后的变更条目（实施时执行）。
  - 在相关 product/design 文档中引用本方案包路径，方便后续追溯。
