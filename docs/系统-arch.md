# 系统交互地图

## 一、页面层（User Interaction Layer）

### 主要页面列表

| 页面名称 | 页面路径 | 核心行为 |
|---------|---------|---------|
| LoginPage | `/login` | 登录、注册（验证码/密码）、邀请码校验 |
| HomePage | `/` | 浏览问题列表、筛选、搜索、点赞、收藏、标记理解状态 |
| CreateQuestionPage | `/create` | 创建问题（上传图片、选择科目考点） |
| QuestionDetailPage | `/question/:id` | 查看问题详情、点赞、收藏、评论、查看回答 |
| AnswerQuestionPage | `/answer/:id` | 回答问题（文字、图片、录音） |
| ProfilePage | `/profile` | 查看/编辑个人信息、绑定孩子（家长）、设置密码 |
| MyQuestionsPage | `/my-questions` | 查看我的提问、删除问题 |
| MyAnswersPage | `/my-answers` | 查看我的回答 |
| MyFavoritesPage | `/my-favorites` | 查看我的收藏 |
| MyLikesPage | `/my-likes` | 查看我的点赞 |
| NotificationsPage | `/notifications` | 查看通知中心、标记已读 |
| AuditPage | `/audit` | 审核问题/评论（通过/驳回/打分/标记好问题） |
| AdminManagementPage | `/admin` | 白名单管理、题目维度配置 |
| ParentQuestionPage | `/parent/questions/:childId` | 家长查看孩子提问 |
| StudentHistoryPage | `/student/:studentId/questions` | 老师查看学生历史提问 |
| DiagnosticPage | `/diagnostic` | 诊断功能 |
| TestApiPage | `/test` | 系统配置中心 |

---

## 二、页面 -> API 映射

### LoginPage

- **用户行为**：发送验证码
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/auth/send-code`
    - 请求参数：`{ phone: string, type: 'login' \| 'register' }`
  - **成功后**：
    - 数据写入：无
    - 页面跳转：无（停留在登录页）

- **用户行为**：登录（验证码）
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/auth/login`
    - 请求参数：`{ phone: string, code: string }`
  - **成功后**：
    - 数据写入：`Zustand`（`token`, `user`）、`localStorage`（`token`）
    - 页面跳转：`/`（HomePage）

- **用户行为**：登录（密码）
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/auth/password-login`
    - 请求参数：`{ phone: string, password: string }`
  - **成功后**：
    - 数据写入：`Zustand`（`token`, `user`）、`localStorage`（`token`）
    - 页面跳转：`/`（HomePage）

- **用户行为**：注册
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/auth/register`
    - 请求参数：`{ phone, code, name, nickname, grade?, age?, school?, role, password }`
  - **成功后**：
    - 数据写入：`Zustand`（`token`, `user`）、`localStorage`（`token`）
    - 页面跳转：`/`（HomePage）
    - 附加：家长注册后不自动绑定孩子，需在家长中心手动绑定

---

### HomePage

- **用户行为**：加载问题列表
  - **调用接口**：
    - 请求方法：`GET`
    - URL：`/questions`
    - 请求参数：`{ page, pageSize, subject, status, isGoodQuestion, tags, authorId, search }`
  - **成功后**：
    - 数据写入：`React Query` 缓存
    - 页面跳转：无

- **用户行为**：点赞问题
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/interaction/like`
    - 请求参数：`{ targetType: 'question', targetId, action: 'like' \| 'unlike' }`
  - **成功后**：
    - 数据写入：本地状态（乐观更新）
    - 页面跳转：无

- **用户行为**：收藏问题
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/interaction/favorite`
    - 请求参数：`{ questionId, action: 'favorite' \| 'unfavorite' }`
  - **成功后**：
    - 数据写入：本地状态（乐观更新）
    - 页面跳转：无

- **用户行为**：标记理解状态
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/questions/:questionId/understanding`
    - 请求参数：`{ status: 'understood' \| 'not_understood' }`
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

---

### CreateQuestionPage

- **用户行为**：上传图片
  - **调用接口**：
    - 请求方法：`GET /upload/signature`（获取签名）
    - URL：`/upload/signature?type=image`
    - 请求参数：无
  - **成功后**：
    - 数据写入：无
    - 页面跳转：无

  - **调用接口**：
    - 请求方法：`POST`（实际上传到 OSS）
    - URL：根据签名返回的 `uploadUrl`
    - 请求参数：`FormData`（文件）
  - **成功后**：
    - 数据写入：图片 URL 到本地状态
    - 页面跳转：无

- **用户行为**：提交问题
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/questions`
    - 请求参数：`{ title, content, subject, tags, images, difficulty? }`
  - **成功后**：
    - 数据写入：无（问题状态为 `pending` 待审核）
    - 页面跳转：`/question/:id`（问题详情页）

---

### QuestionDetailPage

- **用户行为**：加载问题详情
  - **调用接口**：
    - 请求方法：`GET`
    - URL：`/questions/:questionId`
    - 请求参数：无
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

- **用户行为**：加载回答列表
  - **调用接口**：
    - 请求方法：`GET`
    - URL：`/questions/:questionId/answers`
    - 请求参数：无
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

- **用户行为**：加载评论列表
  - **调用接口**：
    - 请求方法：`GET`
    - URL：`/questions/:questionId/comments`
    - 请求参数：无
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

- **用户行为**：点赞问题
  - **调用接口**：`POST /interaction/like`（同 HomePage）

- **用户行为**：收藏问题
  - **调用接口**：`POST /interaction/favorite`（同 HomePage）

- **用户行为**：提交评论
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/questions/:questionId/comments`
    - 请求参数：`{ content?, image? }`
  - **成功后**：
    - 数据写入：评论列表（乐观更新）
    - 页面跳转：无

- **用户行为**：跳转到回答页面
  - **调用接口**：无
  - **页面跳转**：`/answer/:questionId`

---

### AnswerQuestionPage

- **用户行为**：加载问题信息
  - **调用接口**：`GET /questions/:questionId`（同 QuestionDetailPage）

- **用户行为**：上传图片
  - **调用接口**：`GET /upload/signature` + 上传 OSS（同 CreateQuestionPage）

- **用户行为**：上传音频
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/upload/audio`
    - 请求参数：`multipart/form-data`（音频文件）
  - **成功后**：
    - 数据写入：音频 URL 到本地状态
    - 页面跳转：无

