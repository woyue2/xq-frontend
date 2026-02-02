# 后端第 8-9 部分实现评审草案（文件上传 & 行为埋点）

> 目的：给评审同学一个集中的对照视图，说明当前实现与文档/测试用例之间的差异，并给出可选改造方案，方便评审后统一决定是否调整代码或文档。

## 一、评审范围与参考资料

- 评审范围（对应 backend/playwright/todolist.md）：
  - 第 8 部分：文件上传 & 静态资源（`GET /api/upload/signature`，`/static/audio/*`）
  - 第 9 部分：行为埋点（`POST /api/behavior/log`）
- 参考资料：
  - 《后端需求文档-完整版.md》
  - 《后端需求文档-埋点分析API.md》
  - 《后端-测试用例.md》中的 UPLOAD-API / BEHAVIOR-API 部分（含 BEHAVIOR-API-003）
  - `codex-develop-doc/backend-key-apis.md`
  - 当前实现代码：
    - `backend/src/routes/upload.routes.ts`
    - `backend/src/routes/behavior.routes.ts`
    - `backend/src/services/behavior-log.service.ts`
  - 联调记录：
    - `backend/playwright/todolist.md`
    - `backend/playwright/原因分析.md`

本草案只描述「当前真实行为 vs 文档预期」，不直接改代码；具体取舍留给评审。

## 二、当前实现概览

### 2.1 文件上传签名 & 静态资源

接口与行为：

- `GET /api/upload/signature`
  - 鉴权：`authMiddleware`（必须登录）
  - 参数：
    - `type=image|audio`（其他值报错）
  - 行为：
    - `type=image`：
      - 普通学生/家长/教师均可调用；
      - 返回字段：
        - `uploadUrl`: 固定占位地址 `https://oss.example.com/upload`
        - `key`: `image/{userId}/{timestamp}.jpg`
        - `policy`: base64 JSON（包含 `expiration`、`type`）
        - `signature`: base64 签名占位值
        - `expireAt`: 过期时间戳（ms）
    - `type=audio`：
      - 仅 `role=teacher` 可调用；
      - 教师调用：返回 200，`key` 为 `audio/{userId}/{timestamp}.mp3`
      - 学生/家长调用：抛出 `AppError(403, 'PERMISSION_DENIED', '只有教师可以上传音频')`
    - `type=video` 等其他值：
      - 抛出 `AppError(400, 'INVALID_UPLOAD_TYPE', '不支持的上传类型')`
  - 错误响应格式统一由 `errorMiddleware` 处理：
    - HTTP 状态码：400 / 401 / 403 …
    - JSON：
      ```json
      {
        "code": 400,
        "message": "不支持的上传类型",
        "error": "INVALID_UPLOAD_TYPE",
        "timestamp": 1234567890
      }
      ```

- 静态资源 `/static/audio/*`
  - 由 `backend/src/app.ts` 通过 `express.static(env.AUDIO_BASE_DIR)` 暴露；
  - 当前本地默认目录为 `backend/static/audio/`，仓库中有 `test-audio.mp3` 占位文件；
  - 实测：`GET /static/audio/test-audio.mp3` 返回 200。

注意：当前 Node 后端**只负责「生成签名」和「静态音频访问」**，没有直接处理 OSS 上传本身。

### 2.2 行为埋点接口

- 单条行为日志上报：`POST /api/behavior/log`
  - 请求体（当前实现）：
    ```ts
    {
      type?: string;      // 必填，缺少会报 400 VALIDATION_ERROR
      timestamp?: number; // 可选，存在时用于 clientTime
      metadata?: any;     // 可选，会原样写入 BehaviorLog.metadata
    }
    ```
  - 鉴权：
    - Authorization 可选；
    - 如果带合法 JWT，则从 token 中解析出 `userId` 写入 `BehaviorLog.userId`；
    - token 无效时忽略用户信息，不阻塞上报。
  - 防刷与限流（当前代码已实现）：
    - 内存级限流 Map：key = `userId_or_ip:type`
    - 窗口：`RATE_LIMIT_WINDOW_MS = 60 * 1000`（1 分钟）
    - 阈值：`RATE_LIMIT_MAX_EVENTS = 30`
    - 行为：
      - 在 1 分钟窗口内，同一 key 前 30 次上报返回 200；
      - 第 31 次及之后抛出 `AppError(429, 'RATE_LIMITED', '行为上报过于频繁，请稍后再试')`
      - 下一个窗口重新计数。
  - 日志写入：
    - 使用 `BehaviorLogService.logSingle` 调用 Prisma：
      - `eventType = type`
      - `metadata = metadata`
      - `clientTime = new Date(timestamp)`（如果 timestamp 为 number）
      - `path`、`referrer`、`userAgent`、`ipAddress` 根据请求与 metadata 填充。
  - 响应：
    ```json
    {
      "code": 200,
      "message": "Logged successfully",
      "data": {
        "id": "cml4fgodp000jtlderp07yv7h",
        "success": true,
        "receivedAt": 1769991876208
      },
      "timestamp": 1769991876208
    }
    ```
  - 实测结论：
    - 单条上报：200，DB 中写入一条 BehaviorLog，字段与请求匹配；
    - 缺少 type：400，`error="VALIDATION_ERROR"`，message 为「缺少行为类型」；
    - 高频上报：同一用户 1 分钟内连打 35 次：
      - 0～29 次：200；
      - 30～34 次：`429`，`error="RATE_LIMITED"`。

