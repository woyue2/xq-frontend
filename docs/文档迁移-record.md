# 文档迁移记录

> 版本: v1.0  
> 更新日期: 2026-02-07

---

## 迁移概览

| 原路径 | 新路径                              | 操作 | 日期       |
| ------ | ----------------------------------- | ---- | ---------- |
| -      | `docs/README.md`                    | 新建 | 2026-02-07 |
| -      | `docs/guides/文档命名规范-guide.md` | 新建 | 2026-02-07 |
| -      | `docs/文档迁移-record.md`           | 新建 | 2026-02-07 |

---

## 2026-02-07 首次整理

### 新增文件

| 文件路径                            | 说明             |
| ----------------------------------- | ---------------- |
| `docs/README.md`                    | 项目文档索引     |
| `docs/guides/文档命名规范-guide.md` | 文档命名规范说明 |
| `docs/文档迁移-record.md`           | 本变更记录文件   |

### 迁移文件

| 原路径                                            | 新路径                                        | 说明                |
| ------------------------------------------------- | --------------------------------------------- | ------------------- |
| `helloagents/wiki/api.md`                         | `docs/specs/api/后端API-spec.md`              | API 文档            |
| `helloagents/wiki/frontend-integration.md`        | `docs/specs/api/前端集成-api.md`              | 前端集成指南        |
| `helloagents/wiki/arch.md`                        | `docs/architecture/系统架构-architecture.md`  | 系统架构            |
| `helloagents/wiki/data.md`                        | `docs/architecture/数据模型-architecture.md`  | 数据模型            |
| `helloagents/wiki/mock-integration-guidelines.md` | `docs/architecture/集成指南-architecture.md`  | 集成指南            |
| `deploy/1-总结.md`                                | `docs/deployment/部署流程-deployment.md`      | 部署流程（合并）    |
| `deploy/7-上线执行计划.md`                        | `docs/deployment/部署流程-deployment.md`      | 部署流程（合并）    |
| `deploy/5-生产环境部署Checklist.md`               | `docs/deployment/部署检查-deployment.md`      | 部署检查清单        |
| `deploy/6-运维手册-值班指南.md`                   | `docs/deployment/运维手册-guide.md`           | 运维手册            |
| `deploy/判断方法论-系统日志与错误码.md`           | `docs/deployment/错误排查-guide.md`           | 错误排查指南        |
| `deploy/4-docker-compose.1c1g.yml`                | `docs/deployment/docker-compose-reference.md` | Docker Compose 参考 |
| `deprecated-doc/后端需求文档.md`                  | `docs/legacy/后端需求文档-legacy.md`          | 归档文档            |
| `deprecated-doc/后端需求文档-v2.md`               | `docs/legacy/后端需求文档v2-legacy.md`        | 归档文档            |
| `deprecated-doc/BACKEND_REQUIREMENTS.md`          | `docs/legacy/后端需求规范-legacy.md`          | 归档文档            |
| `codex-develop-doc/查看数据库的方法.md`           | `docs/guides/数据库操作-guide.md`             | 操作指南            |
| `codex-develop-doc/后端-测试用例.md`              | `docs/specs/test-case/后端-test-case.md`      | 测试用例            |
| `根目录/模块验收.md`                              | `docs/specs/acceptance/学生端-acceptance.md`  | 验收标准（拆分）    |
| `根目录/模块验收.md`                              | `docs/specs/acceptance/教师端-acceptance.md`  | 验收标准（拆分）    |
| `根目录/模块验收操作指南.md`                      | `docs/specs/acceptance/验收操作-guide.md`     | 操作指南            |

### 复制文件

| 原路径                                                  | 目标路径                                         | 说明                   |
| ------------------------------------------------------- | ------------------------------------------------ | ---------------------- |
| `helloagents/wiki/overview.md`                          | `docs/wiki/overview.md`                          | 项目概览（知识库副本） |
| `helloagents/wiki/mock-refactor-todo.md`                | `docs/wiki/mock-refactor-todo.md`                | Mock 重构任务          |
| `helloagents/wiki/backend-deployment.md`                | `docs/wiki/backend-deployment.md`                | 后端部署               |
| `helloagents/wiki/structured-programming-guidelines.md` | `docs/wiki/structured-programming-guidelines.md` | 编程规范               |
| `helloagents/wiki/modules/`                             | `docs/wiki/modules/`                             | 模块文档目录           |