- **用户行为**：提交回答
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/answers/:id`（实际是 DELETE，创建回答调用的是 questionService.createAnswer）
    - 实际接口：`POST /questions/:questionId/answers`（通过 service 封装）
    - 请求参数：`{ content?, images?, audioUrl? }`
  - **成功后**：
    - 数据写入：无
    - 页面跳转：`/question/:questionId`

---

### ProfilePage

- **用户行为**：加载用户信息
  - **调用接口**：
    - 请求方法：`GET`
    - URL：`/users/me`
    - 请求参数：无
  - **成功后**：
    - 数据写入：`Zustand`（更新 user）
    - 页面跳转：无

- **用户行为**：更新个人信息
  - **调用接口**：
    - 请求方法：`PATCH`
    - URL：`/users/me`
    - 请求参数：`{ name?, nickname?, avatar?, grade?, age?, school? }`
  - **成功后**：
    - 数据写入：`Zustand`（更新 user）
    - 页面跳转：无

- **用户行为**：上传头像
  - **调用接口**：`GET /upload/signature` + 上传 OSS（type=image）
  - **成功后**：调用更新个人信息接口

- **用户行为**：设置密码
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/auth/set-password`
    - 请求参数：`{ newPassword }`
  - **成功后**：
    - 数据写入：无
    - 页面跳转：无

- **用户行为**：家长绑定孩子
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/parent/bind`
    - 请求参数：`{ childName, phone, code, school? }`
  - **成功后**：
    - 数据写入：无
    - 页面跳转：无

- **用户行为**：查看绑定的孩子列表
  - **调用接口**：
    - 请求方法：`GET`
    - URL：`/parent/children`
    - 请求参数：无
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

- **用户行为**：退出登录
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/auth/logout`
    - 请求参数：无
  - **成功后**：
    - 数据写入：清空 `Zustand`、`localStorage`
    - 页面跳转：`/login`

---

### MyQuestionsPage

- **用户行为**：加载我的问题列表
  - **调用接口**：
    - 请求方法：`GET`
    - URL：`/questions?authorId={userId}`
    - 请求参数：`{ authorId, page, pageSize, status? }`
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

- **用户行为**：删除问题
  - **调用接口**：
    - 请求方法：`DELETE`
    - URL：`/questions/:id`
    - 请求参数：无
  - **成功后**：
    - 数据写入：无（重新拉取列表）
    - 页面跳转：无

---

### MyFavoritesPage / MyLikesPage

- **用户行为**：加载收藏/点赞列表
  - **调用接口**：
    - 请求方法：`GET`
    - URL：`/users/me/favorites` 或 `/users/me/likes`
    - 请求参数：`{ page, pageSize }`
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

---

### NotificationsPage

- **用户行为**：加载通知列表
  - **调用接口**：
    - 请求方法：`GET`
    - URL：`/notifications`
    - 请求参数：`{ page, limit, unread? }`
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

- **用户行为**：标记单条通知已读
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/notifications/read`
    - 请求参数：`{ ids: string[] }`
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

- **用户行为**：标记所有通知已读
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/notifications/read-all`
    - 请求参数：无
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

- **用户行为**：点击通知跳转
  - **调用接口**：无
  - **页面跳转**：根据 `targetType` 和 `targetId` 跳转到对应页面（如问题详情）

---

### AuditPage

- **用户行为**：加载待审核问题列表
  - **调用接口**：
    - 请求方法：`GET`
    - URL：`/admin/audit/questions`（通过 auditService 封装）
    - 请求参数：`{ page, pageSize, status? }`
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

- **用户行为**：审核通过问题（可打分、标记好问题）
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/admin/audit/questions/:id/approve`
    - 请求参数：`{ score?, isGoodQuestion? }`
  - **成功后**：
    - 数据写入：本地状态（乐观更新）
    - 页面跳转：无
    - 触发：为提问者生成通知（`new_answer` 类型，如果问题已有回答）

- **用户行为**：驳回问题
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/admin/audit/questions/:id/reject`
    - 请求参数：`{ reason }`
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

- **用户行为**：加载待审核评论列表
  - **调用接口**：类似问题审核

- **用户行为**：封禁/驳回评论
  - **调用接口**：`POST /admin/audit/comments/:id/ban` 或 `/reject`

---

### AdminManagementPage

- **用户行为**：加载白名单列表
  - **调用接口**：
    - 请求方法：`GET`
    - URL：`/admin/whitelist`
    - 请求参数：`{ page, pageSize, role?, status?, search?, searchField? }`
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

- **用户行为**：添加白名单用户
  - **调用接口**：
    - 请求方法：`POST`
    - URL：`/admin/whitelist`
    - 请求参数：`{ phone, name, role, validUntil?, notes? }`
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

- **用户行为**：删除白名单用户
  - **调用接口**：
    - 请求方法：`DELETE`
    - URL：`/admin/whitelist/:id`
    - 请求参数：无
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

- **用户行为**：更新用户课时有效期
  - **调用接口**：
    - 请求方法：`PATCH`
    - URL：`/admin/whitelist/:id`
    - 请求参数：`{ validUntil }`
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

- **用户行为**：加载题目维度配置
  - **调用接口**：
    - 请求方法：`GET`
    - URL：`/admin/config/dimensions`
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

- **用户行为**：更新维度配置
  - **调用接口**：`PATCH /admin/config/dimensions/:key`

---

### ParentQuestionPage

- **用户行为**：加载孩子问题列表
  - **调用接口**：
    - 请求方法：`GET`
    - URL：`/parent/questions/:childId`
    - 请求参数：`{ page, pageSize, subject?, tags? }`
  - **成功后**：
    - 数据写入：本地状态
    - 页面跳转：无