> 小结：当前行为埋点在「单条上报」「字段写入」「缺少 type」「高频限流」四个方面逻辑完整。

## 三、与文档 / 测试用例的差异点

### 3.1 文件上传相关

1. **错误码风格差异**
   - 需求文档中的错误码规范列出了 `2001/2002`：
     - `2001`：文件类型不支持
     - `2002`：文件过大
   - 当前实现：
     - 统一通过 `AppError.bizCode` 承载业务错误码，由 `errorMiddleware` 写入响应体 `code` 字段；
     - 类型不支持 → HTTP 400，`error = "INVALID_UPLOAD_TYPE"`，`code = 2001`；
     - 大小限制目前不在 Node 后端做检查（由 OSS 或前端控制），因此 `2002` 仍未在实际接口中使用。
   - 影响：
     - 如果前端或测试用例按数字业务码（尤其是 2002）写死断言，需要确认是否在业务上真的触发对应场景；
     - 当前仅保证「类型不支持」严格对齐文档中的 2001，其余文件大小相关逻辑仍待后续补充。

2. **「实际上传」职责划分不清**
   - 文档 & todolist 中存在「使用签名上传一张图片/音频，URL 可访问」这类用例；
   - 当前 Node 后端只提供签名，并通过 `/static/audio` 暴露了一些本地音频，用于模拟播放；
   - 真正的 OSS 上传行为（HTTP PUT/POST 到阿里云/七牛）不在 Node 后端，而在前端或运维脚本中实现。
   - 影响：
     - 仅通过后端自动化很难完整覆盖「上传 + 回读」链路；
     - 这部分需要在 E2E/运维侧单独补充说明和用例，而不是归在 Node API 的合同内。

3. **文档未明确的鉴权行为**
   - 目前 `GET /api/upload/signature` 要求登录，且音频签名仅教师可用；
   - 部分早期文档示例未强调鉴权细节（例如是否允许未登录获取图片签名），会让新同学误以为接口可匿名访问。

### 3.2 行为埋点相关

1. **响应结构差异（已统一）**
   - 《埋点分析 API 设计文档》中示例：
     ```json
     {
       "code": 200,
       "message": "success",
       "data": { "logId": "log_abc123" }
     }
     ```
   - 当前实现已对齐文档：
     ```json
     {
       "code": 200,
       "message": "success",
       "data": { "logId": "log_abc123" },
       "timestamp": 1706832000100
     }
     ```
   - 结论：行为埋点接口的合同已经在文档、实现、前端类型定义与测试用例之间完全统一，不再出现 `data.id/success/receivedAt` 的旧结构。

2. **限流细节 vs 用例描述**
   - 《backend-testing-plan.md》中的 BEHAVIOR-API-003 只写了：
     - 场景：短时间内连续调用 `/api/behavior/log`；
     - 预期：部分请求返回 429，错误码 `RATE_LIMITED`。
   - 当前实现具体参数：
     - 1 分钟窗口，阈值 30 条 / user(IP)+type；
     - 超出阈值后全部请求 429。
   - 实测：如前所述，0～29 次 200，30 次及以后 429，完全符合「部分返回 429」的文字描述，但数值阈值是隐含的。

3. **业务错误码规范 vs 实际实现（已部分对齐）**
   - 文档错误码表中除了 HTTP 级别，还有 1001/1002/2001/300x/400x 等业务码；
   - 当前实现策略：
     - HTTP 状态码仍通过响应状态码表达（例如 400/401/403/404/429/500）；
     - 对于手机号格式错误、验证码错误、权限不足、白名单/账号状态、课时过期等场景，通过 `AppError.bizCode` 输出文档中的业务码（如 1001/1002/2001/3001~3005/4001~4004），`error` 字段继续使用字符串错误码（如 `INVALID_PHONE_FORMAT`、`MEMBER_EXPIRED`）；
     - 其他通用错误仍使用 `code = HTTP 状态码` + 业务字符串错误码的形式。
   - TODO：
     - `2002`（文件过大）目前仍未在 Node 后端实现对应检查逻辑，后续如在上传链路中增加大小校验，需要一并接入 `bizCode=2002`。

