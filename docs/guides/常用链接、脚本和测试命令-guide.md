[Pattern]
place + link

---

# 项目快捷方式索引

> 本文档整理项目常用链接、脚本和测试命令，方便快速查找。

---

## 文档链接

| 说明                 | 链接                                                                   |
| -------------------- | ---------------------------------------------------------------------- |
| 前端参数配置（.env） | `# [一些参数传来这里]`                                                 |
| 前端测试目录         | `# [前端测试](./src/test)`                                             |
| 前端样式目录         | `# [前端样式](./playground/)`                                          |
| 前端集成说明         | `# [前端说明](./helloagents/wiki/frontend-integration.md)`             |
| 后端文档目录         | `# [后端很多文档](./codex-develop-doc)`                                |
| 运维文档             | `## [运维科普，整个系统运行阅读](./deploy/)`                           |
| 后端脚本目录         | `## [后端的一些script，熟悉目录](./backend/script)`                    |
| 前后端联调测试       | `# [前后端联合测试]`                                                   |
| Playwright 测试      | `## [就是playwright分析，做的脚本在上面那个e2e](./backend/playwright)` |
| 测试结果目录         | `# [和test无关，agent自己测试生成的，不用管](./test-results)`          |
| 通用脚本目录         | `# [冒烟测试，刚搭建好用的,还有其他一些小脚本](./scripts/)`            |

---

## 数据库相关

| 说明          | 链接                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 数据库配置    | `[数据库数据传输](/mnt/c/Users/Administrator/Downloads/知识星球问答小程序 4/backend/config/database-config.md)`           |
| 数据修改入口  | `[数据修改的入口，后端入门](/mnt/c/Users/Administrator/Downloads/知识星球问答小程序 4/backend/config/user-edit-guide.md)` |
| 数据库与 Mock | `[数据库和mock](./去除Mock改造清单.md)`                                                                                   |
| Mock 改造记录 | `[去除mock记录](./helloagents/wiki/modules/mock-sintegration-guidelines.md)`                                              |
| 测试账号示例  | `[提供测试账号组](backend/src/tests/integration/question.api.spec.ts)`                                                    |

---

## 多角色调试说明

> 每一个角色的每一个界面功能都符合预期之后，同时开四个客户端（1老师、1家长、2学生）验证是否符合预期。

**脚本位置：**

```bash
scripts/run-project-tests.sh
```

**脚本执行内容：**

1. **后端 Jest 全量测试**（在 `backend` 目录下执行 `npm test`）
2. **前端 Vitest 单元测试**（在项目根目录执行 `npm test`）
3. **前端 Playwright E2E 测试**（在项目根目录执行 `npx playwright test`）
4. **后端日志异常扫描**（在 `backend` 下执行 `npx tsx script/scan-error-logs.ts`，即使无日志也不会中断）

---

## 测试命令汇总

### 一、后端 Jest 测试（API / Service）

**文档位置：**

- 后端测试总览：`codex-develop-doc/后端-测试用例.md`
- 详细测试计划：`backend/backend-testing-plan.md`

**执行命令：**

```bash
# 跑全部后端测试
cd backend && npm test

# 只跑单个集成测试（示例：Auth）
cd backend && npm test -- --runTestsByPath src/tests/integration/auth.api.spec.ts

# 只跑 Question 模块集成测试
cd backend && npm test -- --runTestsByPath src/tests/integration/question.api.spec.ts
```

---

### 二、前端单元测试（Vitest）

**文档位置：**

- 前端测试用例说明：`codex-develop-doc/前端-测试用例.md`

**执行命令：**

```bash
# 跑全部前端单测
npm test
```

---

### 三、前端 E2E 测试（Playwright）

**文档位置：**

- E2E 测试计划：`tests/test-plan.md`
- 接口对接检查清单：`gemini-frontend-doc/前端API对接检查清单.md`
- 调试说明：`codex-develop-doc/因为要debug,e2e.playwright测试.md`

**执行命令：**

```bash
# 跑全部 E2E
npx playwright test

# 只跑主流程
npx playwright test ./tests/e2e/main-flow.spec.ts

# 只跑导航相关
npx playwright test ./tests/e2e/navigation-flow.spec.ts
```

---

### 四、日志异常扫描

**文档位置：**

- 日志调试与诊断说明：`codex-develop-doc/因为要debug,我让它写日志.md`
- 后端总结：`backend/summary.md`

**执行命令：**

```bash
# 扫描后端日志中的非 2xx / 错误记录
cd backend && npx tsx script/scan-error-logs.ts

# 使用其他日志文件扫描
cd backend && BACKEND_LOG_FILE=/path/to/your.log npx tsx script/scan-error-logs.ts
```

---

## 核心初始化脚本

> 以下脚本用于长期种子/初始化业务数据：

| 脚本                                         | 说明                                      |
| -------------------------------------------- | ----------------------------------------- |
| `backend/script/seed-admin.ts`               | 创建/更新管理员老师：11111111111 + 123123 |
| `backend/script/seed-multi-audio-answer.ts`  | 多段音频测试用老师 + 问题 + 回答          |
| `backend/script/seed-question-dimensions.ts` | 初始化解题方法维度及选项                  |

---

**文档更新日期：2026-02-07**