---

## 2026-02-07 补充：gemini-frontend-doc 迁移

### 迁移文件

| 原路径                                             | 新路径                                           | 说明         |
| -------------------------------------------------- | ------------------------------------------------ | ------------ |
| `gemini-frontend-doc/API_INTEGRATION.md`           | `docs/specs/api/前端集成-api.md`                 | API 对接文档 |
| `gemini-frontend-doc/FRONTEND-CODING_STANDARDS.md` | `docs/guides/前端编码规范-guide.md`              | 编码规范     |
| `gemini-frontend-doc/FRONTEND_REFACTOR_PLAN.md`    | `docs/architecture/前端重构计划-architecture.md` | 重构计划     |
| `gemini-frontend-doc/FRONTEND_REQUIREMENTS.md`     | `docs/specs/前端需求-spec.md`                    | 需求规格     |
| `gemini-frontend-doc/api_review_report.md`         | `docs/specs/api/前端API审查-report.md`           | API 审查报告 |
| `gemini-frontend-doc/前端-测试用例.md`             | `docs/specs/test-case/前端-test-case.md`         | 测试用例     |
| `gemini-frontend-doc/前端API对接检查清单.md`       | `docs/guides/前端API对接检查清单-guide.md`       | 检查清单     |
| `gemini-frontend-doc/知识星球问答小程序2评审.md`   | `docs/specs/项目评审-report.md`                  | 项目评审报告 |

### 重命名文件

| 原路径                           | 新路径                                | 说明           |
| -------------------------------- | ------------------------------------- | -------------- |
| `docs/specs/api/前端集成-api.md` | `docs/specs/api/前端E2E联调-guide.md` | 避免文件名冲突 |

---

## 目录结构变更

### 变更前

```
知识星球问答小程序 4/
├── codex-develop-doc/          # 开发文档（14个文件）
├── deploy/                     # 部署文档（8个文件）
├── deprecated-doc/             # 废弃文档（3个文件）
├── gemini-frontend-doc/        # 前端文档（8个文件）
├── helloagents/                # AI知识库
│   ├── wiki/                   # 知识库文档（13个文件）
│   └── ...
└── 根目录散落文档               # 模块验收、操作指南等
```

### 变更后

```
知识星球问答小程序 4/
├── docs/                       # 统一文档入口
│   ├── README.md               # 文档索引（新建）
│   ├── 文档迁移-record.md      # 变更记录（新建）
│   ├── guides/                 # 操作指南
│   ├── specs/                  # 需求与接口文档
│   ├── architecture/           # 架构设计
│   ├── deployment/             # 部署文档
│   ├── legacy/                 # 归档文档
│   └── wiki/                   # 知识库副本
├── codex-develop-doc/          # 保留（部分已迁移）
├── deploy/                     # 可删除（已迁移）
├── deprecated-doc/             # 可删除（已迁移）
├── gemini-frontend-doc/        # 待整理
├── helloagents/                # 保留（知识库原目录）
└── 根目录散落文档               # 已迁移
```

---

## 命名规范对照

| 原文档类型 | 新文档类型后缀     | 命名示例                 |
| ---------- | ------------------ | ------------------------ |
| 接口说明   | `-spec.md`         | 后端API-spec.md          |
| 集成指南   | `-api.md`          | 前端集成-api.md          |
| 架构设计   | `-architecture.md` | 系统架构-architecture.md |
| 操作指南   | `-guide.md`        | 数据库操作-guide.md      |
| 测试用例   | `-test-case.md`    | 后端-test-case.md        |
| 验收清单   | `-acceptance.md`   | 学生端-acceptance.md     |
| 部署流程   | `-deployment.md`   | 部署流程-deployment.md   |
| 废弃文档   | `-legacy.md`       | 后端需求文档-legacy.md   |
| 记录日志   | `-record.md`       | 文档迁移-record.md       |

---

> 文档命名规范详见 [docs/guides/文档命名规范-guide.md](./guides/文档命名规范-guide.md)
