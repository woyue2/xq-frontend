# 需求文档

## 简介

本功能在用户密码输入错误时，通过 Toast 弹窗给予明确的错误提示，提升登录体验。

当前代码中，密码登录失败后的错误提示依赖 axios 拦截器的通用处理逻辑（`data?.message || '网络错误'`），缺乏针对密码错误场景的专项提示。本需求明确密码错误时应展示的 toast 内容与行为。

## 词汇表

- **Login_Page**：登录页面（`src/pages/LoginPage.tsx`）
- **Toast**：基于 `sonner` 库的轻量级通知弹窗，已在项目中集成
- **Password_Login**：使用手机号 + 密码方式登录（`loginMode === 'password'`）
- **Auth_Service**：前端认证服务（`src/services/api.ts` 中的 `authService.passwordLogin`）
- **HTTP_Interceptor**：axios 响应拦截器（`src/services/http.ts`）

## 需求

### 需求 1：密码错误时展示 Toast 提示

**用户故事：** 作为用户，我希望在密码输入错误时看到明确的 Toast 提示，以便知道登录失败的原因并及时修正。

#### 验收标准

1. WHEN 用户在密码登录模式下提交了错误的密码，THE Login_Page SHALL 展示内容为"密码错误，请重新输入"的错误 Toast
2. WHEN 密码登录请求返回 HTTP 401 状态码，THE Toast SHALL 显示"密码错误，请重新输入"而非通用的"网络错误"
3. WHEN 密码登录请求返回后端业务错误（如 `code !== 200` 且 `message` 包含密码相关描述），THE Toast SHALL 展示后端返回的 `message` 字段内容
4. WHILE Toast 正在展示，THE Login_Page SHALL 保持密码输入框可编辑状态，允许用户立即修改密码重试
5. IF 密码登录请求因网络超时或服务器错误（HTTP 500）失败，THEN THE Toast SHALL 展示对应的通用错误提示，而非密码错误提示

### 需求 2：Toast 展示行为规范

**用户故事：** 作为用户，我希望错误 Toast 的展示方式清晰且不干扰操作，以便快速理解并继续操作。

#### 验收标准

1. THE Toast SHALL 使用错误样式（`toast.error`）展示密码错误提示
2. WHEN 错误 Toast 展示时，THE Toast SHALL 在 4 秒后自动消失
3. WHEN 用户在 Toast 展示期间再次点击登录按钮，THE Login_Page SHALL 关闭旧 Toast 并展示新的错误提示
4. THE Toast SHALL 展示在页面顶部或底部固定位置，不遮挡密码输入框
