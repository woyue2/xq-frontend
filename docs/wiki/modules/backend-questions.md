# 模块文档：问题与回答（backend-questions）

## 一、模块职责

- 管理问题、回答与评论的创建、查询与状态变更。
- 维护计数信息（点赞数、收藏数、评论数、回答数等）。
- 与审核模块协作，通过 AI 或人工审核结果更新内容状态。

## 二、规划接口概览

- `GET /api/questions` / `GET /api/questions/:id`：问题列表与详情。
- `POST /api/questions`：创建问题，支持多图片与音频等。
- `POST /api/answers` / `POST /api/comments`：创建回答与评论。
- 后续会增加与审核、行为埋点和通知联动的接口，并与前端类型定义保持一致。

## 三、学生理解状态标记（"弄懂了"）

- 数据模型：
  - 在 `Question` 聚合模型中新增 `understoodCount` / `notUnderstoodCount` 两个字段，用于统计"标记为弄懂了 / 没弄懂"的用户数量（目前主要服务于后续数据分析预留）。
  - 新增 `QuestionUnderstanding` 表，以「题目 ID + 用户 ID」为唯一键，记录单个学生对整道题的个人理解状态，枚举值为 `understood`（弄懂了）与 `not_understood`（没弄懂）。
- 接口：
  - `POST /api/questions/:questionId/understanding`：仅允许该题目的提问学生写入或更新自己的理解状态，在事务中同时维护 `Question` 聚合计数；
  - `GET /api/questions/:id`：在原有问题详情结构上新增 `understoodCount`、`notUnderstoodCount` 以及当前登录用户的 `understandingStatus` 字段；
  - `GET /api/questions`：问题列表在保持分页结构不变的前提下，为当前登录用户补充每条记录的 `understandingStatus`（仅当用户对该题有标记时返回非空值）。
- 前端展示约定：
  - 问答主页题目卡片在日期旁以小字展示当前登录学生对该题的理解状态：绿色"弄懂了"、红色"没弄懂"、灰色"未标记"；
  - 仅当当前用户为该题提问者时展示并允许点击切换状态，其他用户不显示该标记。

## 四、按学生维度查看历史提问

- 列表接口：
  - 通用接口：`GET /api/questions` 支持通过 `authorId` 查询参数按提问学生过滤问题列表（老师/学生端使用），可叠加 `page/pageSize/subject/topic/search` 等筛选；
  - 家长端接口：`GET /api/parent/questions/:childId` 用于家长查看已绑定孩子的已通过审核问题列表（仅 `status='approved'`，不包括待审核和已驳回的问题），内部基于 `ParentChild` 关系校验 parent-child 绑定后再按 `authorId = childId` + `status='approved'` 查询。
- 典型前端用法：
  - 学生「我的提问」页：`useQuestions({ authorId: user.id })`；
  - 老师查看某个学生的历史提问：在前端头像点击后跳转到 `/student/:studentId/questions` 页面，内部使用 `useQuestions({ authorId: studentId })` 拉取记录；
  - 家长端「孩子提问列表」页：通过 `parentService.getChildQuestions(childId, { page, limit, subject, topic })` 访问 `/api/parent/questions/:childId`。
