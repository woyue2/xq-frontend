# 技术设计: Profile 页面新增换绑手机号

## 技术方案
### 核心技术
- React 函数组件本地状态（不新增状态管理）
- 复用现有 `authService.sendCode`
- 现有后端路由 + Service 层最小新增接口

### 实现要点
- 前端：
  - Profile 页面新增“换绑手机号”按钮与 `Dialog`。
  - 新增状态：新手机号、验证码、倒计时、验证码提示文案及显示动画状态。
  - 获取验证码调用 `authService.sendCode({ type: 'change_phone' })`，成功后 2 秒慢显“本次验证码”。
  - 提交换绑调用 `userService.changePhone`，成功后更新本地 `currentUser.phone` 并关闭弹窗。
- 后端：
  - `authService.sendCode` 支持 `change_phone` 类型（复用短信验证码存储）。
  - `user-me` 路由新增 `POST /users/me/change-phone`。
  - `userService` 新增 `changePhone(userId, newPhone, code)`：校验验证码、校验手机号冲突、更新用户手机号、同步白名单手机号（存在时）。

## 安全与性能
- **安全:** 接口必须登录态访问；验证码仅可使用一次；手机号冲突时拒绝更新。
- **性能:** 新增逻辑为单次查询+更新，体量小；前端动画为轻量 CSS 过渡。

## 测试与部署
- **测试:**
  - 后端集成测试覆盖“换绑成功”和“验证码错误”核心路径。
  - 前端执行手工验证：按钮可见、弹窗结构、验证码慢显、换绑成功后手机号掩码更新。
- **部署:** 无新增依赖，无数据库结构变更。
