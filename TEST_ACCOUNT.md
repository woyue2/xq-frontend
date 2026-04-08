# 测试账号信息

## 当前测试账号

### 管理员老师账号（Admin Teacher）

```
手机号：13800000001
密码：  admin123
角色：  admin
昵称：  管理员老师
```

## 账号权限

此账号具有以下权限：

### 1. 管理员权限
- ✅ 访问管理后台 (`/admin/subjects`)
- ✅ 管理科目和主题
- ✅ 添加/编辑/删除科目
- ✅ 添加/编辑/删除主题

### 2. 教师权限（内容创建）
- ✅ 创建问题 (`/create`)
- ✅ 回答问题 (`/answer/:id`)
- ✅ 编辑自己的问题 (`/edit/:id`)
- ✅ 发表评论
- ✅ 查看所有内容

### 3. 通用权限
- ✅ 浏览首页问题列表 (`/`)
- ✅ 查看问题详情 (`/question/:id`)
- ✅ 搜索和筛选问题

## 测试数据

数据库已预置以下测试数据：

### 科目（Subjects）
1. 数学 (math)
2. 语文 (chinese)

### 主题（Topics）
- 数学：
  - 代数 (algebra)
  - 几何 (geometry)
- 语文：
  - 阅读理解 (reading)

### 问题（Questions）
1. "如何解一元二次方程？"（数学 - 代数）
2. "三角形面积公式"（数学 - 几何）

### 答案（Answers）
- 问题1的答案："一元二次方程的解法有：1. 因式分解法 2. 配方法 3. 公式法"

### 评论（Comments）
- 问题1的评论："这个问题很有价值"

## 如何重置测试数据

如果需要重置数据库到初始状态，运行：

```bash
npm run db:seed
```

这将：
1. 清空所有现有数据
2. 重新创建测试账号
3. 重新创建测试数据（科目、主题、问题、答案、评论）

## 登录测试

### 方式1：通过 UI 登录
1. 访问 `http://localhost:3000/login`
2. 输入手机号：`13800000001`
3. 输入密码：`admin123`
4. 点击登录

### 方式2：通过 API 测试
```bash
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800000001",
    "password": "admin123"
  }'
```

## 功能测试路径

### 测试管理员功能
1. 登录后访问：`http://localhost:3000/admin/subjects`
2. 尝试添加新科目
3. 尝试添加新主题

### 测试教师功能
1. 登录后访问：`http://localhost:3000/create`
2. 创建新问题
3. 访问问题详情页
4. 点击"回答问题"按钮

### 测试缓存功能
1. 访问首页
2. 点击进入任意问题详情页
3. 点击浏览器返回按钮
4. 观察首页是否立即显示（应该 0ms，从缓存加载）

## 注意事项

1. **单一角色系统**：当前系统中，用户只能有一个角色（admin/teacher/student/parent）
2. **Admin 即 Teacher**：Admin 角色包含了所有 Teacher 的权限，可以创建内容
3. **密码加密**：密码使用 bcrypt 加密存储（10 rounds）
4. **JWT 认证**：登录后会获得 JWT token，存储在 localStorage

## 相关文件

- 种子脚本：`prisma/seed.test.ts`
- 数据库模型：`prisma/schema.prisma`
- 认证 API：`api/auth.ts`
- 登录页面：`src/pages/LoginPage.tsx`

---

生成时间: 2026-04-09
