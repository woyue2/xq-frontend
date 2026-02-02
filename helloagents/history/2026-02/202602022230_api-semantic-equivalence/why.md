# 变更提案: API 语义等价类分类与文档对齐

## 需求背景
当前项目的后端实现、测试用例与前后端协作文档整体一致，但在若干接口上存在「名称或结构略有不同、业务语义相同」的情况，例如：
- 字段命名或 message 文案不同，但 HTTP 状态码与业务含义一致（如 `/api/behavior/log` 的 `data.id` vs 文档中的 `logId`，`"Logged successfully"` vs `"success"`）；
- 实现返回了更多的字段或附加信息，而文档示例仍保持简化版本（如 `send-code/login/register` 的返回体）；
- 实现已经提供了新增接口或参数，但早期产品文档/清单中未显式列出（如 `/api/auth/register`、`/api/auth/refresh-token`、`/api/auth/logout`、`/api/users/me/likes` 等）。

这些差异在路由对照、API 评审或联调自检时，容易被误判为「合同不一致/缺少接口」，但从运行结果看并不会破坏已有合同，属于典型的“语义等价类”。目前 HelloAGENTS 知识库已经有针对「硬错误路由」的专门方案（`route-hard-errors`），但尚缺少一套系统化的“语义等价类”分类规则与落地文档。

本提案的目标，是在不破坏现有稳定实现与测试的前提下：
- 明确区分「硬错误」与「语义等价类」；
- 给出可维护的分类规则与典型清单；
- 同步更新知识库与关键文档，避免“有功能但没人知道”或“语义等价被当成 bug”。

## 变更内容
1. 在知识库中定义 API 差异的「语义等价类」分类规则与边界，包括但不限于：
   - 字段/文案命名差异但业务语义一致；
   - 响应体扩展字段、不破坏既有消费方式的返回结构增强；
   - 新增接口或参数但保持向后兼容的“扩展能力”；
   - 与「硬错误」类别（路径缺失、状态码错误、必填字段缺失等）的明确分界。
2. 为若干典型接口建立分类清单，并在知识库中记录：
   - `/api/auth/register`、`/api/auth/refresh-token`、`/api/auth/logout`；
   - `/api/users/me/likes`、`/api/users/me/favorites`；
   - `/api/behavior/log` 及相关埋点规范；
   - 其他在 `backend-route-diff` 与 Playwright 报告中已标注为“语义等价/扩展能力”的接口。
3. 更新 HelloAGENTS 知识库与关键文档，使分类规则成为团队共识：
   - 在 `helloagents/wiki/api.md` 中增加「语义等价类分类规则」章节；
   - 在 `helloagents/plan/backend-route-diff.md` 中为差异项增加“类别”标记，将上述接口归入“语义等价/扩展能力”，并与 `route-hard-errors` 方案形成互补；
   - 在 `codex-develop-doc/后端需求文档-完整版.md`、`codex-develop-doc/后端-测试用例.md`、`gemini-frontend-doc/前端API对接检查清单.md` 中，补齐示例与说明，避免语义等价类被误判为合同错误。
4. 为后续自动化检查/评审提供规则基础：
   - 约定在路由 diff、API 静态校验或审查报告中，语义等价类仅作为「提示/文档待补」而非阻断性错误；
   - 将本提案的分类规则作为后续工具化（如脚本、lint 规则）的设计基准。

## 影响范围
- **模块:**
  - 后端认证模块（`/api/auth/*`，尤其是 register/refresh-token/logout）；
  - 用户互动模块（`/api/users/me/likes`、`/api/users/me/favorites`）；
  - 行为埋点模块（`/api/behavior/log`）；
  - HelloAGENTS 知识库的 API 概览与路由对照文档；
  - 后端需求/测试文档与前端 API 对接检查清单。
- **文件:**
  - `helloagents/wiki/api.md`
  - `helloagents/plan/backend-route-diff.md`
  - `codex-develop-doc/后端需求文档-完整版.md`
  - `codex-develop-doc/后端-测试用例.md`
  - `gemini-frontend-doc/前端API对接检查清单.md`
  - 如有需要，可在相关 Playwright 报告或 summary 中增加引用。
- **API:**
  - `/api/auth/send-code` / `/api/auth/login` / `/api/auth/register`
  - `/api/auth/refresh-token` / `/api/auth/logout`
  - `/api/users/me/likes` / `/api/users/me/favorites`
  - `/api/behavior/log`

## 核心场景

### 需求: 语义等价类分类规则明确
**模块:** 知识库 (HelloAGENTS)

#### 场景: 对照代码/测试快速判断差异类型
前置条件:
- 开发者在查看某个接口时，已经可以访问后端实现、测试用例和需求/前端文档。

步骤与预期:
- 开发者按照 `helloagents/wiki/api.md` 中的分类规则，对某个接口差异进行判定；
- 能明确将之归类为「硬错误」或「语义等价/扩展能力」；
- 语义等价类的处理方式（是否需要补文档、是否影响 CI）在文档中有清晰说明。

### 需求: 典型接口被正确归类且文档补全
**模块:** 后端认证 / 行为埋点 / 用户互动

#### 场景: 以 `/api/auth/register` 和 `/api/users/me/likes` 为代表接口
前置条件:
- 已根据本方案完成知识库与关键文档更新。

步骤与预期:
- 在路由对照与 API 评审中，`/api/auth/register`、`/api/auth/refresh-token`、`/api/auth/logout`、`/api/users/me/likes` 等接口不再被列为「缺失/错误路由」，而是出现在“扩展能力/语义等价类”清单中；
- 需求文档与前端检查清单中都能查到这些接口的说明与返回字段，避免“有功能但没人知道”；
- 对 `/api/behavior/log` 的返回结构差异在文档中有明确说明（例如 `data.logId` 即为实现中的 `data.id`），前端按语义正确消费。

## 风险评估
- **风险:** 分类规则不清晰，导致真正的合同错误（如状态码不符合约定、缺失必填字段、路径不一致）被错误归入“语义等价类”，从而在评审或联调中被忽略。
  - **缓解:** 将「硬错误」的严格定义与 `route-hard-errors` 方案结合，在本方案中明确列出“绝不属于语义等价类”的情形；在实现阶段通过对比现有 Jest 集成测试与 API smoke 脚本结果，确认所有语义等价类接口在测试中均为通过状态。
- **风险:** 文档更新不完整或后续变更未同步，导致分类规则与实际实现再次偏离。
  - **缓解:** 本方案在任务清单中包含对关键文档的更新与知识库同步任务，并鼓励后续在 CI 或 review checklist 中增加“语义等价类/扩展能力”检查项。

