[Pattern]
place + link
# [一些参数传来这里]（.env）
# [前端测试](./src/test)
# [前端样式](./playground/)
[前端说明](./helloagents/wiki/frontend-integration.md)
# [后端很多文档](./codex-develop-doc)
## [运维科普，整个系统运行阅读](./deploy/)
## [后端的一些script，熟悉目录](./backend/script)
## 
# [前后端联合测试]（./tests/e2e）
## [就是playwright分析，做的脚本在上面那个e2e](./backend/playwright) e2e可做mock也可测
## 三个角色的链路 
[和test无关，agent自己测试生成的，不用管](./test-results)
[冒烟测试，刚搭建好用的,还有其他一些小脚本](./scripts/)

[数据库数据传输](/mnt/c/Users/Administrator/Downloads/知识星球问答小程序 4/backend/config/database-config.md)
[数据修改的入口，后端入门](/mnt/c/Users/Administrator/Downloads/知识星球问答小程序 4/backend/config/user-edit-guide.md)
[数据库和mock](./去除Mock改造清单.md)
[去除mock记录]（./helloagents/wiki/modules/mock-sintegration-guidelines.md）
[提供测试账号组](backend/src/tests/integration/question.api.spec.ts)

# 每一个角色。 的每一个界面。 功能都符合预期之后。
# 同时开四个客户端 1老师1家长2学生  看是否符合预期请多角色调试。
脚本位置

  - scripts/run-project-tests.sh

  脚本内容做的事情

  1. 后端 Jest 全量测试（在 backend 目录
     下执行 npm test）
  2. 前端 Vitest 单元测试（在项目根目录
     执行 npm test）
  3. 前端 Playwright E2E 测试（在项目根
     目录执行 npx playwright test）
  4. 后端日志异常扫描（在 backend 下执行
     npx tsx script/scan-error-logs.ts，
     即使无日志也不会中断）
测试类型 → 文档位置 → 对应命令”帮你汇总。

  一、后端 Jest 测试（API / Service）

  - 文档位置
      - 后端测试总览：codex-develop-doc/
        后端-测试用例.md
      - 详细测试计划：backend/backend-
        testing-plan.md
  - 主要命令（在项目根目录执行）
      - 跑全部后端测试：cd backend &&
        npm test
      - 只跑单个集成测试（示例：Auth）：
        cd backend && npm test --
        --runTestsByPath src/tests/
        integration/auth.api.spec.ts
      - 只跑 Question 模块集成测试：cd
        backend && npm test --
        --runTestsByPath src/tests/
        integration/question.api.spec.ts

  二、前端单元测试（Vitest）

  - 文档位置
      - 前端测试用例说明：codex-develop-
        doc/前端-测试用例.md
  - 主要命令（在项目根目录执行）
      - 跑全部前端单测：npm test

  三、前端 E2E 测试（Playwright）

  - 文档位置
      - E2E 测试计划：tests/test-plan.md
      - 接口对接检查清单（配合 E2E 看接
        口是否一致）：gemini-frontend-
        doc/前端API对接检查清单.md
      - 调试说明：codex-develop-doc/因为
        要debug,e2e.playwright测试,md
  - 主要命令（在项目根目录执行）
      - 跑全部 E2E：npx playwright test
      - 只跑主流程：npx playwright
        test ./tests/e2e/main-
        flow.spec.ts
      - 只跑导航相关：npx playwright
        test ./tests/e2e/navigation-
        flow.spec.ts

  四、日志异常扫描（基于错误码/状态码）

  - 文档位置
      - 日志调试与诊断说明：codex-
        develop-doc/因为要debug.我让它写
        日志.md
      - 后端总结（包含日志/环境变量说
        明）：backend/summary.md
  - 主要命令（在项目根目录执行）
      - 扫描后端日志中的非 2xx / 错误记
        录：
          - cd backend && npx tsx
            script/scan-error-logs.ts
          - 如使用其他日志文件：cd
            backend &&
            BACKEND_LOG_FILE=/path/to/
            your.log npx tsx script/
            scan-error-logs.ts


真正用于“长期种子/初始化业务数据”的脚本只有这 3
    个：
      - backend/script/seed-admin.ts（创建/更新管理员
        老师：11111111111 + 123123）
      - backend/script/seed-multi-audio-answer.ts（多
        段音频测试用老师 + 问题 + 回答）
      - backend/script/seed-question-
        dimensions.ts（初始化解题方法维度及选项）