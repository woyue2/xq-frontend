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

## 变动  后端全量代码审查：Bug 修复 + 坏味道清除 + GEB L2/L3 补全
### 原因  /review 后端发现运行时 Bug 及文档缺失，阻塞提交前质量关卡。
### 影响
- `auth.middleware.ts`：补充缺失的 `verifyToken`/`AppError` import（运行时 Bug，JWT 验证全部失效）
- `question.service.ts`：移除 `authorName` 参数，service 内部自查 User 表获取真实姓名，消除路由层硬编码占位 `'当前用户'`
- `server.ts`：`console.log` → `coreLogger.info`（违反 FORBIDDEN）
- `routes/CLAUDE.md`：补充完整 17 个路由文件清单（原无清单）
- `services/CLAUDE.md`：补充完整 14 个 service 文件清单（原无清单）
- `middlewares/CLAUDE.md`：补充 `logger.middleware.ts` / `membership.middleware.ts` 两个缺失条目
- `src/services/CLAUDE.md`：补充 `subjectConfig.service.ts` 条目
- TODO 记录：`auth.service.ts`（1019行）待拆分、routes 层 prisma 直调待迁移、`FIXED_CODE` 硬编码安全风险
