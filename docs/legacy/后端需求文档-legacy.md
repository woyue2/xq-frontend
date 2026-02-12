# 知识星球问答小程序 - 后端需求文档

## 一、系统概述

### 1.1 应用架构

- **前端**: React + TypeScript
- **后端需求**: RESTful API 或 GraphQL
- **数据库**: PostgreSQL
- **存储**: 图片使用图床，音频存放本地，视频存放外部链接
- **AI服务**: 内容审核API接入

### 1.2 用户角色权限

| 角色     | 权限说明                                               |
| -------- | ------------------------------------------------------ |
| **学生** | 可提问、点赞、收藏、评论（自己的问题）                 |
| **家长** | 可点赞、收藏                                           |
| **教师** | 可提问、回答、录音、点赞、收藏、评论、审核、置顶、打分 |

---

## 二、数据库设计

### 2.1 核心数据表

#### **用户表 (users)**

```sql
id              VARCHAR(36) PRIMARY KEY
phone           VARCHAR(11) UNIQUE NOT NULL
nickname        VARCHAR(50) NOT NULL
avatar          VARCHAR(500)
role            ENUM('student', 'parent', 'teacher') NOT NULL
school          VARCHAR(100)
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
is_active       BOOLEAN DEFAULT TRUE
is_banned       BOOLEAN DEFAULT FALSE
```

> **备注**: 本文档为早期版本，已被 `后端需求文档-v2.md` 替代。课时管理和白名单功能请参考 v2 文档。

---

**文档版本**: v1.0  
**状态**: 已废弃（Legacy）
