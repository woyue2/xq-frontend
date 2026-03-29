# Evolution Log

> 最新记录在最前。

---

# 2026-03-30

## 变动  GEB 合规审查：P0 修复 + P1 service 拆分 + CLAUDE.md 分形文档
### 原因  项目进入成熟阶段，需建立 GEB 分形架构合规基线，消除代码坏味道。
### 影响
- `QuestionCard.tsx`：消除 `as any` 类型绕过，魔法数字提取为具名常量
- `MainLayout.tsx`：`NavItem` props 从 `: any` 改为具名 `NavItemProps interface`
- `src/services/api.ts`（1149行）→ 拆分为 6 个独立 service 文件 + 33行 re-export 桶（现有 import 路径零改动）
  - `http.ts` / `auth.service.ts` / `question.service.ts` / `interaction.service.ts` / `notification.service.ts` / `admin.service.ts`
- 新增 `useAdminWhitelist.ts` hook（抽取 AdminManagementPage 全量 state + 逻辑）
- 新增 `useQuestionDetail.ts` hook（抽取 QuestionDetailPage 全量交互逻辑）
- 新增 GEB 三层分形 CLAUDE.md 共 19 个文件（L1 根 + L2 前后端 + L3 全目录）
