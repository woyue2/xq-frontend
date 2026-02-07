# 知识星球问答小程序 - 后端需求文档 v2.0

> **更新日期**: 2026-02-01  
> **版本**: v2.1  
> **主要更新**: 新增课时管理系统、学生注册年级年龄学校字段、完善权限过期降级逻辑

---

## 📋 版本更新记录

### v2.1 (2026-02-01)

- ✅ 新增课时管理系统（学生和家长权限过期时间）
- ✅ 新增学生注册年级、年龄与学校字段
- ✅ 新增课时过期后权限降级为只读逻辑
- ✅ 完善白名单管理功能（课时有效期设置）

---

## 一、系统概述

### 1.1 应用架构

- **前端**: React + TypeScript
- **后端需求**: RESTful API 或 GraphQL
- **数据库**: 关系型数据库 (MySQL/PostgreSQL) 或 NoSQL (MongoDB)
- **存储**: OSS 对象存储（图片、音频文件）
- **AI服务**: 内容审核API接入

### 1.2 用户角色权限

| 角色                 | 权限说明                                                                         |
| -------------------- | -------------------------------------------------------------------------------- |
| **学生（有效期内）** | 可提问、点赞、收藏、评论（自己的问题）                                           |
| **学生（已过期）**   | 仅可浏览、点赞、收藏（权限降级为家长模式）                                       |
| **家长**             | 可浏览、点赞、收藏（只读权限）                                                   |
| **教师/管理员**      | 可提问、回答、录音、点赞、收藏、评论、审核、置顶、打分、管理用户白名单、管理课时 |

---

## 二、数据库设计

### 2.1 核心数据表

#### **用户白名单表 (user_whitelist)** ⭐新增

```sql
id              VARCHAR(36) PRIMARY KEY
phone           VARCHAR(11) UNIQUE NOT NULL
name            VARCHAR(50) NOT NULL        -- 真实姓名
role            ENUM('student', 'parent', 'teacher') NOT NULL
is_registered   BOOLEAN DEFAULT FALSE       -- 是否已注册
user_id         VARCHAR(36) NULL (FK users.id)  -- 关联的用户ID
created_by      VARCHAR(36) NOT NULL (FK users.id)  -- 添加人
created_at      TIMESTAMP DEFAULT NOW()
registered_at   TIMESTAMP                   -- 注册时间
notes           TEXT                        -- 备注信息
valid_until     TIMESTAMP                   -- 课时有效期
```

#### **白名单操作日志表 (whitelist_logs)** ⭐新增

```sql
id              VARCHAR(36) PRIMARY KEY
operator_id     VARCHAR(36) NOT NULL (FK users.id)
whitelist_id    VARCHAR(36) NOT NULL (FK user_whitelist.id)
action          ENUM('add', 'remove') NOT NULL
reason          TEXT
created_at      TIMESTAMP DEFAULT NOW()
```

---

## 三、API接口设计

### 3.1 认证相关 (Auth)

#### **1. 发送验证码**

```
POST /api/auth/send-code
请求体: { phone: string }
响应: { success: boolean, message: string }
```

#### **2. 验证手机号是否在白名单** ⭐新增

```
POST /api/auth/check-whitelist
请求体: { phone: string }
响应: {
  inWhitelist: boolean,
  role?: string,
  name?: string,
  message: string
}
```

#### **3. 登录**

```
POST /api/auth/login
请求体: { phone: string, code: string }
响应: {
  token: string,
  user: {
    id, nickname, avatar, role, phone, school
  }
}
```

---

### 3.2 用户白名单管理 (Whitelist) ⭐新增模块

#### **38. 获取白名单列表**

```
GET /api/admin/whitelist?page=1&limit=20&search=&role=all&status=all
请求头: Authorization: Bearer {token}
权限: 教师/管理员
```

#### **39. 添加用户到白名单**

```
POST /api/admin/whitelist
请求头: Authorization: Bearer {token}
请求体: {
  phone: string,
  name: string,
  role: 'student' | 'teacher' | 'parent',
  notes?: string
}
权限: 教师/管理员
```

---

## 四、功能需求细分

### 4.1 学生端功能

#### **A. 登录/注册页面**

1. ✅ 发送手机验证码
2. ✅ 验证手机号合法性
3. ✅ **验证手机号是否在白名单中** ⭐新增
4. ✅ 创建学生账号（基于白名单角色）
5. ✅ 登录并获取 JWT Token

#### **B. 问答首页**

1. ✅ 获取问题列表（分页、排序）
2. ✅ 点赞/取消点赞问题
3. ✅ 收藏/取消收藏问题
4. ✅ 查看问题详情（跳转）

---

### 4.2 家长端功能 ⭐新增完整说明

家长端采用 **只读模式**，主要用于查看和浏览内容。

| 功能     | 学生           | 家长 | 教师         |
| -------- | -------------- | ---- | ------------ |
| 浏览问题 | ✅             | ✅   | ✅           |
| 点赞问题 | ✅             | ✅   | ✅           |
| 收藏问题 | ✅             | ✅   | ✅           |
| 提问     | ✅             | ❌   | ✅           |
| 回答     | ❌             | ❌   | ✅           |
| 评论     | ✅(自己的问题) | ❌   | ✅(所有问题) |

---

### 4.3 教师/管理员端功能

#### **A. 审核管理页（教师专属）**

1. ✅ 查看待审核问题列表
2. ✅ 查看待审核评论列表
3. ✅ 审核通过问题/评论
4. ✅ 审核驳回（填写原因）
5. ✅ 标记"好问题"
6. ✅ 给问题打分（1-5分）

#### **B. 用户白名单管理页（管理员专属）** ⭐新增

1. ✅ 查看白名单用户列表
2. ✅ 搜索用户（手机号/姓名）
3. ✅ 筛选用户（角色/状态）
4. ✅ 添加用户到白名单
5. ✅ 从白名单移除用户
6. ✅ 查看统计数据（总数、已注册、待注册）

---

## 五、核心业务逻辑

### 5.1 白名单注册流程 ⭐新增

#### **完整注册流程：**

1. 用户输入手机号
2. 前端调用 /api/auth/check-whitelist
3. 如果在白名单，发送验证码
4. 用户输入验证码，点击注册
5. 后端验证白名单，创建用户记录
6. 注册成功，返回Token

---

### 5.2 审核流程

#### **AI初筛 + 人工审核双重机制**

1. 用户提交内容（问题/回答/评论）
2. 后端调用AI内容审核API
3. 内容状态设为 'pending'（待审核）
4. 教师在审核管理页查看并决策
5. 前端仅显示 status = 'approved' 的内容

---

## 六、安全性要求

### 6.1 认证与授权

1. ✅ JWT Token 认证
2. ✅ Token过期时间设置（7天）
3. ✅ 角色权限验证中间件
4. ✅ **白名单验证机制** ⭐新增

### 6.2 内容安全

1. ✅ AI内容审核（接入阿里云、腾讯云等）
2. ✅ 敏感词过滤
3. ✅ 图片鉴黄
4. ✅ 音频违规检测

---

## 七、部署与运维

### 7.1 服务器配置

- **应用服务器**: 2核4G起步（支持并发500+）
- **数据库服务器**: 4核8G（MySQL/PostgreSQL）
- **Redis服务器**: 2核4G

---

**文档版本**: v2.0  
**最后更新**: 2026-02-01  
**状态**: 已废弃（Legacy）- 建议参考 helloagents/wiki/ 中的最新文档
