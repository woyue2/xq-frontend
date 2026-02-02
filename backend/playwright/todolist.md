一、基础环境 & 健康检查

- [√] GET /health：返回 200 + status:"ok"，响应时间/稳定性检查
- [√] 确认 Prisma 迁移已执行且数据库正常（通过后续接口写入/查询间接验证）
- [ ] 日志中间件：正常记录成功请求和错误请求（当前环境无法直接观察日志）

二、认证 & 用户模块（/api/auth, /api/users/me）

- 发送验证码
  - [√] POST /api/auth/send-code 正常发送：手机号 11 位，type=login/register，返回 expireIn/cooldown
  - [√] 手机号格式错误：返回 400 + INVALID_PHONE_FORMAT
  - [√] 60 秒内重复发送：返回 429 + TOO_MANY_REQUESTS + retryAfter
  - [√]（如启用白名单）非白名单手机号：已测试，当前实现返回 403 NOT_IN_WHITELIST（行为与需求文档一致）
- 注册 / 登录
  - [√] POST /api/auth/register 正常注册学生：使用固定码 123456，返回 201 + user.role=student
  - [√] 缺少昵称：返回 400 + MISSING_REQUIRED_FIELD
  - [√] 已注册手机号重复注册：返回 409 + USER_EXISTS
  - [√] POST /api/auth/login 正常登录：返回 accessToken + refreshToken
  - [√] 未注册手机号登录：返回 404 + USER_NOT_FOUND
  - [√] 验证码错误/过期：返回 400 + INVALID_CODE
- Token 生命周期
  - [√] POST /api/auth/refresh-token 携带有效 refreshToken：返回新 token/refreshToken
  - [√] 不带 Token / 非 refresh 类型：返回 401 + TOKEN_EXPIRED/UNAUTHORIZED
  - [√] POST /api/auth/logout：退出后旧 refreshToken 刷新失败
- 当前用户信息
  - [√] GET /api/auth/me：返回用户基本信息（phone/nickname/role 等）
  - [√] GET /api/users/me：字段与注册信息、课时状态一致（包含 classHours 信息）

三、白名单 & 课时管理（/api/admin/whitelist, /api/admin/class-hours）

- 白名单 CRUD
  - [√] GET /api/admin/whitelist：分页 + 按 phone/role/isRegistered 过滤
  - [√] POST /api/admin/whitelist：创建记录，返回 201
  - [√] PATCH /api/admin/whitelist/:id：更新 validUntil，同步到用户 expiresAt（当前用例中为未绑定用户，仅验证白名单记录）
  - [√] DELETE /api/admin/whitelist/:id：软删除；无 userId 时不会禁用用户
  - [√] 普通学生/家长访问白名单接口：返回 403（无白名单管理权限）
- 课时状态 & 批量调整
  - [√] GET /api/admin/class-hours/:userId：返回 validUntil/isExpired/remainingDays
  - [√] PATCH /api/admin/class-hours/batch-update extend：批量延期，有效期向后移动
  - [√] PATCH /api/admin/class-hours/batch-update reduce：不可减到过去，失败项返回 CANNOT_REDUCE_TO_PAST

四、课时权限中间件（requireActiveMembership）

- [√] 学生课时有效：调用 POST /api/questions 等写接口成功
- [√] 学生课时过期：同样接口返回 403 + MEMBER_EXPIRED
- [√] 教师账号：不受课时限制，可写入问题/回答/评论
- [√] 家长账号：写接口（提问/评论/回答）按角色限制返回 403

五、问题/回答/评论模块（/api/questions, /api/answers, /api/comments）

- 提问（/api/questions）
  - [√] POST /api/questions 学生/教师正常提问：标题 ≤100 字，返回 201，status=pending
  - [√] 标题超长：返回 400 + TITLE_TOO_LONG
  - [√] 未登录：返回 401 + UNAUTHORIZED
  - [√] 家长提问：返回 403 + PERMISSION_DENIED
- 问题列表/详情
  - [√] GET /api/questions 默认列表：只返回 status=approved 的问题，分页信息正确
  - [√] GET /api/questions?isGoodQuestion=true：仅好问题，排序符合置顶/时间规则
  - [√] GET /api/questions?tags=tag1,tag2：标签筛选生效
  - [√] GET /api/questions/:id：返回完整字段 + likes/favorites/comments/answers
  - [√] GET /api/questions/:id 不存在：404 + QUESTION_NOT_FOUND
- 回答（/api/questions/:questionId/answers）
  - [√] 教师 POST /api/questions/:qid/answers：成功创建回答，status=pending
  - [√] 学生/家长回答：返回 403 + PERMISSION_DENIED
  - [√] GET /api/questions/:qid/answers：仅返回已审核通过的回答
  - [√] 携带 images/audioUrl 的回答字段能正确读写