---

### StudentHistoryPage

- **用户行为**：加载学生历史提问
  - **调用接口**：`GET /questions?authorId={studentId}`（同 MyQuestionsPage）

---

## 三、API -> 数据库映射

### 认证相关接口

#### POST `/auth/send-code`

- **操作表**：
  - `VerificationCode` 表（创建记录）
- **返回数据结构**：
```typescript
{
  phone: string;
  expireIn: number;      // 有效期（秒）
  cooldown: number;      // 发送间隔（秒）
}
```

#### POST `/auth/login`

- **操作表**：
  - `VerificationCode` 表（查询、更新 used 字段）
  - `User` 表（查询）
  - `RefreshToken` 表（创建）
  - `LoginLog` 表（创建）
- **返回数据结构**：
```typescript
{
  token: string;         // JWT Access Token
  refreshToken: string;
  user: {
    id: string;
    phone: string;
    name?: string;
    nickname: string;
    avatar?: string;
    role: 'student' | 'teacher' | 'parent';
    grade?: string;
    age?: number;
    school?: string;
  };
}
```

#### POST `/auth/register`

- **操作表**：
  - `UserWhitelist` 表（校验是否存在且有效）
  - `User` 表（创建）
  - `RefreshToken` 表（创建）
  - `LoginLog` 表（创建）
- **返回数据结构**：同登录

#### POST `/auth/password-login`

- **操作表**：
  - `User` 表（查询，验证 passwordHash）
  - `RefreshToken` 表（创建）
  - `LoginLog` 表（创建）
- **返回数据结构**：同登录

#### POST `/auth/logout`

- **操作表**：
  - `RefreshToken` 表（删除或标记 revoked）
- **返回数据结构**：无

#### GET `/auth/me`

- **操作表**：
  - `User` 表（查询）
  - `UserWhitelist` 表（关联查询有效期）
- **返回数据结构**：
```typescript
{
  id: string;
  phone: string;
  name?: string;
  nickname: string;
  avatar?: string;
  role: string;
  grade?: string;
  age?: number;
  school?: string;
  expiresAt?: DateTime;
  classHours?: {
    used: number;
    total: number;
  };
}
```

---

### 问题相关接口

#### POST `/questions`

- **操作表**：
  - `Question` 表（创建）
  - `UserWhitelist` 表（校验用户权限，通过 `requireActiveMembership` 中间件）
- **返回数据结构**：
```typescript
{
  id: string;
  title: string;
  content: string;
  status: 'pending';     // 初始状态为待审核
  aiAudit?: {
    safe: boolean;
    reason?: string;
    qualitySuggestion?: string;
  };
}
```

#### GET `/questions`

- **操作表**：
  - `Question` 表（分页查询，支持筛选）
  - `QuestionUnderstanding` 表（查询当前用户的理解状态）
