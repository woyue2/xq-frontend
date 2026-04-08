# 需求文档：应用简化重构

## 介绍

本项目旨在大幅简化现有的复杂教育问答应用，保留核心功能，删除所有不必要的特性。简化后的应用将专注于老师提问、回答、评论和图片上传等基本功能，同时保留科目（Subject）和考点（Topic）的分类体系。

## 术语表

- **System**: 简化后的教育问答应用
- **Teacher**: 老师用户，应用的主要使用者
- **Admin**: 管理员账号，具有与老师相同的权限
- **Question**: 问题实体，包含标题、内容、图片、科目和考点
- **Answer**: 回答实体，老师对问题的回答
- **Comment**: 评论实体，可以在问题或回答上发表
- **Subject**: 科目分类（如数学、语文、英语等）
- **Topic**: 考点分类，属于某个科目的子分类
- **Guest**: 游客用户，未登录状态，只能查看内容

## 需求

### 需求 1：用户认证与权限管理

**用户故事：** 作为系统管理员，我希望只有登录的管理员账号才能进行内容操作，以确保内容质量和安全性

#### 验收标准

1. WHEN 用户未登录，THE System SHALL 允许用户查看所有问题、回答和评论
2. WHEN 用户未登录并尝试创建或修改内容，THE System SHALL 阻止操作并提示需要登录
3. WHEN 管理员账号登录，THE System SHALL 允许该账号创建问题、回答、评论和修改问题
4. THE System SHALL 保留 User 表中的基本字段（id, phone, name, nickname, avatar, role, passwordHash, createdAt, updatedAt）
5. THE System SHALL 删除 User 表中不必要的字段（grade, age, school, expiresAt, isActive, isBanned）

### 需求 2：问题管理

**用户故事：** 作为老师，我希望能够创建、查看和修改问题，并为问题分配科目和考点，以便更好地组织教学内容

#### 验收标准

1. WHEN 老师创建问题，THE System SHALL 要求输入标题（必填，最多100字）
2. WHEN 老师创建问题，THE System SHALL 允许输入详细内容（可选，最多500字）
3. WHEN 老师创建问题，THE System SHALL 要求选择科目（必填）
4. WHEN 老师创建问题，THE System SHALL 允许选择考点（可选，基于所选科目）
5. WHEN 老师创建问题，THE System SHALL 允许上传最多3张图片
6. THE System SHALL 保存问题到 Question 表，包含字段（id, title, content, subject, tags, images, authorId, authorName, authorAvatar, createdAt, updatedAt）
7. WHEN 老师查看自己创建的问题，THE System SHALL 提供修改功能
8. WHEN 老师修改问题，THE System SHALL 允许修改标题、内容、科目、考点和图片
9. THE System SHALL 删除 Question 表中不必要的字段（difficulty, status, isGoodQuestion, isPinned, score, aiResult, likes, favorites, comments, answers, understoodCount, notUnderstoodCount）

### 需求 3：回答管理

**用户故事：** 作为老师，我希望能够回答问题，以便为学生提供解答

#### 验收标准

1. WHEN 老师查看问题详情，THE System SHALL 显示所有已有回答
2. WHEN 老师点击回答按钮，THE System SHALL 提供回答编辑界面
3. WHEN 老师创建回答，THE System SHALL 要求输入回答内容（必填）
4. WHEN 老师创建回答，THE System SHALL 允许上传图片
5. THE System SHALL 保存回答到 Answer 表，包含字段（id, questionId, content, images, authorId, authorName, authorAvatar, createdAt, updatedAt）
6. THE System SHALL 删除 Answer 表中不必要的字段（audioUrl, likes, status, aiResult, deletedAt）

### 需求 4：评论管理

**用户故事：** 作为老师，我希望能够在问题或回答上发表评论，以便进行讨论和补充说明

#### 验收标准

1. WHEN 老师查看问题或回答，THE System SHALL 显示所有已有评论
2. WHEN 老师点击评论按钮，THE System SHALL 提供评论输入界面
3. WHEN 老师创建评论，THE System SHALL 要求输入评论内容（必填）
4. WHEN 老师创建评论，THE System SHALL 允许上传一张图片（可选）
5. THE System SHALL 保存评论到 Comment 表，包含字段（id, questionId, content, image, authorId, authorName, authorAvatar, createdAt, updatedAt）
6. THE System SHALL 删除 Comment 表中不必要的字段（status, aiResult, deletedAt）

### 需求 5：科目和考点管理

**用户故事：** 作为老师，我希望使用科目和考点对问题进行分类，以便更好地组织和检索内容

#### 验收标准

