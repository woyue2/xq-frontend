# 知识星球问答小程序 - 后端需求文档 v1.0

> **文档说明**: 本文档定义了支撑前端"原生级体验"所需的数据接口与业务逻辑，基于 Node.js + Express + Prisma 架构。

---

## 1. 核心与架构 (Core Architecture)

- **API 风格**: RESTful API，统一 JSON 响应格式（详见 CODING_STANDARDS.md）。
- **鉴权机制**: JWT (JSON Web Token)，无状态认证。
- **文件存储**: 阿里云 OSS (或兼容 S3 的服务)，后端仅存储文件 URL。

---

## 2. 数据库变更需求 (Database Schema Changes)

> **备注**: 本文档为早期版本，已被 `后端需求文档-v2.md` 替代。课时管理和白名单功能请参考 v2 文档。

---

**文档版本**: v1.0  
**状态**: 已废弃（Legacy）
