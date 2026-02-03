# TODO：去除 QuestionDetailPage 对 mockAnswers/mockComments 的依赖（仅保留 Storybook/专用调试使用）

## 背景

当前 `src/pages/QuestionDetailPage.tsx` 仍直接依赖 `mockAnswers` / `mockComments`（来自 `src/lib/mock-data.ts`）作为回答与评论列表的初始数据，并通过内置的 `USE_MOCK` 常量控制部分逻辑。  
在“去除 Mock 与接入真实数据库”的整体目标下，问题详情页在运行时应完全依赖真实后端接口，仅在 Storybook 或专用调试入口中使用 Mock 数据。

## 目标

- 运行时（dev/测试环境 + E2E + 生产）：
  - QuestionDetailPage 的回答列表与评论列表仅依赖后端接口：
    - 回答：`GET /api/questions/:id/answers`
    - 评论：`GET /api/questions/:id/comments`
  - 不再从 `mockAnswers` / `mockComments` 读数据。
- Mock 数据仅在以下场景保留：
  - 前端单元测试（通过 hook/props 注入，而不是直接读 `mockAnswers` / `mockComments`）。
  - Storybook 或专用诊断组件中，显式选择“Mock 模式”时使用。

## 任务拆解

1. 抽离 Mock 依赖到单独适配层
   - [ ] 新建 `src/lib/mock-question-detail.ts`，封装与 QuestionDetailPage 相关的 Mock 数据访问：
     - 输入：`questionId: string`
     - 输出：`{ answers: Answer[]; comments: Comment[] }`（内部从 `mockAnswers` / `mockComments` 读取）。
   - [ ] 在 QuestionDetailPage 中删除对 `mockAnswers` / `mockComments` 的直接导入；后续仅在 Storybook/调试入口中使用 `mock-question-detail.ts`。

2. 让 QuestionDetailPage 的主路径只依赖真实后端
   - [ ] 删除 QuestionDetailPage 文件内的 `const USE_MOCK = false` 以及基于它的条件分支。
   - [ ] 初始化 `answers` / `comments` 时改为默认空数组：`useState<Answer[]>([])` 与 `useState<Comment[]>([])`。
   - [ ] 调整 `answerService.listByQuestion` / `commentService.listByQuestion` 的使用逻辑：
     - 成功时总是用后端返回值覆盖当前状态（而不是“若本地有 mock 就不覆盖”）。
     - 失败时仅保留 toast/log 兜底，不再回退到 Mock 数据。

3. 为测试与调试提供专用注入方式
   - [ ] 若当前有前端单测依赖 `mockAnswers` / `mockComments` 通过 QuestionDetailPage 间接生效：
     - 抽象出 `useQuestionDetailAnswers` / `useQuestionDetailComments`（或统一的 `useQuestionDetail`）hook；
     - 在单测中 `vi.mock` 这些 hook 或通过 props/context 注入测试数据，而非依赖 `mock-data.ts` 直接导入。
   - [ ] 为 Storybook 或内部调试增加包装组件（后续可命名为 `QuestionDetailPageMockStory`）：
     - 内部通过 `mock-question-detail.ts` 获取 `answers/comments`；
     - 然后通过 props/context 注入给真实的 QuestionDetailPage，以实现“Mock 场景下可视化演示”。

4. 收尾与回归验证
   - [ ] 使用 `rg "mockAnswers|mockComments"` 全局搜索，确认生产路径（非 Storybook/测试）仅剩 `mock-question-detail.ts` 等调试文件中的引用。
   - [ ] 在根目录运行：
     - `npm test`（前端单测）
     - `npm run test:e2e`（Playwright 全量）  
     确认：
       - 单测中通过 hook/mock 注入的覆盖路径正常；
       - E2E 下问题详情页的回答/评论行为完全依赖真实后端，不再触达 Mock 数据。

