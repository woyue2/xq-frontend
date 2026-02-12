# 前端联调 Checklist（真实后端环境）

> 假设：前端 Vite dev 跑在 5173，后端 API 在 4000。

## 一、环境准备

- [ ] 根目录 `.env`：
  - `VITE_API_BASE=/api`
  - `VITE_USE_MOCK=false`
- [ ] `vite.config.ts` 中代理已指向后端：
  - `/api` → `http://localhost:4000`
- [ ] 后端健康检查：
  - `curl http://localhost:4000/health` → HTTP 200
  - `bash scripts/backend-api-smoke.sh` → 全部 ✅

## 二、账号与基础数据

- [ ] 至少准备以下账号（可通过 `/api/internal/test-token` 或后台页面创建）：
  - 有效学生（课时未过期）
  - 课时过期学生
  - 家长
  - 教师（管理员）
- [ ] 问题列表中存在若干 `status=approved` 的问题

## 三、登录 / 注册联调

从前端登录/注册入口开始：

- [ ] 注册新学生：
  - 输入白名单手机号 → 发送验证码 → 填写昵称 → 注册成功
  - Network：`/api/auth/send-code`、`/api/auth/register` 均返回 2xx
- [ ] 登录已注册学生：
  - 输入手机号 → 发送验证码 → 登录
  - Network：`/api/auth/send-code`、`/api/auth/login` 返回 200
- [ ] 错误场景：
  - 非 11 位手机号 → 前端提示“手机号格式错误”，`send-code` 为 400 `INVALID_PHONE_FORMAT`
  - 错误验证码 → 前端提示“验证码错误或已过期”，`login` 为 400 `INVALID_CODE`
  - 非白名单手机号注册（如果 UI 支持）→ 提示“暂未开通注册权限”，`send-code type=register` 为 403 `NOT_IN_WHITELIST`

## 四、问题列表页联调

- [ ] 首屏加载：
  - Network：`GET /api/questions?page=1&pageSize=20`
  - 列表内容与响应中的 `list` 一致
- [ ] 标签筛选：
  - 切换标签 → Network 出现 `GET /api/questions?tags=...`
  - 列表内容符合筛选条件
- [ ] 好问题筛选：
  - 打开“好问题”过滤 → `GET /api/questions?isGoodQuestion=true`
  - 列表仅包含 `isGoodQuestion=true` 的问题

## 五、提问 → 审核 → 展示

1）学生提问：

- [ ] 登录有效学生账号，打开提问表单
- [ ] 提交标题 ≤100 字的问题：
  - Network：`POST /api/questions` → 201，`status=pending`
  - 页面提示“提交成功/等待审核”

2）教师审核 & 展示：

- [ ] 教师在审核列表中找到该问题
- [ ] 执行“通过审核”操作：
  - `POST /api/admin/audit/{id}/approve` → 200
- [ ] 学生侧列表刷新：
  - 新问题出现在 `GET /api/questions` 列表中
  - 详情页 `GET /api/questions/{id}` 中 `status=approved`

## 六、回答 / 评论联调

1）教师回答：

- [ ] 教师在某个问题详情页提交回答：
  - `POST /api/questions/{questionId}/answers` → 201，`status=pending`
- [ ] 教师审核通过该回答：
  - `POST /api/admin/audit/{answerId}/approve` → 200
- [ ] 学生查看详情页：
  - `GET /api/questions/{id}/answers` 中包含该回答

2）学生评论自己的问题：

- [ ] 问题作者在详情页提交评论：
  - `POST /api/questions/{questionId}/comments` → 201，`status=pending`
- [ ] 教师审核通过评论：
  - `POST /api/admin/audit/{commentId}/approve` → 200
- [ ] 刷新详情页：
  - `GET /api/questions/{id}/comments` 返回评论，前端展示

## 七、点赞 / 收藏 / 好问题点击 + 埋点

在问题详情页（学生或家长账号）：

- [ ] 点赞：
  - 第一次点击 → `POST /api/questions/{id}/like`，`isLiked=true`，点赞数 +1
  - 第二次点击 → `POST /like`，`isLiked=false`，点赞数回到原值
- [ ] 收藏：
  - 同理，`POST /favorite`，收藏数增减正确
- [ ] 状态回显：
  - 刷新详情页 → `GET /api/questions/{id}` 中 `isLiked/isFavorited` 与按钮状态一致
- [ ] 好问题埋点：
  - 点击“好问题”徽章：
    - Network：`POST /api/behavior/log`
    - body 包含 `type="click_good_question"`、`metadata.questionId` 为当前问题 ID

## 八、课时过期联调（可选）

- [ ] 准备“课时过期学生”（通过后台或 `/api/admin/class-hours/batch-update` 调整 validUntil 到过去）
- [ ] 用过期学生登录：
  - 能浏览列表/详情
  - 提问/评论按钮被禁用或点击后提示“课时已过期”
  - 若前端仍发出写请求，则返回 403 `MEMBER_EXPIRED`

## 九、全局错误提示联调

- [ ] 未登录访问受保护页面（如“我的收藏”）：
  - 自动跳转到登录页或弹出登录框
  - 若有接口请求，则 `GET /api/users/me/likes` → 401 `UNAUTHORIZED`
- [ ] Token 过期：
  - 手工构造一个过期的 accessToken 或等待登录过期
  - 访问任一受保护接口 → 401（或 TOKEN_EXPIRED），前端统一提示“登录已过期，请重新登录”并清掉本地状态