- **返回数据结构**：
```typescript
{
  list: Question[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

#### GET `/questions/:questionId`

- **操作表**：
  - `Question` 表（查询单条）
- **返回数据结构**：`Question` 对象

#### DELETE `/questions/:id`

- **操作表**：
  - `Question` 表（软删除：设置 `deletedAt`，状态改为 `banned`）
  - `Answer` 表（级联软删除）
  - `Comment` 表（级联软删除）
- **返回数据结构**：无

#### POST `/questions/:questionId/like`

- **操作表**：
  - `Question` 表（更新 `likes` 计数）
  - `Like` 表（创建/删除记录）
- **返回数据结构**：
```typescript
{
  questionId: string;
  isLiked: boolean;
  likes: number;
}
```

#### POST `/questions/:questionId/favorite`

- **操作表**：
  - `Question` 表（更新 `favorites` 计数）
  - `Favorite` 表（创建/删除记录）
- **返回数据结构**：
```typescript
{
  questionId: string;
  isFavorited: boolean;
  favorites: number;
}
```

#### POST `/questions/:questionId/understanding`

- **操作表**：
  - `QuestionUnderstanding` 表（创建/更新）
  - `Question` 表（更新 `understoodCount` / `notUnderstoodCount`）
- **返回数据结构**：
```typescript
{
  questionId: string;
  status: 'understood' | 'not_understood';
  understoodCount: number;
  notUnderstoodCount: number;
}
```

---

### 回答相关接口

#### POST `/questions/:questionId/answers`（通过 answerService.create）

- **操作表**：
  - `Answer` 表（创建）
  - `Question` 表（更新 `answers` 计数）
  - `Notification` 表（如果回答自动通过，为提问者创建通知）
- **返回数据结构**：
```typescript
{
  id: string;
  questionId: string;
  content: string;
  images: string[];
  audioUrl?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  likes: number;
  status: 'pending' | 'approved' | 'rejected';
  aiAudit?: {
    safe: boolean;
    reason?: string;
  };
}
```

#### GET `/questions/:questionId/answers`

- **操作表**：
  - `Answer` 表（查询已审核通过的）
  - `Like` 表（查询当前用户点赞记录）
- **返回数据结构**：`Answer[]`

#### DELETE `/answers/:id`

- **操作表**：
  - `Answer` 表（软删除：设置 `deletedAt`，状态改为 `banned`）
  - `Question` 表（更新 `answers` 计数）
- **返回数据结构**：无

---

### 评论相关接口

#### POST `/questions/:questionId/comments`

- **操作表**：
  - `Comment` 表（创建）
  - `Question` 表（更新 `comments` 计数）
  - `Notification` 表（如果评论自动通过且非作者本人，创建通知）
- **返回数据结构**：
```typescript
{
  id: string;
  questionId: string;
  questionTitle: string;
  content: string;
  image?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: string;
  status: 'pending' | 'approved' | 'rejected';
  aiAudit?: {
    safe: boolean;
    reason?: string;
  };
}
```

#### GET `/questions/:questionId/comments`

- **操作表**：
  - `Comment` 表（查询已审核通过的）
- **返回数据结构**：`Comment[]`

#### DELETE `/comments/:id`

- **操作表**：
  - `Comment` 表（软删除：设置 `deletedAt`，状态改为 `banned`）
  - `Question` 表（更新 `comments` 计数）
- **返回数据结构**：无

---

### 通知相关接口

#### GET `/notifications`

- **操作表**：
  - `Notification` 表（分页查询）
  - `Notification` 表（统计未读数）
- **返回数据结构**：
```typescript
{
  list: Notification[];
  pagination: { page, pageSize, total, totalPages };
  unreadCount: number;
}
```

#### POST `/notifications/read`

- **操作表**：
  - `Notification` 表（批量更新 `isRead`、`readAt`）
- **返回数据结构**：
```typescript
{
  success: boolean;
  updatedCount: number;
}
```

#### POST `/notifications/read-all`

- **操作表**：同单条标记已读
- **返回数据结构**：同单条标记已读

#### DELETE `/notifications/:id`

- **操作表**：
  - `Notification` 表（删除）
- **返回数据结构**：
```typescript
{ success: boolean }
```

---

### 家长相关接口

#### POST `/parent/bind`

- **操作表**：
  - `VerificationCode` 表（验证验证码）
  - `User` 表（查询孩子账号，更新姓名/昵称/学校）
  - `ParentChild` 表（创建绑定关系）
- **返回数据结构**：`ChildInfo`

#### GET `/parent/children`

- **操作表**：
  - `ParentChild` 表（查询绑定关系）
  - `User` 表（查询孩子信息）
- **返回数据结构**：`ChildInfo[]`

#### POST `/parent/unbind`

- **操作表**：
  - `ParentChild` 表（删除绑定关系）
- **返回数据结构**：无

#### GET `/parent/questions/:childId`

- **操作表**：
  - `Question` 表（查询指定孩子已审核通过的问题）
- **返回数据结构**：同问题列表

---

### 白名单管理接口

#### GET `/admin/whitelist`

- **操作表**：
  - `UserWhitelist` 表（分页查询，支持筛选）
- **返回数据结构**：
```typescript
{
  list: WhitelistUser[];
  pagination: { page, pageSize, total, totalPages };
}
```

#### POST `/admin/whitelist`

- **操作表**：
  - `UserWhitelist` 表（创建）
- **返回数据结构**：`WhitelistUser`

#### PATCH `/admin/whitelist/:id`

- **操作表**：
  - `UserWhitelist` 表（更新有效期等）
- **返回数据结构**：`WhitelistUser`

#### DELETE `/admin/whitelist/:id`

- **操作表**：
  - `UserWhitelist` 表（软删除：设置 `deletedAt`、`deletedBy`）
- **返回数据结构**：无

---

### 审核管理接口

#### GET `/admin/audit/questions`

- **操作表**：
  - `Question` 表（查询待审核问题，包含 `aiResult`）
- **返回数据结构**：`PendingQuestion[]`

#### POST `/admin/audit/questions/:id/approve`

- **操作表**：
  - `Question` 表（更新状态为 `approved`，可设置 `score`、`isGoodQuestion`、`tags`、`difficulty`）
  - `AuditLog` 表（记录审核操作）
- **返回数据结构**：无

#### POST `/admin/audit/questions/:id/reject`

- **操作表**：
  - `Question` 表（更新状态为 `rejected`，设置 `aiResult`）
  - `AuditLog` 表（记录审核操作）
- **返回数据结构**：无

#### GET `/admin/audit/comments`

- **操作表**：
  - `Comment` 表（查询待审核评论）
- **返回数据结构**：`PendingComment[]`

#### POST `/admin/audit/comments/:id/approve`

- **操作表**：
  - `Comment` 表（更新状态为 `approved`）
  - `AuditLog` 表（记录审核操作）
- **返回数据结构**：无

#### POST `/admin/audit/comments/:id/ban`

- **操作表**：
  - `Comment` 表（更新状态为 `banned`，设置 `aiResult`）
  - `AuditLog` 表（记录审核操作）
- **返回数据结构**：无

---

### 上传接口

#### GET `/upload/signature`

- **操作表**：无（仅生成上传签名）
- **返回数据结构**：
```typescript
{
  uploadUrl: string;
  key: string;
  policy: string;
  signature: string;
  expireAt: number;
}
```

#### POST `/upload/audio`

- **操作表**：无（音频文件保存到本地 `static/audio/` 目录）
- **返回数据结构**：
```typescript
{
  audioUrl: string;  // 如：/static/audio/answer-xxx.webm
}
```

---

## 四、状态流（State Flow）

### Token 存储路径

1. **Zustand Store**（主存储）
   - Store：`useAuthStore`
   - 字段：`token`
   - 持久化：通过 `zustand/middleware` 持久化到 `localStorage`（key: `auth-storage`）

2. **localStorage**（兜底存储）
   - Key：`token`（独立键）
   - 用途：Axios 请求拦截器在 Zustand 未恢复时从 localStorage 读取

3. **请求头**
   - 每次 API 请求自动注入：`Authorization: Bearer {token}`

### User 存储路径

1. **Zustand Store**（主存储）
   - Store：`useAuthStore`
   - 字段：`user`（完整用户信息）
   - 持久化：通过 `zustand/middleware` 持久化到 `localStorage`

2. **localStorage**（持久化副本）
   - Key：`auth-storage`（包含 `user` 和 `token`）

### 页面如何判断是否登录

```typescript
// 方式1：使用 Zustand
const { user, isAuthenticated } = useAuthStore();
if (!user || !isAuthenticated) {
  // 跳转到登录页
}

