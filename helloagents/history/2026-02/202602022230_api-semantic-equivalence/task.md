# 任务清单: API 语义等价类分类与文档对齐

目录: `helloagents/plan/202602022230_api-semantic-equivalence/`

---

## 1. 语义等价类规则与清单
- [√] 1.1 在 `helloagents/wiki/api.md` 中新增「语义等价类分类规则」章节，整理 A/B/C/D 四类定义与判定原则，并列出典型接口示例（如 `/api/auth/register`、`/api/auth/refresh-token`、`/api/auth/logout`、`/api/users/me/likes`、`/api/behavior/log` 等），验证 why.md#需求-语义等价类分类规则明确-场景-对照代码/测试快速判断差异类型。
- [√] 1.2 在 `helloagents/plan/backend-route-diff.md` 中为已有差异条目增加“类别”或等效标记，将用户列举的扩展接口标记为“语义等价/扩展能力”，并与 `202602022130_route-hard-errors` 方案进行边界说明，验证 why.md#需求-典型接口被正确归类且文档补全-场景-以-apiauthregister-和-apiusersmelikes-为代表接口。

## 2. 文档更新（需求/测试/前端）
- [√] 2.1 更新 `codex-develop-doc/后端需求文档-完整版.md` 中认证与行为埋点相关章节，使 `/api/auth/register`、`/api/auth/refresh-token`、`/api/auth/logout`、`/api/behavior/log` 的请求/响应示例与真实实现和测试用例一致，并在合适位置注明哪些差异属于语义等价类，验证 why.md#需求-典型接口被正确归类且文档补全-场景-以-apiauthregister-和-apiusersmelikes-为代表接口。
- [√] 2.2 更新 `codex-develop-doc/后端-测试用例.md` 中与上述接口相关的用例说明（包括预期响应与错误码），区分“合同刚性字段”与“扩展字段”，避免将语义等价类视为失败，验证 why.md#需求-语义等价类分类规则明确-场景-对照代码测试快速判断差异类型。
- [√] 2.3 更新 `gemini-frontend-doc/前端API对接检查清单.md`，在认证/互动/埋点相关条目中补充 `/auth/register`、`/auth/refresh-token`、`/auth/logout`、`/users/me/likes` 等接口的使用说明与注意事项，强调前端只依赖语义稳定字段，验证 why.md#需求-典型接口被正确归类且文档补全-场景-以-apiauthregister-和-apiusersmelikes-为代表接口。

## 3. 安全与一致性检查
- [√] 3.1 对照 `helloagents/plan/202602022130_route-hard-errors/` 方案包与现有后端实现，复核本方案中 A/B/C 类的边界定义，确保不会把路径缺失、状态码错误、必填字段缺失等真正合同错误误归为语义等价类，并在 how.md 中补充必要的负例说明。

## 4. 测试与验证
- [√] 4.1 文档与知识库更新完成后，运行后端 Jest 集成测试与 API 烟雾测试脚本，确认被归入语义等价类或扩展能力的接口在现有测试中全部通过，并在 why.md 对应场景下记录测试结论。
- [√] 4.2 如有可用的前端联调或 Playwright 自动车测脚本，选取「注册 + 我的点赞列表 + 行为埋点」等路径进行抽样验证，确保前后端协作行为与更新后的文档完全一致。
