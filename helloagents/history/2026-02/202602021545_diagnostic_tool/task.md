# 任务清单 (Task)

## 阶段 1: 原型与基础架构 (Prototype)
- [ ] 创建 `helloagents` 目录结构及 `plan` 归档
- [ ] 定义 `DiagnosticResult` 接口与状态 Store (`src/stores/useDiagnosticStore.ts`)
- [ ] 创建基础页面框架 `src/pages/DiagnosticPage.tsx` 并配置路由 (`src/App.tsx`)

## 阶段 2: 核心引擎开发 (Alpha)
- [ ] 实现测试运行器 `src/lib/test-runner.ts` (支持 assert, timing)
- [ ] 编写核心接口测试用例 (Auth, Questions, User)
- [ ] 集成到诊断页面，实现"开始诊断"功能

## 阶段 3: 完善与可视化 (Beta)
- [ ] 实现可视化报告组件 (进度条, 状态徽章, 延迟图表)
- [ ] 增加异常场景模拟 (Mock 失败/超时)
- [ ] 优化 UI 交互 (实时日志滚动)

## 阶段 4: 文档与交付 (Release)
- [ ] 编写使用文档 `docs/diagnostic-tool.md`
- [ ] 全量回归测试
