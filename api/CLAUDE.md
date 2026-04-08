# API 层

## 父级: ../CLAUDE.md

## 成员清单

### 辅助文件
- `_helpers.ts` - Prisma 客户端单例 + JWT 鉴权工具函数
- `config/subjects.ts` - 学科和考点配置数据

### 路由文件
- `answers.ts` - 回答管理：创建、获取回答列表和详情
- `auth.ts` - 用户认证：登录、注册、JWT 鉴权中间件
- `comments.ts` - 评论管理：创建、获取评论列表
- `questions.ts` - 问题管理：创建、获取、删除问题
- `subjects.ts` - 学科管理：获取学科及考点列表
- `upload.ts` - 文件上传：图片上传到 imgurl.org OSS（支持客户端压缩和服务端压缩）

## 暴露接口

### 认证相关
- `POST /api/auth` - 用户登录和注册（通过 action 参数区分）

### 问题相关
- `GET /api/questions` - 获取问题列表
- `POST /api/questions` - 创建问题
- `GET /api/questions?id={id}` - 获取问题详情
- `DELETE /api/questions` - 删除问题

### 回答相关
- `GET /api/answers` - 获取回答列表
- `POST /api/answers` - 创建回答

### 评论相关
- `GET /api/comments` - 获取评论列表
- `POST /api/comments` - 创建评论

### 学科相关
- `GET /api/subjects` - 获取学科列表
- `GET /api/subjects?subjectId={id}` - 获取学科的考点列表

### 文件上传
- `POST /api/upload` - 图片上传到 imgurl.org OSS（支持 10MB 文件，自动压缩到 2.8MB）

## 技术栈
- Node.js + TypeScript
- Vercel Serverless Functions
- Prisma ORM
- JWT 认证
- bcryptjs 密码加密