1. THE System SHALL 保留 Subject 表，包含字段（id, key, name, order, enabled, description, createdAt, updatedAt）
2. THE System SHALL 保留 Topic 表，包含字段（id, subjectKey, value, label, order, enabled, createdAt, updatedAt）
3. WHEN 老师创建或修改问题，THE System SHALL 从 Subject 表加载可用科目列表
4. WHEN 老师选择科目，THE System SHALL 从 Topic 表加载该科目下的考点列表
5. THE System SHALL 在问题列表页面提供科目和考点筛选功能
6. WHEN 用户选择科目筛选，THE System SHALL 显示该科目下的所有问题
7. WHEN 用户选择考点筛选，THE System SHALL 显示该考点下的所有问题

### 需求 6：图片上传

**用户故事：** 作为老师，我希望能够上传图片到问题、回答和评论中，以便更好地展示内容

#### 验收标准

1. WHEN 老师上传图片，THE System SHALL 验证图片格式（支持 jpg, png, gif, webp）
2. WHEN 老师上传图片，THE System SHALL 验证图片大小（单张不超过5MB）
3. WHEN 图片上传成功，THE System SHALL 返回图片的访问URL
4. THE System SHALL 将图片URL保存到对应的实体（Question, Answer, Comment）
5. WHEN 用户查看内容，THE System SHALL 显示上传的图片

### 需求 7：内容展示与浏览

**用户故事：** 作为用户（包括游客），我希望能够浏览所有问题、回答和评论，以便获取信息

#### 验收标准

1. THE System SHALL 在首页显示问题列表，按创建时间倒序排列
2. WHEN 用户点击问题，THE System SHALL 显示问题详情页，包含问题内容、所有回答和评论
3. THE System SHALL 在问题列表中显示问题的标题、科目、考点、作者和创建时间
4. THE System SHALL 在问题详情页显示问题的完整内容、图片、回答列表和评论列表
5. THE System SHALL 支持分页加载问题列表
6. THE System SHALL 在问题列表页提供搜索功能，支持按标题和内容搜索

### 需求 8：数据库清理

**用户故事：** 作为开发者，我希望删除所有不必要的数据库表和字段，以简化系统架构

#### 验收标准

1. THE System SHALL 删除以下数据库表：VerificationCode, UserWhitelist, RefreshToken, LoginLog, Like, Favorite, Notification, BehaviorLog, AuditLog, QuestionDimension, QuestionDimensionOption, ParentChild, QuestionUnderstanding
2. THE System SHALL 保留以下数据库表：User, Question, Answer, Comment, Subject, Topic
3. THE System SHALL 删除 User 表中的字段：grade, age, school, expiresAt, isActive, isBanned
4. THE System SHALL 删除 Question 表中的字段：difficulty, status, isGoodQuestion, isPinned, score, aiResult, likes, favorites, comments, answers, understoodCount, notUnderstoodCount
5. THE System SHALL 删除 Answer 表中的字段：audioUrl, likes, status, aiResult, deletedAt
6. THE System SHALL 删除 Comment 表中的字段：status, aiResult, deletedAt

### 需求 9：UI组件复用

**用户故事：** 作为开发者，我希望识别并设计可复用的UI组件，以提高开发效率和代码可维护性

#### 验收标准

1. THE System SHALL 提供 QuestionCard 组件，用于在列表中显示问题摘要
2. THE System SHALL 提供 QuestionDetail 组件，用于显示问题的完整内容
3. THE System SHALL 提供 AnswerCard 组件，用于显示单个回答
4. THE System SHALL 提供 CommentCard 组件，用于显示单个评论
5. THE System SHALL 提供 ImageUploader 组件，用于处理图片上传
6. THE System SHALL 提供 SubjectTopicSelector 组件，用于选择科目和考点
7. THE System SHALL 提供 QuestionFilter 组件，用于筛选问题列表
8. FOR ALL 可复用组件，THE System SHALL 确保组件接口清晰、参数可配置

### 需求 10：科目和考点的增删改查管理

**用户故事：** 作为管理员，我希望能够在应用内直接管理科目和考点，以便灵活调整教学内容的分类体系

#### 验收标准

