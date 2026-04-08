# Admin 和 Teacher 权限统一修复

## 修复内容

根据用户要求，Admin 和 Teacher 现在拥有**完全相同**的权限，包括访问管理后台。

## 修改文件

### 1. `src/components/RouteGuard.tsx`

**修改前**:
```typescript
export function RequireAdmin({ children }: RouteGuardProps) {
  if (user?.role !== 'admin') {
    // 只有 admin 可以访问
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
```

**修改后**:
```typescript
export function RequireAdmin({ children }: RouteGuardProps) {
  // Admin 和 Teacher 都可以访问管理后台
  if (user?.role !== 'admin' && user?.role !== 'teacher') {
    // 非管理员/教师用户重定向到首页
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
```

### 2. `src/layouts/MainLayout.tsx`

**修改前**:
```typescript
{user.role === 'admin' && (
  <DropdownMenuItem>管理后台</DropdownMenuItem>
)}
```

**修改后**:
```typescript
{(user.role === 'admin' || user.role === 'teacher') && (
  <DropdownMenuItem>管理后台</DropdownMenuItem>
)}
```

## 权限对比

### 修改前

| 功能 | Admin | Teacher |
|------|-------|---------|
| 访问管理后台 | ✅ | ❌ |
| 管理科目/主题 | ✅ | ❌ |
| 创建问题 | ✅ | ✅ |
| 回答问题 | ✅ | ✅ |
| 发表评论 | ✅ | ✅ |
| 其他权限 | ✅ | ✅ |

### 修改后

| 功能 | Admin | Teacher |
|------|-------|---------|
| 访问管理后台 | ✅ | ✅ |
| 管理科目/主题 | ✅ | ✅ |
| 创建问题 | ✅ | ✅ |
| 回答问题 | ✅ | ✅ |
| 发表评论 | ✅ | ✅ |
| 其他权限 | ✅ | ✅ |

## 测试验证

### 1. 创建 Teacher 测试账号

修改 `prisma/seed.test.ts` 添加 Teacher 账号：

```typescript
const teacher = await prisma.user.create({
  data: {
    phone: '13800000002',
    nickname: '测试教师',
    name: 'Test Teacher',
    role: 'teacher',
    passwordHash: await bcrypt.hash('teacher123', 10),
  },
})
```

运行种子脚本：
```bash
npm run db:seed
```

### 2. 测试 Teacher 访问管理后台

```bash
# 启动开发服务器
vercel dev

# 1. 登录 Teacher 账号
# 访问 http://localhost:3000/login
# 手机号：13800000002
# 密码：teacher123

# 2. 点击右上角头像
# 应该看到"管理后台"选项

# 3. 点击"管理后台"
# 应该成功跳转到 /admin/subjects
# 可以管理科目和主题
```

### 3. 测试 Admin 访问管理后台

```bash
# 1. 登录 Admin 账号
# 访问 http://localhost:3000/login
# 手机号：13800000001
# 密码：admin123

# 2. 点击右上角头像
# 应该看到"管理后台"选项

# 3. 点击"管理后台"
# 应该成功跳转到 /admin/subjects
# 可以管理科目和主题
```

## TypeScript 检查

```bash
npx tsc --noEmit
```

**结果**: 
- ✅ `src/components/RouteGuard.tsx: No diagnostics found`
- ✅ `src/layouts/MainLayout.tsx: No diagnostics found`

## 相关文件

### 修改的文件
- `src/components/RouteGuard.tsx` - 路由守卫（允许 Teacher 访问）
- `src/layouts/MainLayout.tsx` - 主布局（显示管理后台入口）

### 更新的文档
- `ADMIN_VS_TEACHER_PERMISSIONS.md` - 权限对比文档（已更新）
- `AVATAR_BUTTON_FIX.md` - 头像按钮修复文档（已更新）
- `ADMIN_TEACHER_SAME_PERMISSIONS_FIX.md` - 本文档

## 总结

✅ **Admin 和 Teacher 权限已统一**

**修改内容**:
- RouteGuard 允许 Teacher 访问 `/admin/subjects`
- 头像下拉菜单对 Teacher 显示"管理后台"选项
- 文档已更新，反映新的权限模型

**权限模型**:
- Admin 和 Teacher：完全相同的权限（上帝模式）
- Student（有效期内）：创建问题、回答、评论
- Student（过期）：只能查看
- Parent：只能查看

**测试状态**:
- TypeScript 检查通过 ✅
- 代码逻辑正确 ✅
- 文档已更新 ✅

---

生成时间: 2026-04-09
