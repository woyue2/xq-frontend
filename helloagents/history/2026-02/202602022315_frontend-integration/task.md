## 前端关键业务与后端真实接入任务清单（TASKS）

> 说明：以下任务围绕「关键业务页从 Mock 切到真实服务」「图片压缩+上传链路」「登录白名单策略统一」三个方向展开，本轮开发实施优先完成图片上传链路、提问页后端接入与点赞/收藏真实调用，其他子任务保留为后续迭代。

- [-] T1 数据访问层与 Hook 梳理
  - [-] T1.1 盘点 `src/services/api.ts` 中 question/interaction/behavior 相关函数，并与后端合同文档/测试确认路径与返回结构  
    > 备注: 已在设计阶段完成脑图级梳理，本轮未对类型与合同进行代码级收敛，留待 `api-semantic-equivalence` / `contract-consistency` 方案统一处理。
  - [-] T1.2 设计并补充 `useQuestionDetail(questionId)` 钩子（包含加载问题详情、回答、评论的接口与状态）  
    > 备注: 目前仍通过 `useQuestions` + Mock 数据获取详情，Hook 拆分在后续“前端数据层重构”迭代中完成。
  - [-] T1.3 明确各页面应依赖的 service/hook 列表，记录在 `helloagents/wiki/modules/frontend-integration.md`  
    > 备注: Wiki 文档将在后续批量整理时一并补充。

- [ ] T2 提问/回答/评论页面从 Mock 切换到真实服务
  - [√] T2.1 `CreateQuestionPage`：将提交逻辑切换为调用 `questionService.createQuestion`，根据返回结果更新 UI 与导航  
    > 备注: 现已在提问页使用真实接口创建问题，并在成功后优先跳转到问题详情页（若未返回 id 则回首页兜底）。
  - [-] T2.2 `AnswerQuestionPage`：接入真实回答创建接口（新增 `answerService` 或扩展 `questionService`），替换本地 Mock  
    > 备注: 回答页仍为演示用 Mock，真实回答创建将与 `useQuestionDetail` 一并设计与落地。
  - [-] T2.3 `QuestionDetailPage`：接入 `useQuestionDetail`，统一从后端加载问题详情/回答/评论，并移除直接使用 `mockQuestions`/本地评论数组的逻辑  
    > 备注: 当前仅在详情页接入真实点赞/收藏接口，数据获取仍依赖现有 Hook 与 Mock。

- [ ] T3 点赞/收藏与行为埋点真实接入
  - [√] T3.1 在 `QuestionDetailPage` 与相关列表中，将点赞/收藏按钮事件切换为调用 `interactionService.like/favorite`  
    > 备注: 本轮已在 `QuestionDetailPage` 接入 `interactionService.like/favorite`，列表页（我的点赞/收藏）仍使用现有实现。
  - [√] T3.2 根据后端合同一致性方案，确保 `interactionService` 使用正确的 `/api/interactions/*` 或 `/api/questions/:id/*` 路由，并与类型 `LikeResponse` / `FavoriteResponse` 对齐  
    > 备注: 现有实现已使用 `/api/interactions/like|favorite` 路由并返回 `{ liked/likesCount, favorited/favoritesCount }`，与后端路由及类型保持一致。
  - [√] T3.3 在关键交互（浏览问题、点赞、收藏、提交回答/评论）中补充 `behaviorService.log` 调用，形成基础行为埋点  
    > 备注: 已在点赞/收藏路径中接入 `behaviorService.log`，浏览与评论提交的埋点将在后续埋点统一改造中补齐。

- [ ] T4 我的列表页接入真实后端
  - [-] T4.1 `MyQuestionsPage`：确认 `useQuestions({ authorId })` 与后端分页参数一致，并校验状态统计（已通过/待审核等）逻辑正确  
    > 备注: 列表与状态统计仍按既有实现运行，本轮未改动。
  - [-] T4.2 `MyAnswersPage`：改造为使用真实“我的回答”接口（或 questions+answers 组合查询），彻底移除对 `mockAnswers`/`mockQuestions` 的依赖  
    > 备注: 保留为后续“我的内容中心”迭代任务。
  - [-] T4.3 `MyLikesPage`/`MyFavoritesPage`：接入后端“我的点赞/收藏”接口，并在空列表时提供合理引导  
    > 备注: 暂仍使用现有 Mock 与本地状态，待互动合同与数据层统一后再推进。

