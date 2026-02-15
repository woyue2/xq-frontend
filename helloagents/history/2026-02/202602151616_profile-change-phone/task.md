# 任务清单: Profile 页面新增换绑手机号

目录: `helloagents/plan/202602151616_profile-change-phone/`

---

## 1. 后端换绑能力
- [√] 1.1 在 `backend/src/services/auth.service.ts` 中扩展验证码类型支持 `change_phone`，验证 why.md#需求-用户换绑手机号-场景-验证成功换绑
- [√] 1.2 在 `backend/src/services/user.service.ts` 中实现 `changePhone` 方法并完成验证码/冲突校验，验证 why.md#需求-用户换绑手机号-场景-验证成功换绑，依赖任务1.1
- [√] 1.3 在 `backend/src/routes/user-me.routes.ts` 中新增 `POST /api/users/me/change-phone`，验证 why.md#需求-用户换绑手机号-场景-验证成功换绑，依赖任务1.2

## 2. 前端 Profile 交互
- [√] 2.1 在 `src/types/api.ts` 与 `src/services/api.ts` 中增加换绑所需类型与接口调用，验证 why.md#需求-用户换绑手机号-场景-验证成功换绑
- [√] 2.2 在 `src/pages/ProfilePage.tsx` 中新增换绑按钮与弹窗，并实现验证码延迟 2 秒缓慢显示，验证 why.md#需求-获取验证码展示优化-场景-获取验证码成功，依赖任务2.1

## 3. 测试
- [√] 3.1 在 `backend/src/tests/integration/user-me-profile.api.spec.ts` 中新增换绑用例（成功+验证码错误），验证 why.md#需求-用户换绑手机号-场景-验证成功换绑

## 4. 安全检查
- [√] 4.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 5. 文档更新
- [√] 5.1 更新 `helloagents/CHANGELOG.md`
- [√] 5.2 更新 `helloagents/wiki/modules/frontend-integration.md`

## 6. 收尾
- [√] 6.1 一致性审计并迁移方案包至 `helloagents/history/YYYY-MM/`
