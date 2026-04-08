# 实施计划：应用简化重构

## 概述

本实施计划将现有复杂教育问答应用简化为精简版本。保留核心功能：问题管理、回答、评论、图片上传，以及科目/考点分类体系。删除所有不必要的表、字段、路由和组件。采用 TypeScript + React + Vite 前端，Vercel Serverless Functions 后端，Supabase PostgreSQL 数据库。

## 任务

- [x] 1. 数据库架构简化
  - [x] 1.1 创建新的 Prisma schema 文件
    - 定义简化后的 6 个模型：User, Question, Answer, Comment, Subject, Topic
    - 删除所有不必要的字段（如 User 的 grade/age/school，Question 的 difficulty/status/likes 等）
    - 添加必要的索引和关系
    - _Requirements: 1.4, 1.5, 2.9, 3.6, 4.6, 5.1, 5.2, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 1.2 生成并执行数据库迁移
    - 运行 `prisma migrate dev` 创建迁移文件
    - 验证迁移脚本正确删除不必要的表和字段
    - _Requirements: 8.1, 8.2_

- [x] 2. API 端点重构
  - [x] 2.1 简化认证 API (api/auth.ts)
    - 保留密码登录端点 (action=password-login)
    - 删除其他认证相关端点
    - 实现 JWT token 生成和验证
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 2.2 编写认证 API 单元测试
    - 测试正确密码返回 token
    - 测试错误密码返回 401
    - 测试 JWT token 解析（有效、过期、格式错误）

  - [x] 2.3 重构问题 API (api/questions.ts)
    - 实现 GET 列表端点（分页、筛选、搜索）
    - 实现 POST 创建端点（输入验证：标题≤100字，内容≤500字，images≤3）
    - 实现 GET 详情端点
    - 实现 PUT 修改端点（权限检查：仅作者可修改）
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 7.1, 7.3, 7.5, 7.6_

  - [ ]* 2.4 编写问题 API 属性测试
    - **Property 2: 问题创建输入验证**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
    - **Property 3: 问题数据持久化 Round Trip**
    - **Validates: Requirements 2.6, 2.8**
    - **Property 7: 问题列表筛选正确性**
    - **Validates: Requirements 5.6, 5.7**
    - **Property 9: 问题列表排序与分页**
    - **Validates: Requirements 7.1, 7.5**
    - **Property 10: 问题搜索相关性**
    - **Validates: Requirements 7.6**

  - [x] 2.5 创建回答 API (api/answers.ts)
    - 实现 GET 列表端点（按 questionId 查询）
    - 实现 POST 创建端点（验证 content 非空）
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 2.6 编写回答 API 属性测试
    - **Property 4: 回答内容验证与持久化**
    - **Validates: Requirements 3.3, 3.5**

  - [x] 2.7 创建评论 API (api/comments.ts)
    - 实现 GET 列表端点（按 questionId 查询）
    - 实现 POST 创建端点（验证 content 非空）
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 2.8 编写评论 API 属性测试
    - **Property 5: 评论内容验证与持久化**
    - **Validates: Requirements 4.3, 4.5**

  - [x] 2.9 创建科目/考点 API (api/subjects.ts)
    - 实现 GET 科目列表端点（仅返回 enabled=true）
    - 实现 POST/PUT/DELETE 科目端点（admin 权限检查）
    - 实现 GET 考点列表端点（按 subjectKey 查询）
    - 实现 POST/PUT/DELETE 考点端点（admin 权限检查）
    - 实现删除保护逻辑（检查关联问题和考点）
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.1-10.25_

  - [ ]* 2.10 编写科目/考点 API 属性测试
    - **Property 6: 科目和考点查询完整性**
    - **Validates: Requirements 5.3, 5.4**
    - **Property 11: 科目/考点删除保护**
    - **Validates: Requirements 10.8, 10.10, 10.19, 10.21**
    - **Property 12: Admin 权限控制**
    - **Validates: Requirements 11.5**

  - [x] 2.11 重构图片上传 API (api/upload.ts)
    - 实现文件格式验证（jpg/jpeg/png/gif/webp）
    - 实现文件大小验证（≤5MB）
    - 实现 Supabase Storage 上传
    - 返回公开访问 URL
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 2.12 编写图片上传属性测试
    - **Property 8: 图片上传验证**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ]* 2.13 编写访问控制属性测试
    - **Property 1: 游客访问控制**
    - **Validates: Requirements 1.1, 1.2**

- [x] 3. Checkpoint - 确保所有 API 测试通过
  - 确保所有测试通过，如有问题请询问用户