// 方式2：直接检查 token
const token = localStorage.getItem('token');
if (!token) {
  // 跳转到登录页
}
```

### 页面如何根据 role 渲染

1. **权限检查**：使用 `useAuthStore()` 获取 `user.role`
2. **条件渲染**：
   ```typescript
   const { user } = useAuthStore();
   
   // 仅教师可见
   if (user?.role === 'teacher') {
     // 显示审核管理、白名单管理等入口
   }
   
   // 学生可见
   if (user?.role === 'student') {
     // 显示提问、我的提问等
   }
   
   // 家长可见
   if (user?.role === 'parent') {
     // 显示绑定孩子、查看孩子提问等
   }
   ```

3. **权限控制中间件**：
   - `authMiddleware`：所有需要登录的接口
   - `requireActiveMembership`：检查用户是否在有效期内（学生需 `expiresAt` 有效，教师永久有效）
   - `requireTeacher`：仅教师可访问的接口（如审核、白名单管理）

4. **前端权限工具**：`src/lib/permissions.ts`
   - `isMemberActive(user)`：判断用户会员状态
   - `getUserPermissions(user)`：获取用户权限列表
   - `hasPermission(user, permission)`：检查特定权限

---

## 五、关键耦合点

### 强耦合流程

1. **认证流程**（强依赖）
   - 发送验证码 → 校验白名单（注册） → 验证码校验 → 登录/注册 → 生成 Token → 写入 Zustand/localStorage
   - **同步依赖**：验证码必须通过才能登录/注册

2. **问题创建与审核流程**（强耦合）
   - 创建问题 → AI 初审 → 状态设为 `pending` → 教师审核 → 状态变更为 `approved`/`rejected` → 审核通过后生成通知（如果已有回答）
   - **同步依赖**：问题必须审核通过才能被其他用户查看和回答

3. **回答/评论与审核流程**（强耦合）
   - 教师回答 → 自动通过（`approved`）
   - 学生回答/评论 → AI 审核 → 状态 `pending` → 教师审核 → 生成通知（评论且非作者本人）
   - **同步依赖**：回答/评论必须审核通过才能展示

4. **家长绑定孩子流程**（强耦合）
   - 家长注册 → 发送绑定验证码 → 验证孩子手机号验证码 → 查询孩子账号 → 创建绑定关系 → 更新孩子信息
   - **同步依赖**：验证码必须通过才能绑定

5. **互动操作（点赞/收藏）**（强耦合）
   - 点赞/收藏 → 检查问题状态（必须 `approved`） → 操作 Like/Favorite 表 → 更新问题计数
   - **同步依赖**：只能对已审核通过的问题操作

### 可拆分流程

1. **图片上传流程**（可异步）
   - 获取上传签名 → 上传到 OSS → 返回 URL
   - 可以独立于主流程（如创建问题、回答、评论）提前准备

2. **AI 审核流程**（异步）
   - 文本/图片提交 AI 审核 → 返回结果
   - 可以异步处理，不阻塞用户操作（但结果影响展示）

3. **通知生成**（异步，可降级）
   - 审核通过/评论等事件 → 创建通知
   - 失败不影响主流程，静默容错

4. **行为日志记录**（异步，可降级）
   - 用户操作 → 记录到 `BehaviorLog` 表
   - 失败不影响主流程

### 同步强依赖

1. **Token 验证中间件**：所有受保护接口必须先验证 Token 有效性
2. **权限中间件**：`requireActiveMembership`、`requireTeacher` 在业务逻辑前执行
3. **数据库事务**：
   - 点赞/收藏：查询 → 创建/删除记录 → 更新计数（事务保证一致性）
   - 回答/评论：创建内容 → 更新问题计数（事务）
   - 删除回答/评论：软删除 → 更新问题计数（事务）
4. **验证码校验**：登录/注册/绑定前必须验证通过
5. **白名单校验**：注册时必须存在于白名单（生产环境严格模式）

---

## 六、系统交互图（可视化）

```mermaid
[页面] LoginPage
   ├── POST /auth/send-code
   │     └── 写入 VerificationCode 表
   ├── POST /auth/login
   │     ├── 查询 VerificationCode 表（验证码校验）
   │     ├── 查询 User 表
   │     ├── 写入 RefreshToken 表
   │     ├── 写入 LoginLog 表
   │     └── 返回 token
   │           ├── 存入 Zustand
   │           └── 存入 localStorage
   └── POST /auth/register
         ├── 查询 UserWhitelist 表（白名单校验）
         ├── 创建 User 表
         ├── 写入 RefreshToken 表
         ├── 写入 LoginLog 表
         └── 返回 token（同登录）

[页面] HomePage
   ├── GET /questions
   │     └── 查询 Question 表（分页、筛选）
   ├── POST /interaction/like
   │     ├── 查询 Question 表（状态校验）
   │     ├── 操作 Like 表（创建/删除）
   │     └── 更新 Question.likes 计数
   ├── POST /interaction/favorite
   │     ├── 查询 Question 表（状态校验）
   │     ├── 操作 Favorite 表（创建/删除）
   │     └── 更新 Question.favorites 计数
   └── POST /questions/:id/understanding
         ├── 操作 QuestionUnderstanding 表
         └── 更新 Question.understoodCount / notUnderstoodCount

[页面] CreateQuestionPage
   ├── GET /upload/signature?type=image
   │     └── 返回 OSS 上传参数
   ├── 上传图片到 OSS
   └── POST /questions
         ├── 校验 UserWhitelist（requireActiveMembership）
         ├── 创建 Question 表（status=pending）
         └── AI 审核（异步）
               └── 返回 aiAudit 结果

[页面] QuestionDetailPage
   ├── GET /questions/:id
   │     └── 查询 Question 表
   ├── GET /questions/:id/answers
   │     └── 查询 Answer 表（status=approved）
   ├── GET /questions/:id/comments
   │     └── 查询 Comment 表（status=approved）
   ├── POST /questions/:id/comments
   │     ├── 校验 Question 状态（必须 approved）
   │     ├── 创建 Comment 表
   │     ├── 更新 Question.comments 计数
   │     ├── AI 审核（非教师）
   │     └── 审核通过且非作者 → 创建 Notification 表
   └── 跳转 AnswerQuestionPage

