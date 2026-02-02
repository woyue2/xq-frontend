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