1. WHEN 管理员访问 /admin/subjects 路由，THE System SHALL 显示所有科目列表
2. THE System SHALL 在科目列表中显示每个科目的名称、描述、排序顺序和启用状态
3. WHEN 管理员点击"添加科目"按钮，THE System SHALL 显示科目创建表单
4. WHEN 管理员创建科目，THE System SHALL 要求输入科目名称（必填）、key（必填，唯一标识）、描述（可选）、排序顺序（必填，数字）
5. WHEN 管理员创建科目，THE System SHALL 允许设置启用/禁用状态（默认启用）
6. WHEN 管理员点击科目的"编辑"按钮，THE System SHALL 显示科目编辑表单，允许修改名称、描述、排序顺序和启用状态
7. WHEN 管理员点击科目的"删除"按钮，THE System SHALL 显示确认对话框
8. WHEN 管理员确认删除科目，THE System SHALL 检查该科目下是否有关联的问题或考点
9. IF 科目下存在关联的问题或考点，THEN THE System SHALL 阻止删除并提示管理员先处理关联数据
10. IF 科目下不存在关联数据，THEN THE System SHALL 删除该科目
11. WHEN 管理员点击某个科目，THE System SHALL 显示该科目下的所有考点列表
12. THE System SHALL 在考点列表中显示每个考点的名称、排序顺序和启用状态
13. WHEN 管理员点击"添加考点"按钮，THE System SHALL 显示考点创建表单
14. WHEN 管理员创建考点，THE System SHALL 要求输入考点名称（必填）、value（必填，唯一标识）、排序顺序（必填，数字）
15. WHEN 管理员创建考点，THE System SHALL 允许设置启用/禁用状态（默认启用）
16. WHEN 管理员创建考点，THE System SHALL 自动关联到当前选中的科目
17. WHEN 管理员点击考点的"编辑"按钮，THE System SHALL 显示考点编辑表单，允许修改名称、排序顺序和启用状态
18. WHEN 管理员点击考点的"删除"按钮，THE System SHALL 显示确认对话框
19. WHEN 管理员确认删除考点，THE System SHALL 检查该考点下是否有关联的问题
20. IF 考点下存在关联的问题，THEN THE System SHALL 阻止删除并提示管理员先处理关联数据
21. IF 考点下不存在关联数据，THEN THE System SHALL 删除该考点
22. THE System SHALL 提供 SubjectManager 组件，用于管理科目列表和操作
23. THE System SHALL 提供 TopicManager 组件，用于管理考点列表和操作
24. THE System SHALL 提供 SubjectForm 组件，用于创建和编辑科目
25. THE System SHALL 提供 TopicForm 组件，用于创建和编辑考点

### 需求 11：路由简化

**用户故事：** 作为开发者，我希望删除所有不必要的路由，只保留核心功能路由

#### 验收标准

1. THE System SHALL 保留以下路由：/ (首页), /login (登录), /create (创建问题), /edit/:id (编辑问题), /question/:id (问题详情), /answer/:id (回答问题), /admin/subjects (科目管理)
2. THE System SHALL 删除以下路由：/profile, /audit, /admin, /my-questions, /my-questions/status/:status, /good-questions, /my-answers, /my-favorites, /my-likes, /notifications, /diagnostic, /parent/questions/:childId, /student/:studentId/questions, /test
3. THE System SHALL 确保所有保留的路由功能正常
4. WHEN 用户访问已删除的路由，THE System SHALL 重定向到首页
5. WHEN 非管理员用户访问 /admin/subjects 路由，THE System SHALL 重定向到首页或显示权限不足提示

## 附加说明

### 技术栈
- 前端：React + TypeScript + Vite
- 后端：Vercel Serverless Functions
- 数据库：Supabase (PostgreSQL)
- ORM：Prisma
- UI库：Radix UI + Tailwind CSS

### 数据库设计重点

简化后保留的表结构：

1. **User** - 用户表
   - id, phone, name, nickname, avatar, role, passwordHash, createdAt, updatedAt

2. **Question** - 问题表
   - id, title, content, subject, tags, images, authorId, authorName, authorAvatar, createdAt, updatedAt

3. **Answer** - 回答表
   - id, questionId, content, images, authorId, authorName, authorAvatar, createdAt, updatedAt

4. **Comment** - 评论表
   - id, questionId, content, image, authorId, authorName, authorAvatar, createdAt, updatedAt

5. **Subject** - 科目表
   - id, key, name, order, enabled, description, createdAt, updatedAt

6. **Topic** - 考点表
   - id, subjectKey, value, label, order, enabled, createdAt, updatedAt

### 可复用UI组件清单

1. **QuestionCard** - 问题卡片（列表项）
2. **QuestionDetail** - 问题详情
3. **AnswerCard** - 回答卡片
4. **CommentCard** - 评论卡片
5. **ImageUploader** - 图片上传器
6. **SubjectTopicSelector** - 科目考点选择器
7. **QuestionFilter** - 问题筛选器
8. **ImageGallery** - 图片画廊（显示多张图片）
9. **SubjectManager** - 科目管理组件（列表、创建、编辑、删除）
10. **TopicManager** - 考点管理组件（列表、创建、编辑、删除）
11. **SubjectForm** - 科目表单组件（创建和编辑）
12. **TopicForm** - 考点表单组件（创建和编辑）