[页面] AnswerQuestionPage
   ├── GET /questions/:id（同 QuestionDetailPage）
   ├── GET /upload/signature?type=image + 上传 OSS（图片）
   ├── POST /upload/audio（音频上传）
   └── POST /questions/:questionId/answers
         ├── 校验 Question 状态（必须 approved）
         ├── 创建 Answer 表
         ├── 更新 Question.answers 计数
         ├── AI 审核（非教师）
         └── 审核通过 → 创建 Notification 表（new_answer）

[页面] ProfilePage
   ├── GET /users/me
   │     ├── 查询 User 表
   │     └── 查询 UserWhitelist（课时状态）
   ├── PATCH /users/me
   │     └── 更新 User 表
   │           └── AI 审核昵称/头像（异步）
   ├── POST /auth/set-password
   │     └── 更新 User.passwordHash
   ├── POST /parent/bind（家长）
   │     ├── 验证 VerificationCode
   │     ├── 查询 User（孩子）
   │     ├── 更新 User（姓名/昵称/学校）
   │     └── 创建 ParentChild 表
   ├── GET /parent/children（家长）
   │     ├── 查询 ParentChild 表
   │     └── 查询 User（孩子信息）
   └── POST /auth/logout
         └── 删除/禁用 RefreshToken 表

[页面] MyQuestionsPage
   ├── GET /questions?authorId=:userId
   │     └── 查询 Question 表（筛选作者）
   └── DELETE /questions/:id
         ├── 软删除 Question（deletedAt, status=banned）
         └── 级联软删除 Answer/Comment 表

[页面] NotificationsPage
   ├── GET /notifications
   │     └── 查询 Notification 表（分页）
   ├── POST /notifications/read
   │     └── 批量更新 Notification.isRead, readAt
   ├── POST /notifications/read-all
   │     └── 批量更新所有未读 Notification
   └── DELETE /notifications/:id
         └── 删除 Notification 表

[页面] AuditPage（教师）
   ├── GET /admin/audit/questions
   │     └── 查询 Question 表（status=pending）
   ├── POST /admin/audit/questions/:id/approve
   │     ├── 更新 Question 表（status=approved, score, isGoodQuestion）
   │     ├── 写入 AuditLog 表
   │     └── 审核通过且有回答 → 创建 Notification 表
   ├── POST /admin/audit/questions/:id/reject
   │     ├── 更新 Question 表（status=rejected, aiResult）
   │     └── 写入 AuditLog 表
   ├── GET /admin/audit/comments（类似问题审核）
   └── POST /admin/audit/comments/:id/approve/ban

[页面] AdminManagementPage（教师）
   ├── GET /admin/whitelist
   │     └── 查询 UserWhitelist 表
   ├── POST /admin/whitelist
   │     └── 创建 UserWhitelist 表
   ├── PATCH /admin/whitelist/:id
   │     └── 更新 UserWhitelist 表（有效期）
   ├── DELETE /admin/whitelist/:id
   │     └── 软删除 UserWhitelist 表（deletedAt, deletedBy）
   └── GET/PATCH /admin/config/dimensions（题目维度配置）

[页面] ParentQuestionPage（家长）
   └── GET /parent/questions/:childId
         ├── 校验 ParentChild 绑定关系
         └── 查询 Question 表（authorId=childId, status=approved）

[页面] StudentHistoryPage（教师）
   └── GET /questions?authorId=:studentId（同 MyQuestionsPage）
```

---

## 七、核心服务职责

### AuthService（认证服务）

- 发送验证码（`sendCode`）
- 验证码登录（`login`）
- 密码登录（`passwordLogin`）
- 用户注册（`register`）
- 刷新 Token（`refreshToken`）
- 退出登录（`logout`）
- 设置密码（`setPassword`）
- 重置密码（`resetPasswordWithCode`）

### QuestionService（问题服务）

- 创建问题（`create`）
- 获取问题列表（`list`）
- 获取问题详情（`getQuestionById`）
- 删除问题（`delete`）
- 设置理解状态（`setUnderstandingStatus`）
- 上传图片（`uploadImage`）
- 上传音频（`uploadAudio`）

### AnswerService（回答服务）

- 创建回答（`create`）
- 获取问题回答列表（`listByQuestion`）
- 删除回答（`remove`）

### CommentService（评论服务）

- 创建评论（`create`）
- 获取问题评论列表（`listByQuestion`）
- 删除评论（`remove`）

### InteractionService（互动服务）

- 点赞/取消点赞（`toggleQuestionLike`）
- 收藏/取消收藏（`toggleQuestionFavorite`）
- 获取用户点赞列表（`listUserLikes`）
- 获取用户收藏列表（`listUserFavorites`）

### NotificationService（通知服务）

- 创建通知（`create`）
- 获取用户通知列表（`listForUser`）
- 获取未读数量（`getUnreadCount`）
- 标记已读（`markAsRead`）
- 标记全部已读（`markAllAsRead`）
- 删除通知（`deleteById`）

### ParentService（家长服务）

- 绑定孩子（`bindChild`）
- 获取绑定的孩子列表（`getChildren`）
- 解绑孩子（`unbindChild`）
- 获取孩子问题列表（`getChildQuestions`）

### WhitelistService（白名单服务）

- 获取白名单列表（`list`）
- 添加白名单用户（`create`）
- 更新白名单用户（`update`）
- 删除白名单用户（`remove`）

### AuditService（审核服务）

- 获取待审核问题（`getPendingQuestions`）
- 审核通过问题（`approveQuestion`）
- 驳回问题（`rejectQuestion`）
- 获取待审核评论（`getPendingComments`）
- 审核通过评论（`approveComment`）
- 封禁评论（`banComment`）

---

## 八、数据流转总结

### 认证授权流

```
用户输入手机号 → 发送验证码 → 存入 VerificationCode 表
    ↓
用户输入验证码 → 验证 VerificationCode 表
    ↓
查询 User 表 → 创建 RefreshToken → 记录 LoginLog
    ↓
生成 JWT Token → 返回给前端
    ↓
