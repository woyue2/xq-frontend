# Bugfix Requirements Document

## Introduction

密码长度校验在前后端存在不一致问题。前端注册和设置密码均要求 8 位，后端大部分服务也要求 8 位，但 `api/auth/index.ts` 中的设置密码接口仅校验 6 位。这种不一致可能导致用户在前端输入 6-7 位密码时被拦截，但在某些场景下可能绕过前端校验直接调用 API 通过 6 位密码。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN 用户通过 `api/auth/index.ts` 的 `/auth/set-password` 接口设置密码且密码长度为 6 或 7 位 THEN 系统接受该密码并设置成功

1.2 WHEN 用户在前端注册时输入 6 或 7 位密码 THEN 系统提示"密码至少8位"并拒绝注册

1.3 WHEN 用户在前端个人中心设置密码时输入 6 或 7 位密码 THEN 系统提示"密码至少需 8 位"并拒绝设置

### Expected Behavior (Correct)

2.1 WHEN 用户通过 `api/auth/index.ts` 的 `/auth/set-password` 接口设置密码且密码长度为 6 或 7 位 THEN 系统 SHALL 拒绝设置并返回"密码长度至少8位"错误

2.2 WHEN 用户在前端注册时输入 6 或 7 位密码 THEN 系统 SHALL CONTINUE TO 提示"密码至少8位"并拒绝注册

2.3 WHEN 用户在前端个人中心设置密码时输入 6 或 7 位密码 THEN 系统 SHALL CONTINUE TO 提示"密码至少需 8 位"并拒绝设置

### Unchanged Behavior (Regression Prevention)

3.1 WHEN 用户设置密码且密码长度 >= 8 位 THEN 系统 SHALL CONTINUE TO 接受并成功设置密码

3.2 WHEN 用户通过后端 `backend/src/services/auth.service.ts` 注册或登录 THEN 系统 SHALL CONTINUE TO 校验密码长度 >= 8 位

3.3 WHEN 用户通过后端 `backend/src/services/password.service.ts` 设置密码 THEN 系统 SHALL CONTINUE TO 校验密码长度 >= 8 位

## 修复完成 ✅

### 修复内容

已在 `api/auth/index.ts` 中统一密码长度验证为 8 位：

1. **handleLogin** - 添加密码长度验证（最少 8 位）
2. **handleRegister** - 添加密码长度验证（最少 8 位）
3. **handleSetPassword** - 修改密码长度验证从 6 位改为 8 位

### 验证清单

- ✅ `api/auth/index.ts` - 所有三个处理函数已统一为 8 位验证
- ✅ `backend/src/services/auth.service.ts` - passwordLogin 和 register 已有 8 位验证
- ✅ `backend/src/services/password.service.ts` - setPassword 和 resetWithCode 已有 8 位验证
- ✅ 前端 `src/hooks/useLogin.ts` - 已有 8 位验证

### 修复后的行为

现在所有密码相关的 API 端点都统一要求密码长度至少 8 位，与前端验证保持一致。