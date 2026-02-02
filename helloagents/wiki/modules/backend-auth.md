# 模块文档：后端认证与权限（backend-auth）

## 一、模块职责

- 提供统一的认证能力：验证码发送、注册、登录、Token 刷新、退出登录。
- 与白名单与课时模块协作，确保只有授权用户可以访问写操作接口。
- 为后续权限控制（如教师/管理员专属接口）提供统一的用户上下文。

## 二、主要接口

- `POST /api/auth/send-code`：按手机号和类型（登录/注册）发送验证码，内置发送频率限制与格式校验。
- `POST /api/auth/register`：根据手机号、验证码、昵称等信息创建用户；若存在白名单记录，则使用白名单中的角色与有效期。
- `POST /api/auth/login`：校验验证码并返回 `token + refreshToken + user`，并记录登录日志；后续将接入白名单与课时有效期判断。
- `POST /api/auth/refresh-token`：使用 RefreshToken 刷新访问令牌与 RefreshToken 本身，同时使旧 RefreshToken 失效。
- `POST /api/auth/logout`：基于当前访问 Token 撤销该用户所有仍然有效的 RefreshToken，实现安全退出。

## 三、与前端契约

- 前端通过 `authService.sendCode/login/register` 调用后端，所有响应均符合 `ApiResponse<T>` 结构。
- 登录与注册成功时，`data.user` 字段遵循 `src/types/index.ts` 中的 `User` 结构（包含 `role`、可选 `grade/age/school` 等）。