前端存入 Zustand + localStorage
    ↓
后续请求通过 Axios 拦截器自动注入 Authorization Header
    ↓
后端 authMiddleware 验证 Token → 设置 req.user
```

### 问题发布流

```
学生/教师创建问题 → 校验会员状态（UserWhitelist）
    ↓
创建 Question 记录（status=pending）
    ↓
AI 审核（aiAuditService）→ 更新 aiResult
    ↓
教师审核（AuditPage）→ 状态变更为 approved/rejected
    ↓
审核通过的问题展示在 HomePage 列表
```

### 互动流（点赞/收藏）

```
用户点击点赞/收藏 → 检查 Question.status === 'approved'
    ↓
操作 Like/Favorite 表（创建/删除）
    ↓
更新 Question 计数（likes/favorites）
    ↓
前端乐观更新 UI
```

### 通知流

```
关键事件触发（回答已通过、评论已通过等）
    ↓
创建 Notification 记录（userId, type, targetId）
    ↓
用户访问通知中心 → 查询 Notification 表
    ↓
点击通知 → 标记 isRead=true → 跳转到目标页面
```

---

## 九、状态管理架构

### Zustand Store（前端状态）

- **useAuthStore**：认证状态
  - `user`: User | null
  - `token`: string | null
  - `isAuthenticated`: boolean
  - `isActiveMember`: boolean（衍生）
  - `permissions`: Permission[]（衍生）
  - `login(user, token)`：登录时调用
  - `logout()`：退出时调用
  - `updateUser(updates)`：更新用户信息

### React Query（服务端状态缓存）

- 问题列表（`useQuestions` hook）
- 用户列表（各页面独立查询）
- 自动缓存、去重、后台刷新

### localStorage（持久化）

- `token`：独立键，Zustand 恢复失败时兜底
- `auth-storage`：Zustand 持久化存储（包含 `user` 和 `token`）

---

## 十、权限控制矩阵

| 操作 | 学生（有效期内） | 学生（过期） | 教师 | 家长 |
|-----|----------------|------------|------|------|
| 发送验证码 | ✅ | ✅ | ✅ | ✅ |
| 登录/注册 | ✅（需白名单） | ✅（需白名单） | ✅ | ✅（需白名单） |
| 创建问题 | ✅ | ❌ | ✅ | ❌ |
| 回答問題 | ❌（仅教师） | ❌ | ✅ | ❌ |
| 评论问题 | ✅（仅自己的问题） | ❌ | ✅ | ❌ |
| 点赞/收藏 | ✅（仅 approved 问题） | ✅ | ✅ | ✅（仅 approved 问题） |
| 查看通知 | ✅ | ✅ | ✅ | ✅ |
| 审核问题/评论 | ❌ | ❌ | ✅ | ❌ |
| 白名单管理 | ❌ | ❌ | ✅ | ❌ |
| 绑定孩子 | ❌ | ❌ | ❌ | ✅ |
| 查看孩子提问 | ❌ | ❌ | ✅（查看任何学生） | ✅（仅自己绑定的） |

**备注**：
- 学生权限受 `expiresAt` 限制，通过 `isMemberActive()` 判断
- 教师权限为全量权限（上帝模式）
- 家长仅查看权限，无创建内容权限

---

## 十一、关键中间件

### authMiddleware

- 验证 JWT Token
- 设置 `req.user = { id, role }`
- Token 过期返回 401

### requireActiveMembership

- 检查用户会员状态
- 学生需 `expiresAt` 有效，教师永久有效
- 无效返回 403（`CLASS_HOUR_EXPIRED`）

### requireTeacher

- 检查 `req.user.role === 'teacher'`
- 非教师返回 403（`PERMISSION_DENIED`）

---

## 十二、数据模型关联图

```
User
  ├── id (PK)
  ├── phone (unique)
  ├── name
  ├── nickname
  ├── role
  ├── expiresAt
  ├── isActive, isBanned
  └── 关系：
      ├── LoginLog[] (1:N)
      ├── UserWhitelist? (1:1)
      ├── ParentChild (as parent) (1:N)
      ├── ParentChild (as child) (1:N)
      ├── Question (as author) (1:N)
      ├── Answer (as author) (1:N)
      ├── Comment (as author) (1:N)
      ├── Like (1:N)
      ├── Favorite (1:N)
      ├── Notification (1:N)
      ├── RefreshToken (1:N)
      └── AuditLog (as auditor) (1:N)

Question
  ├── id (PK)
  ├── title, content
  ├── authorId → User.id
  ├── status (pending/approved/rejected/banned)
  ├── isGoodQuestion, isPinned
  ├── likes, favorites, comments, answers (计数器)
  └── 关系：
      ├── Comment[] (1:N)
      ├── Answer[] (1:N)
      ├── Like[] (1:N)
      ├── Favorite[] (1:N)
      ├── QuestionUnderstanding[] (1:N)
      └── AuditLog[] (1:N)

Answer
  ├── id (PK)
  ├── questionId → Question.id (cascade delete)
  ├── authorId → User.id
  ├── content, images, audioUrl
  ├── status
  └── 关系：
      └── Like[] (1:N)

Comment
  ├── id (PK)
  ├── questionId → Question.id (cascade delete)
  ├── authorId → User.id
  ├── content, image
  ├── status
  └── 关系：无

Like
  ├── id (PK)
  ├── userId → User.id
  ├── targetType ('question' | 'answer')
  ├── targetId → Question.id / Answer.id
  └── unique([userId, targetType, targetId])

Favorite
  ├── id (PK)
  ├── userId → User.id
  ├── questionId → Question.id
  └── unique([userId, questionId])

Notification
  ├── id (PK)
  ├── userId → User.id
  ├── type ('answer' | 'comment' | 'audit_result' | 'system' | 'new_answer')
  ├── title, content
  ├── targetType?, targetId?
  ├── isRead, readAt
  └── createdAt

ParentChild
  ├── id (PK)
  ├── parentId → User.id (parent)
  ├── childId → User.id (child)
  └── unique([parentId, childId])

