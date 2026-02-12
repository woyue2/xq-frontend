# 数据库操作指南

> 本文档介绍如何查看和操作知识星球问答小程序的数据库。

---

## 一、环境准备

### 1.1 启动 Docker Desktop

```bash
# 先打开 Docker Desktop
# 然后启动数据库服务
docker-compose up -d
```

### 1.2 连接数据库

连接信息：

- **主机**: localhost
- **端口**: 5432
- **数据库**: kpqa_db
- **用户名**: kpqa
- **密码**: kpqa_password

---

## 二、查看数据库的方法

### 2.1 Prisma Studio（推荐，最简单）

在 backend 目录下运行：

```bash
cd backend
npx prisma studio
```

这会打开一个浏览器 GUI，可以直观地查看和编辑所有数据。

### 2.2 命令行直接查询

使用 psql 连接数据库：

```bash
psql postgresql://kpqa:kpqa_password@localhost:5432/kpqa_db
```

或者在 backend 目录运行：

```bash
cd backend
npx prisma db push  # 同步 schema
npx prisma db seed  # 初始化种子数据
```

### 2.3 Docker 环境查看

如果你用 docker-compose 启动的：

```bash
docker exec -it <postgres_container_name> psql -U kpqa -d kpqa_db
```

---

## 三、数据库表结构

### 3.1 现有数据表

数据库包含以下表：

| 表名              | 说明                         |
| ----------------- | ---------------------------- |
| User              | 用户表（手机号、昵称、角色） |
| Question          | 问题表                       |
| Answer            | 回答表                       |
| Comment           | 评论表                       |
| UserWhitelist     | 白名单                       |
| VerificationCode  | 验证码记录                   |
| LoginLog          | 登录日志                     |
| QuestionDimension | 题目维度                     |

---

## 四、快速查看命令

### 4.1 查看所有用户

```bash
psql postgresql://kpqa:kpqa_password@localhost:5432/kpqa_db -c "SELECT * FROM \"User\";"
```

### 4.2 查看所有问题

```bash
psql postgresql://kpqa:kpqa_password@localhost:5432/kpqa_db -c "SELECT * FROM \"Question\";"
```

### 4.3 查看表结构

```bash
psql postgresql://kpqa:kpqa_password@localhost:5432/kpqa_db -c "\d \"Question\""
```

---

## 五、建议

> **建议用 Prisma Studio，最直观方便！**

---

**文档版本**: v1.0  
**更新日期**: 2026-02-07  
**来源**: codex-develop-doc/查看数据库的方法.md