- 评论（/api/questions/:questionId/comments）
  - [√] 问题作者评论自己的问题：返回 201，status=pending
  - [√] 学生评论他人问题：403 + PERMISSION_DENIED
  - [√] 家长评论：403 + PERMISSION_DENIED
  - [√] 不存在的问题 ID：404 + QUESTION_NOT_FOUND
  - [√] GET /api/questions/:qid/comments：仅返回 approved 评论，数量与问题统计字段一致

六、点赞 & 收藏模块（/api/questions/:id/like, /favorite, /api/users/me/*）

- 问题点赞
  - [√] POST /api/questions/:id/like 第一次：isLiked=true，问题 likes+1
  - [√] 同一接口第二次：isLiked=false，问题 likes-1
- 问题收藏
  - [√] POST /api/questions/:id/favorite：收藏/取消收藏，favorites 计数同步
- 用户侧列表
  - [√] GET /api/users/me/likes：返回当前用户点赞的问题列表
  - [√] GET /api/users/me/favorites：返回当前用户收藏的问题列表
  - [√] GET /api/questions/:id：isLiked/isFavorited 与当前用户状态一致

七、审核 & AI 回调（/api/admin/audit, /api/internal/ai-check）

- 审核工作流
  - [√] 教师获取待审核列表（路径以实际实现为准，如 /api/admin/audit/pending）
  - [√] 教师审核通过问题/回答/评论：pending → approved，前端列表/详情可见（本轮覆盖问题）
  - [√] 教师审核驳回：pending → rejected，并有审核备注（本轮覆盖问题）
- AI 审核
  - [√] POST /api/internal/ai-check：根据回调结果更新 aiResult/status，安全结果置为 approved（未覆盖 unsafe 分支）
- 权限保护
  - [√] 非教师访问审核接口：403
  - [√] 未授权外部调用 AI 内部回调：拒绝访问（已通过 X-Internal-Token 鉴权实现，集成测试覆盖配置开启场景）

八、文件上传 & 静态资源（/api/upload, /static/audio）

- 上传签名
  - [√] GET /api/upload/signature 图片：返回可用于上传的签名/URL
  - [√] GET /api/upload/signature 音频：仅教师可获取签名，学生/家长返回 403
- 实际上传
  - [ ] 使用图片签名上传一张图片：完成后 URL 可访问（当前环境仅验证了签名结构，未接入真实 OSS）
  - [ ] 使用音频签名上传音频：完成后可通过 /static/audio/... 访问（本地仅验证了 /static/audio/test-audio.mp3 可访问）
- 错误场景
  - [ ] 非允许类型/超限文件：返回对应错误码（如 2001:类型不支持，2002:文件过大）（当前仅对 query.type 做 INVALID_UPLOAD_TYPE 校验）

九、行为埋点（/api/behavior/log）

- 正常埋点
  - [√] POST /api/behavior/log：type=click_good_question，返回 200 + log id + receivedAt
  - [√] metadata 中 questionId/sourcePage 等字段能写入数据库
- 参数校验 & 防刷
  - [√] 缺少 type：返回 400，错误信息提示缺少必填字段
  - [√] 高频同用户上报：验证是否有限流/防刷（当前实现未做限流，连续多次上报均返回 200，可作为 BEHAVIOR-API-003 的后续优化点）
- 行为日志表
  - [√] DB 中记录包含 userId/type/timestamp/metadata，并能按条件查询

十、全局权限 & 错误码一致性

- [√] 未带 Authorization 调用受保护接口：统一 401 + UNAUTHORIZED
- [√] 使用过期/非法 JWT：401 + TOKEN_EXPIRED 或等价错误（当前实现为 UNAUTHORIZED，语义等价）
- [√] 学生/家长访问 admin 接口（白名单、审核、课时批量）：403 + 对应业务错误码（当前为 PERMISSION_DENIED）
- [√] 随机挑选几类错误，核对是否符合需求文档中错误码规范（已验证手机号格式错误等场景）

十一、前后端联调（通过 Playwright/浏览器流程）

- 登录 / 注册流程
  - [×] 从输入手机号 → 获取验证码 → 注册/登录，全链路走真实后端
- 主要业务流程
  - [×] 列表页：加载 /api/questions，分页和筛选在 UI 中正常工作
  - [×] 提问 → 审核 → 展示：在前端发起提问，审核通过后列表/详情可见
  - [×] 回答/评论：教师回答、作者评论能从前端打通到后端并正确展示
  - [×] 点赞/收藏/好问题点击：前端交互后，后端计数/埋点记录均正确
