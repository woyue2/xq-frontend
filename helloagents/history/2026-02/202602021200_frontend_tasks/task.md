# 任务清单

## 阶段 1: 基础设施与配置
- [ ] 创建 `src/config/feature-flags.ts` (灰度配置) <!-- id: 1 -->
- [ ] 创建 `src/components/ui/GoodQuestionBadge.tsx` <!-- id: 2 -->
- [ ] 更新 `src/config/ui-config.ts` (确保颜色变量对齐) <!-- id: 3 -->

## 阶段 2: 页面开发与 UI 对齐
- [ ] 重构 `src/pages/MyQuestionsPage.tsx` 统计卡片 (UI 对齐) <!-- id: 4 -->
- [ ] 创建 `src/pages/GoodQuestionsPage.tsx` (或复用列表页) <!-- id: 5 -->
- [ ] 在 `App.tsx` 中注册 `/good-questions` 路由 <!-- id: 6 -->

## 阶段 3: 交互逻辑实现
- [ ] 在 `GoodQuestionBadge` 中实现点击跳转逻辑 <!-- id: 7 -->
- [ ] 在 `src/services/api.ts` 中添加模拟日志接口 <!-- id: 8 -->
- [ ] 实现 Loading 和 Error Toast 提示 <!-- id: 9 -->

## 阶段 4: 测试与文档
- [ ] 编写单元测试 `src/test/good_question.test.tsx` <!-- id: 10 -->
- [ ] 更新 `后端-测试用例.md` (添加 API 测试用例) <!-- id: 11 -->
- [ ] 执行全量测试并修复潜在问题 <!-- id: 12 -->
- [ ] 生成 Checklist 报告 (作为注释或文件) <!-- id: 13 -->