UserWhitelist
  ├── id (PK)
  ├── phone (unique)
  ├── name, role
  ├── validUntil
  ├── isRegistered
  ├── userId → User.id? (绑定后填充)
  └── deletedAt, deletedBy

VerificationCode
  ├── id (PK)
  ├── phone
  ├── code
  ├── type ('login' | 'register' | 'bind_child' | 'reset_password')
  ├── expireAt
  ├── used, usedAt
  └── errorCount, lockedUntil

RefreshToken
  ├── id (PK)
  ├── userId → User.id
  ├── token (unique)
  ├── expiresAt
  └── revoked

LoginLog
  ├── id (PK)
  ├── userId → User.id
  ├── ip?, userAgent?
  ├── success
  └── createdAt

AuditLog
  ├── id (PK)
  ├── auditorId → User.id
  ├── targetType ('question' | 'answer' | 'comment')
  ├── targetId
  ├── action ('approve' | 'reject' | 'ban')
  ├── reason?
  └── createdAt

QuestionDimension
  ├── key (PK)
  ├── name, enabled
  ├── multiSelect, description, order
  └── QuestionDimensionOption[] (1:N)

QuestionDimensionOption
  ├── id (PK)
  ├── dimensionKey → QuestionDimension.key (cascade delete)
  ├── value, label, order
  └── enabled

QuestionUnderstanding
  ├── id (PK)
  ├── questionId → Question.id (cascade delete)
  ├── userId → User.id
  ├── status ('understood' | 'not_understood')
  └── unique([questionId, userId])
```

---

## 十三、API 响应约定

### 统一响应格式

```typescript
{
  code: number;        // 200/201/400/401/403/404/500
  message: string;     // 人类可读消息
  data?: any;          // 成功时返回的数据
  timestamp: number;   // 服务器时间戳
}
```

### 成功状态码

- `200`：成功（GET/PUT/PATCH/DELETE）
- `201`：创建成功（POST）

### 客户端错误

- `400`：参数验证失败
- `401`：未登录/Token 失效
- `403`：无权限/会员过期
- `404`：资源不存在
- `429`：请求过于频繁

---

## 十四、安全与审计

### 认证机制

- JWT Token（Access Token + Refresh Token）
- Token 有效期：Access Token 15分钟，Refresh Token 7天
- Refresh Token 存储于 `RefreshToken` 表，支持注销

### 授权机制

- 基于角色的访问控制（RBAC）
- 中间件：`authMiddleware`、`requireTeacher`、`requireActiveMembership`
- 前端权限工具：`getUserPermissions()`

### 内容审核

- AI 审核（`aiAuditService`）：文本、图片
- 教师人工审核：问题、评论、回答
- 审核日志：`AuditLog` 表记录所有审核操作

### 操作审计

- `LoginLog`：登录日志
- `BehaviorLog`：用户行为埋点（异步记录）
- `AuditLog`：审核操作日志

---

## 十五、性能与扩展性

### 缓存策略

- React Query 缓存问题列表（5分钟）
- 图片使用 CDN（OSS）
- 音频文件本地静态服务

### 分页

- 列表接口统一支持分页（`page`, `pageSize`）
- 最大 `pageSize` 限制为 100

### 异步处理

- AI 审核：异步调用，不阻塞主流程
- 通知生成：异步，失败静默容错
- 行为日志：异步，失败不影响主流程

### 数据库索引

- `User.phone`（唯一索引）
- `User.role`（索引）
- `Question.status, createdAt`（复合索引）
- `Question.isGoodQuestion`（索引）
- `Like.userId, targetType, targetId`（唯一索引）
- `Favorite.userId, questionId`（唯一索引）
- `Notification.userId, isRead`（索引）
- `ParentChild.parentId, childId`（唯一索引）

---

## 十六、错误处理

### 全局错误中间件

- 捕获所有异常，返回统一错误格式
- 生产环境隐藏敏感信息

### Axios 响应拦截器

- 401：清空 token，跳转登录页
- 403：提示无权限
- 429：提示请求频繁
- 500：提示服务器繁忙
- 其他：显示 `message` 字段

### 业务错误

- 使用 `AppError` 类抛出结构化错误
- 包含 `statusCode`、`code`、`message`、`details`、`bizCode`

---

## 十七、环境配置

### 前端环境变量

- `VITE_API_BASE`：后端 API 地址
- `VITE_APP_VERSION`：客户端版本
- `VITE_USE_MOCK`：是否启用 Mock 模式

### 后端环境变量

- `DATABASE_URL`：数据库连接
- `JWT_SECRET`：JWT 签名密钥
- `AUTH_STRICT_WHITELIST_FOR_LOGIN`：登录时是否严格校验白名单
- `OSS_UPLOAD_BASE_URL`、`OSS_UPLOAD_TOKEN`：OSS 上传配置
- `AUDIO_BASE_DIR`：音频文件存储目录

---

## 十八、部署与运维

### 数据库迁移

- 使用 Prisma Migrate 管理 schema 变更
- 迁移文件位于 `backend/prisma/migrations/`

### 日志系统

- 结构化日志（`coreLogger`）
- 记录关键操作：登录、注册、审核、错误等

### 监控

- 健康检查：`GET /health`
- API 状态映射：`backend/api-status-map.md`

---

## 十九、未来扩展方向

1. **实时通知**：WebSocket 推送新通知
2. **消息队列**：将 AI 审核、通知生成等异步任务移入消息队列（如 RabbitMQ、Redis Queue）
3. **缓存层**：引入 Redis 缓存热点数据（如问题列表、用户信息）
4. **文件存储**：支持更多音频格式、视频回答
5. **权限细化**：支持更细粒度的权限控制（如基于标签、学科）
6. **多租户**：支持多学校/机构隔离数据
7. **国际化**：多语言支持
8. **PWA**：离线支持、推送通知

---

## 文档版本

- **创建日期**：2025-02-12
- **版本**：1.0
- **维护者**：开发团队
