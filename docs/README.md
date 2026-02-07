# 知识星球问答小程序 - 文档索引

> 版本: v1.0  
> 更新日期: 2026-02-07

---

## 📖 文档概览

本文档是项目所有文档的索引入口。按类型分类，便于快速查找。

---

## 📁 文档目录结构

```
docs/
├── README.md                      # 文档索引（本文档）
├── 文档迁移-record.md             # 文档迁移变更记录
├── guides/                        # 操作指南
├── specs/                         # 需求与接口文档
├── architecture/                  # 架构设计
├── deployment/                    # 部署文档
├── legacy/                        # 归档文档
└── wiki/                          # 知识库副本
```

---

## 🚀 快速开始

| 场景             | 推荐文档                                                      |
| ---------------- | ------------------------------------------------------------- |
| 新成员加入       | [快速开始-guide.md](./guides/快速开始-guide.md)               |
| 本地开发环境搭建 | [环境配置-guide.md](./guides/环境配置-guide.md)               |
| 数据库操作       | [数据库操作-guide.md](./guides/数据库操作-guide.md)           |
| 部署上线         | [部署流程-deployment.md](./deployment/部署流程-deployment.md) |

---

## 📚 操作指南 (guides/)

| 文档                                                      | 说明                       |
| --------------------------------------------------------- | -------------------------- |
| [文档命名规范-guide.md](./guides/文档命名规范-guide.md)   | 文档命名规则与类型后缀说明 |
| [快速开始-guide.md](./guides/快速开始-guide.md)           | 新成员快速上手指南         |
| [环境配置-guide.md](./guides/环境配置-guide.md)           | 开发环境配置说明           |
| [数据库操作-guide.md](./guides/数据库操作-guide.md)       | 数据库查看与操作方法       |
| [验收操作-guide.md](./specs/acceptance/验收操作-guide.md) | 模块验收操作流程           |

---

## 📋 需求与接口文档 (specs/)

### API 文档 (specs/api/)

| 文档                                           | 说明              |
| ---------------------------------------------- | ----------------- |
| [后端API-spec.md](./specs/api/后端API-spec.md) | 后端 API 接口说明 |
| [前端集成-api.md](./specs/api/前端集成-api.md) | 前端 API 集成指南 |

### 测试用例 (specs/test-case/)

| 文档                                                     | 说明         |
| -------------------------------------------------------- | ------------ |
| [后端-test-case.md](./specs/test-case/后端-test-case.md) | 后端测试用例 |
| [前端-test-case.md](./specs/test-case/前端-test-case.md) | 前端测试用例 |

### 验收标准 (specs/acceptance/)

| 文档                                                            | 说明           |
| --------------------------------------------------------------- | -------------- |
| [学生端-acceptance.md](./specs/acceptance/学生端-acceptance.md) | 学生端验收清单 |
| [教师端-acceptance.md](./specs/acceptance/教师端-acceptance.md) | 教师端验收清单 |
| [验收操作-guide.md](./specs/acceptance/验收操作-guide.md)       | 验收操作指南   |

---

## 🏗 架构设计 (architecture/)

| 文档                                                                | 说明             |
| ------------------------------------------------------------------- | ---------------- |
| [系统架构-architecture.md](./architecture/系统架构-architecture.md) | 系统整体架构设计 |
| [数据模型-architecture.md](./architecture/数据模型-architecture.md) | 数据库模型设计   |
| [集成指南-architecture.md](./architecture/集成指南-architecture.md) | 前后端集成指南   |

---

## 🚀 部署文档 (deployment/)

| 文档                                                                    | 说明                    |
| ----------------------------------------------------------------------- | ----------------------- |
| [部署流程-deployment.md](./deployment/部署流程-deployment.md)           | 完整部署流程            |
| [部署检查-deployment.md](./deployment/部署检查-deployment.md)           | 部署检查清单            |
| [运维手册-guide.md](./deployment/运维手册-guide.md)                     | 运维值班手册            |
| [错误排查-guide.md](./deployment/错误排查-guide.md)                     | 错误排查指南            |
| [docker-compose-reference.md](./deployment/docker-compose-reference.md) | Docker Compose 配置参考 |

