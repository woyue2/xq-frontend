/**
 * [POS] src/components/RouteGuard.tsx
 *   所属：components 层 | 角色：路由守卫组件，处理认证和权限检查
 *
 * [INPUT]
 *   - react-router-dom       → Navigate / useLocation
 *   - @/stores/useAuthStore  → useAuthStore
 *
 * [OUTPUT]
 *   - RequireAuth（需要登录的路由守卫）
 *   - RequireAdmin（需要管理员权限的路由守卫）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { ReactNode } from 'react';

interface RouteGuardProps {
  children: ReactNode;
}

/**
 * 需要登录的路由守卫
 * 未登录用户将被重定向到登录页
 */
export function RequireAuth({ children }: RouteGuardProps) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // 保存当前路径，登录后可以返回
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * 需要管理员权限的路由守卫
 * Admin 和 Teacher 都可以访问管理后台
 * 其他角色用户将被重定向到首页
 */
export function RequireAdmin({ children }: RouteGuardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin 和 Teacher 都可以访问管理后台
  if (user?.role !== 'admin' && user?.role !== 'teacher') {
    // 非管理员/教师用户重定向到首页
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
