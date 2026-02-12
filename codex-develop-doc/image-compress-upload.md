## 图片压缩与上传方案（提问/回答/评论统一处理）

### 一、背景与目标

- 场景：提问图片、回答图片、评论图片（可扩展为所有业务场景中的图片上传）。
- 目标：
  - 所有业务图片在**上传前统一压缩并转为 JPG**；
  - 单张图片压缩后 **文件大小 < 1MB**；
  - 保证题目内容、文字与公式在正常阅读下**清晰可辨**；
  - 不破坏现有的“浮窗/OSS 存储 + URL 展示”链路。

### 二、总体技术思路

1. **前端统一做压缩，再上传**
   - 在小程序/前端侧读取用户选择的图片文件；
   - 使用 `<canvas>` 等方式在浏览器内完成裁剪/缩放与质量压缩；
   - 压缩完成后再通过后端签名接口获取上传凭证，将图片直传到存储（浮窗/OSS）。

2. **统一格式为 JPG**
   - 无论原始格式是 JPG、PNG 还是其他浏览器可解码格式，最终都导出为 `image/jpeg`；
   - 通过 `canvas.toDataURL('image/jpeg', quality)` 或 `canvas.toBlob(..., 'image/jpeg', quality)` 实现；
   - 对 PNG 等带透明背景的图片，透明区域会转为白色背景，可在 UI/产品上接受。

3. **文件大小与清晰度平衡**
   - 先控制图片的**最大边长**（例如最大宽度/高度 1600px），保持等比例缩放；
   - 初始化压缩质量 `quality ≈ 0.85`，如果生成后的 Blob > 1MB，则逐步降低质量（如每次减 0.05，最低不低于 ~0.6）；
   - 在质量压缩仍无法降到 1MB 以下的极端情况下，可以进一步降低分辨率，或者直接提示用户“图片过大，请裁剪后再试”。

### 三、前端实现方案

#### 3.1 公共工具函数设计

- 新增工具文件（示例路径）：`src/lib/image-compress.ts`
- 函数示意：
  - `compressImage(file: File, options?: { maxWidth?: number; maxHeight?: number; maxSizeKB?: number; initialQuality?: number; minQuality?: number }): Promise<File>`
  - 核心步骤：
    1. 使用 `FileReader` 或 `createImageBitmap` 读取 `File` 为 `Image`；
    2. 根据 `maxWidth/maxHeight` 计算目标宽高，绘制到 `<canvas>`；
    3. 使用 `canvas.toBlob` 以 `image/jpeg` 输出，起始 `quality = initialQuality`；
    4. 如果 `blob.size > maxSizeKB * 1024`，则递减 `quality` 重新导出（不小于 `minQuality`）；
    5. 若多次尝试后仍 >1MB，则返回错误，交由调用方提示用户。
  - 对小图（原始尺寸不大 & 文件本身 < 1MB）可以跳过压缩，直接包装成 JPG 文件或保持原图。

#### 3.2 业务集成点（提问 / 回答 / 评论页面）

- 在以下页面中接入真实文件选择与压缩逻辑：
  - `src/pages/CreateQuestionPage.tsx`：提问页“上传图片”；
  - `src/pages/AnswerQuestionPage.tsx`：回答页“上传图片”；
  - `src/pages/QuestionDetailPage.tsx`：评论时的图片上传（如有真实上传入口）。

**集成步骤：**

1. 将“上传图片”按钮改为触发 `<input type="file" accept="image/*" multiple>` 的逻辑，获取 `FileList`。
2. 对每个选中的 `File`：
   - 调用 `compressImage(file, { maxWidth: 1600, maxHeight: 1600, maxSizeKB: 1024 })`；
   - 成功返回压缩后的 `File`（格式为 JPG，预计 <1MB）。
3. 调用统一上传封装（见 3.3），将压缩后的 `File` 上传，获得图片 URL。
4. 将 URL 写入对应页面的 `images[]` 或 `image` 状态，用于预览和提交时上报给后端。
5. 保留并复用现有的“最多 X 张图片”限制逻辑，只是从“Mock URL”改为真实的存储 URL。

#### 3.3 上传封装与后端签名接口配合

- 在 `src/services/api.ts` 中，将 `questionService.uploadImage` 改造为：
  1. 向后端请求图片上传签名：`GET /api/upload/signature?type=image`；
  2. 从响应中获取：`uploadUrl`, `key`, `policy`, `signature`, `expireAt` 等；
  3. 使用 `fetch`/`XMLHttpRequest` 将压缩后的 `File` 按后端要求的表单结构上传到 `uploadUrl`；
  4. 根据 `key` 和约定的访问域名拼出图片访问 URL（或使用后端返回的完整 URL）；
  5. 返回该 URL，供提问/回答/评论页面消费。

- 后续所有页面统一调用 `questionService.uploadImage`（或更通用的 `uploadService.uploadImage`），避免在页面里直接处理签名与直传细节。

### 四、后端配合与错误码

> 当前改动主要集中在前端压缩；后端已有上传签名接口与错误码规范，后续扩展时可做如下增强。

1. **错误码对齐（已完成部分）**
   - 文件类型不支持：保持 `code = 2001`，`error = INVALID_UPLOAD_TYPE`；
   - 文件过大：规划使用 `code = 2002`，当后端实际收到的内容 >1MB 时返回该错误码。

2. **建议的后端增强（可选，后续迭代）**
   - 在实际接收/验证上传内容的服务中增加“文件大小上限校验”（与前端一致为 1MB）；
   - 超限时返回 `code = 2002`，前端统一提示“图片过大，请裁剪后再试”，并在埋点中记录相关信息。

### 五、注意事项与风险

1. **题目清晰度**
   - 为保证题目/答题内容清晰，优先控制分辨率再调整质量；
   - 对题目截图等以文字为主的图片，可考虑单独给出稍高的 `quality` 或更大的 `maxWidth`（未来可根据埋点与用户反馈微调）。

2. **性能与体验**
   - 压缩在前端进行，会带来一定 CPU 开销，尤其是在低端机或一次性选择多张大图时；
   - 建议在压缩过程显示「正在处理图片」的 Loading 状态；对特别大的图片可以限制数量或给出提示。

3. **兼容性**
   - 基于 `<canvas>` 的压缩在主流现代浏览器与小程序 WebView 中均可用，但仍需在开发时关注具体运行环境；
   - 如某些环境不支持相关 API，可退回到“不压缩但提示用户”的保底策略。

### 六、后续开发拆解建议

1. P1：实现并单元测试 `compressImage` 工具函数（含质量递减与 1MB 限制逻辑）。
2. P1：在提问页与回答页接入真实文件选择 + 压缩 + 上传流程，替换现有 Mock 图片地址。
3. P2：为评论图片上传接入相同流程，统一使用上传封装。
4. P2（可选）：在后端实际上传路径增加 2002（文件过大）校验，并补充对应集成测试。
5. P3：根据真实使用情况和埋点数据微调最大分辨率、质量参数以及提示文案。 

