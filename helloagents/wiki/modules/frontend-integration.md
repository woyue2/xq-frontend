## 前端关键业务与后端真实接入（frontend-integration）

> 范围：本模块记录“知识星球问答小程序”前端在提问/回答/评论、图片上传以及点赞/收藏等关键业务与后端真实服务的对接情况，当前阶段主要完成图片压缩上传与部分互动能力接入。

### 一、模块划分与依赖

- **数据访问层（services）**
  - `src/services/api.ts`
    - `questionService.createQuestion(payload)`：调用 `POST /api/questions` 创建问题，成功后返回问题基础信息（含 `id`）。
    - `questionService.uploadImage(file)`：封装“压缩 → 获取签名 → 直传 + URL 拼装”逻辑，仅对外返回 `{ imageUrl }`。
    - `interactionService.like(payload)`：调用 `POST /api/interactions/like`，在后端切换问题的点赞状态。
    - `interactionService.favorite(payload)`：调用 `POST /api/interactions/favorite`，在后端切换问题的收藏状态。
    - `behaviorService.log(type, metadata?)`：调用 `POST /api/behavior/log` 记录埋点事件（本轮用于点赞/收藏行为）。

- **页面与业务模块**
  - `src/pages/CreateQuestionPage.tsx`
    - 使用 `questionService.createQuestion` 进行提问提交；
    - 使用 `questionService.uploadImage` 完成提问图片的压缩与上传（三张上限）。
  - `src/pages/QuestionDetailPage.tsx`
    - 优先从 `useQuestions` 的列表缓存中读取问题（兼容现有单元测试与 Mock 数据）；
    - 当列表中不存在时，调用 `questionService.getQuestionById(id)` 通过后端 `GET /api/questions/:id` 拉取详情，保证“提问后立即跳转详情页”场景可用（即使问题仍为 pending 状态）；
    - 使用 `interactionService.like/favorite` 实现点赞/收藏的真实调用；
    - 使用 `behaviorService.log` 记录点赞/收藏行为。

### 二、图片压缩与上传流程

- **压缩工具**
  - 文件：`src/lib/image-compress.ts`
  - 核心函数：`compressImage(file, options?) => Promise<File>`
    - 统一输出 `image/jpeg`；
    - 默认最大宽高 `1600x1600`，默认体积上限 `1MB`；
    - 通过 Canvas 按比例缩放，并在 `initialQuality` 到 `minQuality` 范围内递减质量直至满足大小限制或给出明确报错。

- **上传编排**
  - 调用链：`CreateQuestionPage` → `questionService.uploadImage` → `compressImage` + `GET /api/upload/signature` + `fetch(uploadUrl)`。
  - MOCK 模式：
    - 由 Axios Mock 拦截 `/upload/signature` 返回模拟签名；
    - `uploadImage` 直接基于 `uploadUrl` + `key` 构造稳定图片 URL，不发起真实网络请求。
  - 真实模式：
    - 使用 `compressImage` 压缩文件；
    - 调用 `GET /api/upload/signature?type=image` 获取上传签名；
    - 使用 `fetch(uploadUrl)` + `FormData(key, policy, signature, file)` 直传；
    - 通过 `uploadUrl.replace(/\/upload$/, '') + '/' + key` 拼出访问 URL。

### 三、当前已接入的业务场景

- **提问（CreateQuestionPage）**
  - 权限校验：沿用 `useAuthStore` + `isMemberActive`，非有效会员禁止提问：
    - 老师（`teacher`）始终视为有效会员，可随时进入提问页；
    - 学生（`student`）需满足 `expiresAt > now` 才视为有效会员，否则进入 `/create` 会被 toast 提示并重定向回首页；
    - 家长（`parent`）账号统一视为“只读”，`isMemberActive` 永远返回 `false`，点击底部提问按钮会被拦截回首页，不允许发起提问；
  - 功能链路：
    1. 选择科目与结构化标签；
    2. 通过隐藏的 `<input type="file" multiple>` + `questionService.uploadImage` 上传图片（最多三张）；
    3. 顶部导航和“上传图片”区块下方均提供“提交”按钮，复用同一 `handleSubmit` 逻辑，便于学生在不同滚动位置快速提交；
    4. 使用 `questionService.createQuestion` 向后端创建问题；
    5. 提交成功后跳转到新问题详情页（`/question/:id`），若后端未返回有效 `id` 则兜底跳转首页。

