# GEB Code Review - Phase A Complete

## 执行时间
2026-04-08

## 完成的修复

### 1. ✅ Prisma Client 重复初始化风险（CRITICAL）

**问题**: `api/auth.ts` 有自己的 Prisma Client 初始化，违反单例模式

**修复**:
- 移除 `api/auth.ts` 中的重复 Prisma Client 初始化代码
- 改为从 `api/_helpers.ts` 导入 `prisma` 和 `JWT_SECRET`
- 确保所有 API 文件都使用统一的 Prisma Client 单例

**影响文件**:
- `api/auth.ts` - 移除重复初始化，导入共享单例

**验证**: ✅ TypeScript 编译通过，无诊断错误

---

### 2. ✅ requireAdmin() 函数设计不佳（DESIGN ISSUE）

**问题**: `api/subjects.ts` 中的 `requireAdmin()` 函数有副作用，直接发送 HTTP 响应

**修复**:
- 重构为纯函数 `getAdminUser()`，返回 `AuthUser | null`
- 由调用者负责处理响应（遵循单一职责原则）
- 更新所有 6 处调用点使用新模式

**影响文件**:
- `api/subjects.ts` - 重构 `requireAdmin()` → `getAdminUser()`

**代码改进**:
```typescript
// 旧代码（有副作用）
function requireAdmin(req, res): boolean {
  const user = getUserFromToken(req);
  if (!user) {
    res.status(401).json({...}); // 副作用
    return false;
  }
  // ...
}

// 新代码（纯函数）
function getAdminUser(req): AuthUser | null {
  const user = getUserFromToken(req);
  if (!user || user.role !== 'admin') {
    return null;
  }
  return user;
}
```

**验证**: ✅ TypeScript 编译通过，无诊断错误

---

### 3. ✅ 错误处理不一致（CODE QUALITY）

**问题**: 混合使用 `catch (error)`, `catch (error: any)`, `catch (parseError: any)`

**修复**:
- 统一所有 API 文件使用 `catch (error: unknown)` 模式
- 添加类型守卫进行安全的错误属性访问
- 遵循 TypeScript strict mode 最佳实践

**影响文件**:
- `api/auth.ts` - 2 处错误处理标准化
- `api/subjects.ts` - 1 处错误处理标准化
- `api/questions.ts` - 1 处错误处理标准化
- `api/answers.ts` - 1 处错误处理标准化
- `api/comments.ts` - 1 处错误处理标准化
- `api/upload.ts` - 2 处错误处理标准化

**代码改进**:
```typescript
// 旧代码
catch (error: any) {
  console.error('Error:', error.message); // 不安全
}

// 新代码
catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error('Error:', errorMessage); // 类型安全
}
```

**验证**: ✅ TypeScript 编译通过，无诊断错误

---

## 统计数据

- **修复的文件**: 6 个 API 文件
- **修复的问题**: 3 个（1 个 CRITICAL，1 个 DESIGN ISSUE，1 个 CODE QUALITY）
- **代码变更**:
  - Prisma Client 单例化: 1 处
  - requireAdmin() 重构: 7 处（1 个函数定义 + 6 个调用点）
  - 错误处理标准化: 8 处
- **TypeScript 诊断**: 0 个错误

---

## 下一步：Phase B（本周，6 小时）

### 计划修复

1. **替换关键 `any` 类型**（2 小时）
   - 优先处理 API 层和核心业务逻辑中的 `any`
   - 使用具体类型或 `unknown` + 类型守卫

2. **内部重构 api/subjects.ts**（4 小时）
   - 提取辅助函数（不拆分文件，遵守 Vercel 12 函数限制）
   - 减少函数长度和嵌套层级
   - 遵循 GEB 代码品味规则（函数 ≤20 行，嵌套 ≤3 层）

---

## 遵循的标准

- ✅ GEB 协议 L3 文档头部标记
- ✅ TypeScript strict mode（无 `any`，使用 `unknown`）
- ✅ 单一职责原则（纯函数，无副作用）
- ✅ Vercel Serverless Functions 架构（Prisma Client 单例）
- ✅ 统一错误处理模式

---

## 验证方法

```bash
# TypeScript 类型检查
npm run type-check

# 运行集成测试
npm run test:integration

# 本地开发服务器
npm run dev
```