## 四、待评审问题清单

> 下列问题并非必须修改，但建议在一次评审会上明确结论，避免后续实现分裂。

1. **错误码体系是否要强制对齐数值码表？**
   - 选项 A（保持现状）：
     - 继续使用 HTTP 状态码 + `error` 字符串；
     - 在文档中把 1001/2001/300x/400x 当成“推荐映射”，不强制后端按照数值码输出；
     - 优点：改动小，不破坏现有接口；缺点：与现有表格存在认知差异。
   - 选项 B（按业务码表调整）：
     - 引入统一的错误码映射，例如：
       - `INVALID_UPLOAD_TYPE` → `code=2001`
       - `FILE_TOO_LARGE` → `code=2002`
       - `RATE_LIMITED` → `code=429`（HTTP）+ `error=RATE_LIMITED` + 可选 `bizCode`；
     - 或者在响应中增加 `bizCode` 字段专门承载 1001/2001/…；
     - 需要同步更新：
       - `errorMiddleware`
       - 各处 `AppError` 的构造位置
       - 集成测试 & 文档示例。

2. **文件上传「职责边界」如何定义？**
   - 选项 A（后端只负责签名和静态资源）：  
     - Node 后端职责限定为：
       - 签名接口：生成直传 OSS 所需的信息；
       - 静态资源：本地开发环境的音频播放；
     - 真实上传流程交由前端/运维，文档中用专门章节描述“上传流程 & 风险点”，不在 Node API 行为中强制验证；
     - 对应调整：将 `后端-测试用例.md` 中「上传成功并可访问」的用例，移动到 E2E 测试或运维脚本层。
   - 选项 B（Node 后端部分承担上传校验）：  
     - 例如增加一个内部 `POST /api/upload/debug-upload` 仅用于测试环境，把文件中转存到本地，再模拟错误码 2001/2002；
     - 会增加实现复杂度和部署要求，需要评审是否值得。

3. **行为埋点限流阈值是否需要产品级确认？**
   - 当前实现：1 分钟 30 条 / 用户(IP)+事件类型；
   - 文档只说「短时间内高频上报需要限流」，没有给具体数值；
   - 建议：
     - 由产品/运营确认一个更合理的阈值（例如 60 条/分钟 或区分事件类型）；
     - 一旦确认，在 `behavior.routes.ts` 和需求文档中都显式写出数值，避免日后猜测。

4. **行为埋点响应结构是否要与埋点文档统一？**
   - 当前响应：`data.id` + `success` + `receivedAt`；
   - 文档示例：`data.logId`；
   - 建议：
     - 保留当前字段，但在文档中说明「logId 即为响应中的 data.id」；
     - 如果一定要统一名字，可在响应中增加 `logId` 字段，保持向后兼容。

## 五、建议的下一步动作

> 以下是建议顺序，供评审会参考。

1. **先评审「错误码体系」与「职责边界」**  
   - 明确：是否要在这一版就统一数值业务码？  
   - 明确：Node 后端对「文件上传成功」是否只负责签名，还是要引入 debug-upload 之类的辅助接口。

2. **根据评审结论决定是否改代码或改文档**  
   - 如果选择保持现状：
     - 在《后端需求文档-完整版.md》和《后端-测试用例.md》中，用一小节说明“统一采用 HTTP 状态码 + error 字符串”的策略；
     - 对上传和行为埋点用例做轻量改写，让断言对齐现有实现（尤其是 2001/2002 和 `logId` 字段）。  
   - 如果选择调整实现：
     - 统一设计错误码映射方案；
     - 在一个小迭代中集中修改 `AppError` / `errorMiddleware` / 相关路由；
     - 配套更新测试和文档。

3. **在 Playwright / E2E 场景中复用现有测试工具链**  
   - 每次需要学生/教师身份时，优先使用 `POST /api/internal/test-token` 获取 token，减少对短信验证码和白名单环境的依赖；
   - 行为埋点限流用例在 Playwright 中至少调用 35 次，明确观察前 30 次 200 + 后 5 次 429 的行为。

> 如果本草案有遗漏或理解偏差，建议在评审时补充；一旦达成共识，可由后端统一落地到实现和文档中，避免后续重复踩坑。***
