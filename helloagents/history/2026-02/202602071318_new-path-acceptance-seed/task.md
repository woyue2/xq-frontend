# 任务清单: 新路径验收种子脚本
目录: `helloagents/plan/202602071318_new-path-acceptance-seed/`
---
## 1. 验收种子脚本
- [√] 1.1 在 `backend/script/seed-new-path-acceptance.ts` 中实现清库逻辑，验证 why.md#需求背景
- [√] 1.2 在 `backend/script/seed-new-path-acceptance.ts` 中写入管理员账号与白名单，验证 why.md#目标
- [√] 1.3 在 `backend/script/seed-new-path-acceptance.ts` 中写入家长/学生白名单与有效期，验证 why.md#目标
## 2. 安全检查
- [√] 2.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）
## 3. 文档更新
- [√] 3.1 更新 `helloagents/wiki/modules/backend-whitelist.md`
- [√] 3.2 更新 `helloagents/CHANGELOG.md`
## 4. 测试
- [√] 4.1 建议运行脚本并确认白名单与管理员登录可用（人工验证）
