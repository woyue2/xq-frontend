# 后端 P0 风险判定（2026-02-13）

- 结论来源：
  - `docs/backend-structure-audit-2026-02-13.md`
  - `docs/backend-usage-risk-analysis-2026-02-13.md`
  - 当日路由分层复核（只读）
- 判定口径：仅标记“会直接威胁核心业务一致性或主链路可用性”的事项为 P0。

---

## P0 清单

### P0-1：AI 回调链路在路由层直接执行状态流转与写库

- 位置：`backend/src/routes/internal.routes.ts`
- 关键区间：约 `129-189`（按 `targetType` 分支直接更新 question/answer/comment）
- 风险说明：
  - 该链路直接影响审核结果、前台可见状态、通知与统计口径。
  - 一旦规则与主业务链路不一致，容易出现“审核结果已变更但前台/列表未一致”的核心故障。

### P0-2：问题主链路在路由层承载事务、状态机、权限决策与 DB 直连

- 位置：`backend/src/routes/question.routes.ts`
- 关键区间示例：
  - `562-645`（理解状态事务与计数增减）
  - `700-763`（回答创建前权限决策与状态文案分支）
  - `858-889`（详情接口内点赞/收藏/理解状态拼装）
- 风险说明：
  - 问题/回答属于核心用户链路；路由层过重会导致入口之间规则漂移。
  - 该类漂移会直接体现在“同一对象不同页面状态不一致”。

### P0-3：核心域存在跨层混用（Route 直连 Prisma + Route 调 Service 并存）

- 典型文件：
  - `backend/src/routes/question.routes.ts`
  - `backend/src/routes/internal.routes.ts`
  - `backend/src/routes/profile.routes.ts`
- 风险说明：
  - 同域规则在多层重复实现，最容易形成“部分成功/部分失败”及口径分裂。
  - 在高频迭代下，该结构对核心链路的回归风险属于 P0 级。

---

## 非 P0（当前判定）

- 点赞/收藏双入口（`/questions/:id/like|favorite` 与 `/interactions/like|favorite`）：
  - 当前判定：P1（高风险但未直接证实核心链路已失效）。
- `behavior.routes.ts` 内存限流：
  - 当前判定：P1（多实例一致性风险，偏稳定性与部署场景）。
- `upload.routes.ts` 本地文件系统依赖：
  - 当前判定：P1（偏部署拓扑风险，非单机开发场景更突出）。

---

## 备注

- 本文档为“风险级别判定”，不包含整改方案与代码修改。
- 若后续出现真实线上事故证据（如状态回跳、审核口径冲突、核心接口部分成功），P1 项可升级为 P0。
