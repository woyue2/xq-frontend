# Admin vs Teacher 权限对比

## 权限系统总结

### ✅ Admin 和 Teacher 权限完全相同

在当前系统中，**Admin 和 Teacher 拥有完全相同的权限**，没有任何区别。

**完整权限列表**:
- ✅ 访问管理后台 (`/admin/subjects`)
- ✅ 管理科目和主题（增删改）
- ✅ 创建问题 (`QUESTION_CREATE`)
- ✅ 删除问题 (`QUESTION_DELETE`)
- ✅ 置顶问题 (`QUESTION_PIN`)
- ✅ 创建答案 (`ANSWER_CREATE`)
- ✅ 创建评论 (`COMMENT_CREATE`)
- ✅ 审核权限 (`AUDIT_READ`, `AUDIT_APPROVE`)
- ✅ 用户管理 (`USER_MANAGE`)
- ✅ 永久有效会员（不受 `expiresAt` 限制）

### 权限代码实现

**文件**: `src/lib/permissions.ts`

```typescript
// 老师/管理员权限 (上帝模式)
if (user.role === 'teacher' || user.role === 'admin') {
  return Object.values(PERMISSIONS); // 返回所有权限
}
```

**文件**: `src/components/RouteGuard.tsx`

```typescript
export function RequireAdmin({ children }: RouteGuardProps) {
  // Admin 和 Teacher 都可以访问管理后台
  if (user?.role !== 'admin' && user?.role !== 'teacher') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
```

## 权限对比表

| 功能 | Admin | Teacher | Student (有效期内) | Student (过期) | Parent |
|------|-------|---------|-------------------|---------------|--------|
| 访问管理后台 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 管理科目/主题 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 创建问题 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 回答问题 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 发表评论 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 删除问题 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 置顶问题 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 审核内容 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 用户管理 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 查看内容 | ✅ | ✅ | ✅ | ✅ | ✅ |

## 路由访问控制

### 公开路由（无需登录）
- `/` - 首页
- `/login` - 登录页
- `/question/:id` - 问题详情页

### 需要登录的路由（`RequireAuth`）
- `/create` - 创建问题
- `/edit/:id` - 编辑问题
- `/answer/:id` - 回答问题

### 需要管理员/教师的路由（`RequireAdmin`）
- `/admin/subjects` - 科目管理（**Admin 和 Teacher 都可以访问**）

## 结论

### Admin 和 Teacher 完全相同

**在当前系统中，Admin 和 Teacher 没有任何区别**:
- ✅ 都可以访问 `/admin/subjects` 管理科目和主题
- ✅ 都可以创建/编辑/删除问题
- ✅ 都可以回答问题
- ✅ 都可以发表评论
- ✅ 都可以审核内容
- ✅ 都可以管理用户
- ✅ 都是永久有效会员

### 为什么有两个角色？

虽然权限相同，但保留两个角色可以用于：
1. **未来扩展**: 如果以后需要区分权限，可以轻松修改
2. **数据统计**: 可以区分管理员和教师的操作记录
3. **显示标识**: 可以在 UI 上显示不同的角色标签

### 如果需要区分权限

如果未来需要让 Admin 拥有更多权限，可以修改：

**选项 1: 修改路由守卫**
```typescript
// src/components/RouteGuard.tsx
export function RequireAdmin({ children }: RouteGuardProps) {
  // 只允许 admin 访问
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
```

**选项 2: 修改权限系统**
```typescript
// src/lib/permissions.ts
export function getUserPermissions(user?: User | null): Permission[] {
  if (user?.role === 'admin') {
    return Object.values(PERMISSIONS); // Admin 拥有所有权限
  }
  
  if (user?.role === 'teacher') {
    // Teacher 只有部分权限
    return [
      PERMISSIONS.QUESTION_CREATE,
      PERMISSIONS.ANSWER_CREATE,
      PERMISSIONS.COMMENT_CREATE,
    ];
  }
  
  // ...
}
```

---

生成时间: 2026-04-09
更新时间: 2026-04-09 (修正：Admin 和 Teacher 权限完全相同)
