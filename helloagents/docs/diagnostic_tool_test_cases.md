# 接口诊断工具测试用例集

## 1. 测试环境
- **框架**: Vitest + React Testing Library
- **运行命令**: `npm run test`
- **覆盖率报告**: `npx vitest run --coverage`

## 2. 覆盖率报告摘要 (2026-02-02)

| 文件 | 行覆盖率 | 分支覆盖率 | 函数覆盖率 | 语句覆盖率 |
|---|---|---|---|---|
| **Core Logic** | | | | |
| `src/stores/useDiagnosticStore.ts` | 100% | 100% | 100% | 100% |
| `src/lib/test-runner.ts` | 93.33% | 56.25% | 100% | 93.33% |
| **Pages** | | | | |
| `src/pages/MyQuestionsPage.tsx` | 90% | 70% | 81.81% | 90% |

*注：核心逻辑模块（Store 和 Runner）均达到高覆盖率，确保了诊断工具的稳定性。*

## 3. 测试执行步骤

### 3.1 单元测试 (Store & Logic)
验证状态管理和核心运行逻辑。
```bash
npx vitest src/test/diagnostic/store.test.ts
npx vitest src/test/diagnostic/runner.test.ts
```

### 3.2 集成测试 (Page & UI)
验证界面渲染、交互和反馈。
```bash
npx vitest src/test/diagnostic/page.test.tsx
```

## 4. 测试用例详情

### 4.1 核心状态 (useDiagnosticStore)
- **Initial State**: 验证初始状态（空结果、未运行、0进度）。
- **Add Log**: 验证日志添加功能。
- **Update Progress**: 验证进度更新功能。
- **Add Result**: 验证测试结果添加功能。

### 4.2 运行器逻辑 (TestRunner)
- **Execution Flow**: 验证 `runDiagnosticTests` 是否按顺序执行所有测试用例。
- **Result Recording**: 验证测试结果是否正确记录到 Store。
- **Status Updates**: 验证测试通过/失败状态的判定逻辑。

### 4.3 界面交互 (DiagnosticPage)
- **Rendering**: 验证标题、统计卡片、操作按钮是否正确渲染。
- **Start Diagnosis**: 模拟点击"开始诊断"，验证状态变为"诊断中"。
- **Progress Display**: 验证进度条和日志窗口是否随测试进行更新。
- **Results Display**: 验证测试完成后结果列表的渲染。

## 5. 业务场景覆盖
1. **正常流程**: 用户进入页面 -> 点击开始 -> 等待完成 -> 查看全绿报告。
2. **异常流程**: 模拟接口 500 错误 -> 验证工具记录失败状态 -> 验证错误日志显示。
3. **重置流程**: 测试完成后点击重置 -> 验证所有状态清空，回到初始态。
