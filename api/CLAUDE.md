# API 层

## 父级: ../CLAUDE.md

## 成员清单

### _lib/
- `auth.ts` - JWT 鉴权中间件，提供认证和授权功能
- `prisma.ts` - Prisma 客户端单例，Vercel Serverless 专用

### 路由文件
- `admin/index.ts` - 管理员功能：审核、统计、白名单管理
- `answers/index.ts` - 回答管理：创建、获取回答列表和详情
- `auth/index.ts` - 用户认证：登录、注册
- `behavior/` - 行为分析（预留目录）
- `comments/index.ts` - 评论管理：创建、获取评论列表
- `health.ts` - 健康检查：数据库连接状态
- `interactions/index.ts` - 交互管理：点赞、收藏、理解状态
- `notifications/index.ts` - 通知管理：获取通知、标记已读
- `questions/index.ts` - 问题管理：创建、获取、删除问题
- `subjects/index.ts` - 学科管理：获取学科及考点列表
- `upload/index.ts` - 文件上传：图片上传到 Supabase Storage
- `users/index.ts` - 用户管理：个人信息、点赞列表、用户列表

## 暴露接口

### 认证相关
- `POST /auth/login` - 用户登录
- `POST /auth/register` - 用户注册

### 问题相关
- `GET /questions` - 获取问题列表
- `POST /questions` - 创建问题
- `GET /questions/detail` - 获取问题详情
- `POST /questions/delete` - 删除问题

### 回答相关
- `GET /answers` - 获取回答列表或详情
- `POST /answers` - 创建回答

### 评论相关
- `GET /comments` - 获取评论列表
- `POST /comments` - 创建评论

### 交互相关
- `POST /interactions/like` - 点赞
- `POST /interactions/unlike` - 取消点赞
- `GET /interactions/favorite` - 获取收藏列表
- `POST /interactions/favorite` - 添加收藏
- `POST /interactions/favorite/delete` - 取消收藏
- `GET /interactions/understanding` - 获取理解状态
- `POST /interactions/understanding` - 设置理解状态

### 用户相关
- `GET /users/me` - 获取当前用户信息
- `GET /users/profile` - 获取用户详细资料
- `PUT /users/profile` - 更新用户资料
- `GET /users/likes` - 获取用户点赞列表
- `GET /users/list` - 获取用户列表（管理员）

### 管理员相关
- `GET /admin/audit/pending` - 获取待审核列表
- `POST /admin/audit/approve` - 审核通过
- `POST /admin/audit/reject` - 审核拒绝
- `POST /admin/audit/ban` - 封禁内容
- `GET /admin/stats` - 获取统计数据
- `GET /admin/whitelist` - 获取白名单
- `POST /admin/whitelist` - 添加白名单
- `POST /admin/whitelist/delete` - 删除白名单

### 其他
- `GET /health` - 健康检查
- `POST /upload/image` - 图片上传
- `GET /subjects` - 获取学科列表

## 技术栈
- Node.js + TypeScript
- Vercel Serverless Functions
- Prisma ORM
- JWT 认证
- bcryptjs 密码加密