- [x] 4. 可复用 UI 组件开发
  - [x] 4.1 创建 QuestionCard 组件
    - 显示问题标题、科目、考点、作者、创建时间
    - 支持点击跳转到详情页
    - _Requirements: 9.1, 7.3_

  - [x] 4.2 创建 QuestionDetail 组件
    - 显示问题完整内容、图片、回答列表、评论列表
    - 提供回答和评论按钮（登录用户可见）
    - _Requirements: 9.2, 7.4_

  - [x] 4.3 创建 AnswerCard 组件
    - 显示回答内容、图片、作者、创建时间
    - _Requirements: 9.3_

  - [x] 4.4 创建 CommentCard 组件
    - 显示评论内容、图片、作者、创建时间
    - _Requirements: 9.4_

  - [x] 4.5 创建 ImageUploader 组件
    - 支持多图上传（最多 3 张）
    - 客户端验证格式和大小
    - 显示上传进度和预览
    - _Requirements: 9.5, 6.1, 6.2_

  - [x] 4.6 创建 SubjectTopicSelector 组件
    - 科目下拉选择器
    - 考点下拉选择器（基于选中科目动态加载）
    - _Requirements: 9.6, 5.3, 5.4_

  - [x] 4.7 创建 QuestionFilter 组件
    - 科目筛选
    - 考点筛选
    - 搜索框
    - _Requirements: 9.7, 5.5, 5.6, 5.7, 7.6_

  - [x] 4.8 创建 ImageGallery 组件
    - 显示多张图片
    - 支持点击放大查看
    - _Requirements: 9.8, 6.5_

  - [x] 4.9 创建 SubjectManager 组件
    - 显示科目列表
    - 提供创建、编辑、删除科目功能
    - 支持选中科目查看考点
    - _Requirements: 9.9, 10.1, 10.2, 10.3, 10.6, 10.7_

  - [x] 4.10 创建 TopicManager 组件
    - 显示选中科目的考点列表
    - 提供创建、编辑、删除考点功能
    - _Requirements: 9.10, 10.11, 10.12, 10.13, 10.17, 10.18_

  - [x] 4.11 创建 SubjectForm 组件
    - 科目创建和编辑表单
    - 字段：key, name, description, order, enabled
    - _Requirements: 9.11, 10.4, 10.5, 10.6_

  - [x] 4.12 创建 TopicForm 组件
    - 考点创建和编辑表单
    - 字段：value, label, order, enabled
    - _Requirements: 9.12, 10.14, 10.15, 10.16, 10.17_

- [x] 5. 页面组件开发
  - [x] 5.1 创建 HomePage 组件
    - 集成 QuestionFilter 和 QuestionCard
    - 实现分页加载
    - _Requirements: 7.1, 7.5_

  - [x] 5.2 创建 LoginPage 组件
    - 手机号和密码输入
    - 调用认证 API
    - 保存 token 到 localStorage
    - _Requirements: 1.3_

  - [x] 5.3 创建 CreateQuestionPage 组件
    - 集成 SubjectTopicSelector 和 ImageUploader
    - 标题和内容输入（验证长度）
    - 支持创建和编辑模式
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8_

  - [x] 5.4 创建 QuestionDetailPage 组件
    - 集成 QuestionDetail, AnswerCard, CommentCard
    - 显示回答和评论按钮（登录用户）
    - _Requirements: 7.2, 7.4_

  - [x] 5.5 创建 AnswerQuestionPage 组件
    - 回答内容输入
    - 集成 ImageUploader
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 5.6 创建 AdminSubjectsPage 组件
    - 集成 SubjectManager 和 TopicManager
    - 主从布局：左侧科目列表，右侧考点列表
    - _Requirements: 10.1, 10.11, 10.22, 10.23_

- [x] 6. 路由配置
  - [x] 6.1 配置简化后的路由
    - 保留路由：/, /login, /create, /edit/:id, /question/:id, /answer/:id, /admin/subjects
    - 删除路由：/profile, /audit, /admin, /my-questions, /my-answers, /my-favorites, /notifications 等
    - 实现路由守卫（登录检查、权限检查）
    - 已删除路由重定向到首页
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 7. 错误处理和用户反馈
  - [x] 7.1 实现统一错误处理
    - 401 错误：清除 token，重定向到登录页
    - 403 错误：显示权限不足提示
    - 400 错误：在表单字段旁显示错误信息
    - 409 错误：显示关联数据说明对话框
    - 500 错误：显示通用错误提示
    - _Requirements: 10.8, 10.9, 10.10, 10.19, 10.20, 10.21_

  - [x] 7.2 实现图片上传客户端验证
    - 格式验证提示
    - 大小验证提示
    - 上传失败重试按钮
    - _Requirements: 6.1, 6.2_

- [x] 8. 清理和优化
  - [x] 8.1 删除不必要的 API 文件
    - 删除或清理 api/admin.ts, api/family.ts, api/profile.ts, api/social.ts 中的废弃端点
    - _Requirements: 8.1_

  - [x] 8.2 删除不必要的前端组件和页面
    - 删除与已删除路由相关的组件
    - _Requirements: 11.2_

  - [x] 8.3 更新类型定义
    - 创建 DTO 类型文件（UserDTO, QuestionDTO, AnswerDTO, CommentDTO, SubjectDTO, TopicDTO）
    - 删除废弃的类型定义
    - _Requirements: 9.8_

- [x] 9. Final Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

## 注意事项

- 标记 `*` 的任务为可选任务，可跳过以加快 MVP 开发
- 每个任务都引用了具体的需求编号以确保可追溯性
- Checkpoint 任务确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证具体示例和边界条件
