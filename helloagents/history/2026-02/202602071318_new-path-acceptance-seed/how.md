# 技术设计: 新路径验收种子脚本

## 技术方案
- 新增 `backend/script/seed-new-path-acceptance.ts`
- 使用 Prisma 连接数据库，运行前执行 `TRUNCATE ... CASCADE` 清理所有业务表
- 创建管理员用户（角色 teacher）并写入管理员白名单（已注册）
- 写入家长/学生白名单（未注册，30天有效期）

## 风险与规避
- 清库为破坏性操作：仅限验收/测试环境使用，脚本内明确执行顺序
- 角色与白名单字段按现有 schema 与 auth 逻辑填写，避免注册流程异常