- **点赞 / 收藏（QuestionDetailPage）**
  - 入口：问题详情页底部的点赞（Heart）与收藏（Star）按钮；
  - 行为：
    - 未登录：提示“请先登录”，并跳转到登录页；
    - 已登录：
      - 调用 `interactionService.like({ targetType: 'question', targetId, action })` 切换点赞状态；
      - 调用 `interactionService.favorite({ questionId, action })` 切换收藏状态；
      - 通过 `behaviorService.log('question_like' | 'question_favorite', { questionId, action })` 记录埋点。
  - 说明：当前仍依赖 Mock 初始化 `liked/favorited` 状态，后续将随 `useQuestionDetail` 一并改造。

- **分享链接（QuestionDetailPage / QuestionCard）**
  - 工具文件：`src/lib/share.ts`
    - 通过 `VITE_SHARE_BASE_URL` 环境变量作为分享基础域名；
    - 当该变量未配置或仍为“基础域名/example.com”等占位值时，视为“未配置分享域名”，前端不会复制任何链接，仅提示“暂未配置分享域名，当前不支持复制分享链接”；
  - 行为：
    - 详情页顶部/底部分享按钮与首页问题卡片右侧分享按钮统一调用分享工具；
    - 剪贴板可用时：复制构造好的 `https://<域名>/question/:id` 到剪贴板，并提示“分享链接已复制”；
    - 剪贴板不可用时：退化为 toast 中展示完整分享链接，由用户手动复制。

### 四、登录白名单策略（后端配合概览）

- 文件：`backend/src/services/auth.service.ts`
  - 在 `login` 流程中新增基于环境变量 `AUTH_STRICT_WHITELIST_FOR_LOGIN` 的可选白名单校验：
    - 开关为 `"true"` 时：
      - `userWhitelist` 不存在或已删除 → 抛出 `4001/NOT_IN_WHITELIST`；
      - `validUntil` 已过期 → 抛出 `4004/CLASS_HOUR_EXPIRED`；
    - 开关关闭或开发/测试环境下，保持当前登录行为不变。
- 前端目前仍由 Axios 拦截器统一处理 4xx/5xx 提示，错误码到用户文案的精细映射将在下一轮 UX 调整中补齐。

### 五、后续改造方向（留待后续方案包）

- 数据层：
  - 抽象 `useQuestionDetail` 钩子，统一加载问题详情 + 回答 + 评论；
  - 为 `MyAnswersPage` / `MyLikesPage` / `MyFavoritesPage` 接入真实后端接口。
- 上传与埋点：
  - 抽象独立上传客户端模块（`upload-client`），复用在回答与评论图片上传场景；
  - 补齐“浏览问题 / 提交评论”等行为的埋点记录与埋点测试。

### 六、样式基线补充（全局字体）

- 前端全局字体基线已统一为思源黑体优先栈（`Source Han Sans SC`）：
  - 配置位置：`src/styles/fonts.css`；
  - 生效范围：`body` 及表单控件（`button/input/select/textarea` 继承全局字体）；
  - 回退顺序：`Noto Sans CJK SC` → `PingFang SC` → `Microsoft YaHei` → `Helvetica Neue` → `Arial` → `sans-serif`。

### 七、PWA 最小可用修复（早期阶段）

- 配置位置：`vite.config.ts`（`VitePWA` 插件配置）。
- 本次仅做最小改动，目标是“能跑 + 易改”：
  - `includeAssets` 仅保留仓库已存在的 `favicon.ico`，移除不存在的 `apple-touch-icon.png`、`masked-icon.svg`；
  - `manifest` 补充 `display='standalone'`、`start_url='/'`、`background_color='#ffffff'`；
  - `manifest.icons` 暂时复用 `favicon.ico`，并在代码中标注“后续替换为 192/512 PNG”。
- 已知边界：
  - 当前安装图标清晰度可能不足（取决于 favicon 分辨率）；
  - 不影响现有业务路由与接口逻辑，仅影响 PWA 安装体验质量。