---

## 📦 归档文档 (legacy/)

> ⚠️ 以下文档已废弃或过时，仅供参考。

| 文档                                                          | 说明               |
| ------------------------------------------------------------- | ------------------ |
| [后端需求文档-legacy.md](./legacy/后端需求文档-legacy.md)     | 后端需求文档（v1） |
| [后端需求文档v2-legacy.md](./legacy/后端需求文档v2-legacy.md) | 后端需求文档（v2） |
| [后端需求规范-legacy.md](./legacy/后端需求规范-legacy.md)     | 后端需求规范       |

---

## 📖 知识库 (wiki/)

> 本目录是 `helloagents/wiki/` 的副本，用于统一文档入口。

| 文档                                                                                | 说明          |
| ----------------------------------------------------------------------------------- | ------------- |
| [overview.md](./wiki/overview.md)                                                   | 项目概览      |
| [api.md](./wiki/api.md)                                                             | API 说明      |
| [arch.md](./wiki/arch.md)                                                           | 架构设计      |
| [data.md](./wiki/data.md)                                                           | 数据模型      |
| [frontend-integration.md](./wiki/frontend-integration.md)                           | 前端集成      |
| [mock-integration-guidelines.md](./wiki/mock-integration-guidelines.md)             | Mock 集成指南 |
| [mock-refactor-todo.md](./wiki/mock-refactor-todo.md)                               | Mock 重构任务 |
| [backend-deployment.md](./wiki/backend-deployment.md)                               | 后端部署      |
| [structured-programming-guidelines.md](./wiki/structured-programming-guidelines.md) | 编程规范      |

### 模块文档 (wiki/modules/)

| 文档                                                                            | 说明         |
| ------------------------------------------------------------------------------- | ------------ |
| [backend-answers.md](./wiki/modules/backend-answers.md)                         | 回答模块     |
| [backend-audit.md](./wiki/modules/backend-audit.md)                             | 审核模块     |
| [backend-auth.md](./wiki/modules/backend-auth.md)                               | 认证模块     |
| [backend-class-hours.md](./wiki/modules/backend-class-hours.md)                 | 课时模块     |
| [backend-deployment.md](./wiki/modules/backend-deployment.md)                   | 部署模块     |
| [backend-notifications.md](./wiki/modules/backend-notifications.md)             | 通知模块     |
| [backend-parent.md](./wiki/modules/backend-parent.md)                           | 家长模块     |
| [backend-question-dimensions.md](./wiki/modules/backend-question-dimensions.md) | 题目维度模块 |
| [backend-questions.md](./wiki/modules/backend-questions.md)                     | 问题模块     |
| [backend-section-8-9-review.md](./wiki/modules/backend-section-8-9-review.md)   | 模块评审     |
| [backend-whitelist.md](./wiki/modules/backend-whitelist.md)                     | 白名单模块   |
| [frontend-integration.md](./wiki/modules/frontend-integration.md)               | 前端集成     |

---

## 🔗 相关链接

- 项目源码：[GitHub 仓库](https://github.com/your-repo)
- 设计稿：[Figma 知识星球问答小程序](https://www.figma.com/design/YKefQxNgBrSpfSBWWHYqED/%E7%9F%A5%E8%AF%86%E6%98%9F%E7%90%83%E9%97%AE%E7%AD%94%E5%B0%8F%E7%A8%8B%E5%BA%8F)
- AI 知识库：[helloagents/](./../../helloagents/)

---

## 📝 文档更新日志

所有文档变更记录请查阅 [文档迁移-record.md](./文档迁移-record.md)。
