# 知识星球问答小程序 - 后端需求文档 v1.0

> **文档说明**：本文档定义了支撑前端“原生级体验”所需的数据接口与业务逻辑，基于 Node.js + Express + Prisma 架构。

---

## 1. 核心与架构 (Core Architecture)

*   **API 风格**: RESTful API，统一 JSON 响应格式（详见 CODING_STANDARDS.md）。
*   **鉴权机制**: JWT (JSON Web Token)，无状态认证。
*   **文件存储**: 阿里云 OSS (或兼容 S3 的服务)，后端仅存储文件 URL。

---

## 2. 数据库变更需求 (Database Schema Changes)

基于 v2 文档的增量修改：

### 2.1 `users` 表
*   **新增** `expires_at` (DateTime): 必须字段。用于存储学生/家长的服务有效期。
*   **新增** `whitelist_id` (String): 关联到白名单记录。

### 2.2 `questions` 表
*   **新增** `subject` (String): 枚举值 (math, physics, etc.)，需建立索引。
*   **新增** `topics` (JSON/Array): 存储考点列表，如 `["二次函数", "抛物线"]`。
*   **新增** `methods` (JSON/Array): 存储解题方法，如 `["配方法"]`。
*   **修改** `ai_result` (JSON): 改为存储结构化 JSON，而非纯文本。

### 2.3 `audit_logs` 表
*   保留原设计，增加 `ai_confidence` 字段。

---

## 3. 关键接口定义 (Key API Specifications)

### 3.1 认证 (Auth)
*   **PIN-01 登录** `POST /api/auth/login`
    *   **响应增强**：必须返回 `expiresAt` 和 `permissions` 列表。
    *   **逻辑**：登录时检查白名单，若白名单已更新有效期，需同步更新 `users` 表的 `expires_at`。

### 3.2 问题与搜索 (Questions)
*   **PIN-02 相似搜索** `GET /api/questions/search`
    *   **Params**: `q` (关键词), `subject` (可选科目)
    *   **逻辑**：使用 DB 全文检索 (Full-Text Search) 查找标题或内容匹配的记录。
    *   **性能**：响应时间需 < 200ms。
*   **PIN-03 创建问题** `POST /api/questions`
    *   **Payload**: 接收结构化的 `subject`, `topics`, `methods` 字段。
    *   **Hook**: 创建成功后，**异步**触发 AI 审核任务（不要阻塞 HTTP 响应）。

### 3.3 审核与 AI (Audit)
*   **PIN-04 AI 回调/触发** `POST /api/internal/ai-check`
    *   **功能**：由任务队列调用，将 LLM 分析结果写入 `questions.ai_result` 并更新 `status`。
    *   **规则**：
        *   Safe -> `status: approved`
        *   Unsafe -> `status: rejected` (需人工复核)

### 3.4 杂项 (Misc)
*   **PIN-05 文件上传签名** `GET /api/upload/signature`
    *   **功能**：返回 OSS 前端直传签名，避免文件经过后端服务器（节省带宽）。

---

## 4. 业务逻辑规则 (Business Rules)

### 4.1 白名单与注册
*   **严格模式**：只有在 `user_whitelist` 表中存在的手机号才能注册/登录。
*   **角色绑定**：用户的 Role 由白名单决定，用户不可自行修改。

### 4.2 课时有效期
*   **判定权**：后端是有效期的**唯一真理来源**。
*   **过期处理**：
    *   过期用户的请求（如 `POST /questions`）应直接拦截并返回 `403 Forbidden`，错误码 `MEMBER_EXPIRED`。

---

## 5. 安全性要求 (Security)

*   **Rate Limiting**: 针对 `/api/auth/send-code` 接口实施 IP + 手机号双重限流。
*   **Input Validation**: 所有写入接口必须使用 Zod 进行严格校验，拒绝非法字段。