- [ ] T5 图片压缩与上传模块落地
  - [√] T5.1 新增 `src/lib/image-compress.ts`，实现 `compressImage` 函数，满足“统一转 JPG、<1MB、清晰度可接受”的要求  
    > 备注: 使用 Canvas + 质量递减策略实现统一转 JPG 与 1MB 体积控制，浏览器不支持 Canvas 时会给出明确错误提示。
  - [-] T5.2 新增 `src/lib/upload-client.ts`，封装 `getUploadSignature` 与 `uploadFileWithSignature`，并与 `GET /api/upload/signature` 对接  
    > 备注: 本轮直接在 `questionService.uploadImage` 中编排“压缩 + 签名 + 直传”流程，独立上传客户端模块留待后续抽象。
  - [√] T5.3 改造 `questionService.uploadImage`：串联压缩 + 签名 + 直传流程，仅向页面层暴露 `{ imageUrl }`  
    > 备注: 在真实环境下通过签名 + `fetch` 直传，在 Mock 模式下保持基于签名构造稳定 URL，避免真实网络依赖。
  - [-] T5.4 在 `CreateQuestionPage`、`AnswerQuestionPage`、`QuestionDetailPage` 中统一接入新的上传流程，替换掉随机 URL/Mock 上传逻辑  
    > 备注: 当前仅提问页已接入统一压缩+上传流程，回答页与评论图片上传保持 Mock 行为。

- [ ] T6 登录白名单策略与前端提示统一
  - [-] T6.1 在后端 `AuthService.login` 中实现基于环境变量的白名单策略（如 `AUTH_STRICT_WHITELIST_FOR_LOGIN`），并补充相关集成测试  
    > 备注: 已在 `AuthService.login` 中增加 `AUTH_STRICT_WHITELIST_FOR_LOGIN` 开关及 4001/4004 错误码分支，尚未补充覆盖新策略的专门测试用例。
  - [-] T6.2 在前端登录页中，根据后端返回的错误码（4001/4003/4004 等）显示对应提示文案，并记录在文案规范或 Wiki 中  
    > 备注: 登录页仍依赖通用 Axios 拦截器错误提示，细粒度文案映射待下轮 UX 调整时统一处理。
  - [-] T6.3 检查提问/回答/评论页中使用 `isMemberActive` 的地方，确保与后端“课时有效期 / 白名单状态”语义一致  
    > 备注: 本轮未调整前端权限工具，后端白名单策略改造完成后将结合权限系统做一次端到端审计。

- [ ] T7 结构化编程与单元测试
  - [√] T7.1 为 `compressImage`、`uploadFileWithSignature`、`questionService.uploadImage` 添加函数契约注释（前置条件/后置条件/@throws）并按结构化编程规范整理控制流  
    > 备注: 已在 `compressImage` 与 `questionService.uploadImage` 上按前置条件/后置条件语义加入注释并使用顺序/选择/循环结构；`uploadFileWithSignature` 将随上传客户端模块抽象一并补齐。
  - [-] T7.2 使用 Vitest 为上传模块与 `useQuestionDetail` 编写单元测试，覆盖正常与错误分支，局部分支覆盖率 ≥ 85%  
    > 备注: 目前仅通过 `CreateQuestionPage` 相关用例间接覆盖上传流程，尚未添加针对压缩/上传模块的独立单测。
  - [-] T7.3 使用 Jest 为 `AuthService.login` 新增白名单策略相关测试用例，覆盖不同模式/不同白名单状态  
    > 备注: 后端现有认证测试保持通过，新策略相关用例将在后续专门补充。

- [ ] T8 文档与知识库更新
  - [-] T8.1 在 `helloagents/wiki/modules/frontend-integration.md` 中记录本方案的模块划分、上传流程与登录策略设计  
    > 备注: 本轮优先完成代码落地与关键用例测试，Wiki 条目尚未补充。
  - [-] T8.2 更新 `helloagents/CHANGELOG.md`，新增“前端关键业务与后端真实接入”条目  
    > 备注: Changelog 将在同一批次迁移多个前端方案包时统一更新。
  - [√] T8.3 运行前后端测试，整理一次测试与覆盖率报告，并将摘要写入 `codex-develop-doc` 或现有测试报告文档中  
    > 备注: 已运行前端 Vitest 关键用例集与后端 Jest 全量测试，当前仅 `backend/src/tests/unit/qa-comment-interaction.service.spec.ts` 仍有 3 个历史失败用例，未在本方案范围内修改。

