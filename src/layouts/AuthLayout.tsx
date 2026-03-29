/**
 * [POS] src/layouts/AuthLayout.tsx
 *   所属：layouts 层 | 角色：未登录态页面（登录/注册）的外层布局容器
 *   兄弟：MainLayout.tsx
 *
 * [INPUT]
 *   - react              → useEffect / useState
 *   - react-router-dom   → Outlet / Navigate
 *   - @/stores/useAuthStore → useAuthStore
 *
 * [OUTPUT]
 *   - AuthLayout（布局组件，含已登录→跳首页守卫）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/layouts/CLAUDE.md 的文件清单
 */
import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';

export function AuthLayout() {
    const { isAuthenticated } = useAuthStore();

    // 等待 Zustand persist 从 localStorage 完成 hydrate，
    // 避免 hydrate 前 isAuthenticated===false 导致的误判
    const [hydrated, setHydrated] = useState(
        () => useAuthStore.persist.hasHydrated()
    );

    useEffect(() => {
        if (hydrated) return;
        const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
        return unsub;
    }, [hydrated]);

    // Hydrate 未完成时显示空白占位，避免闪烁或误跳转
    if (!hydrated) return null;

    // 已登录用户访问 /login 时，直接跳回首页
    if (isAuthenticated) return <Navigate to="/" replace />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-morandi-1/20 via-white to-morandi-2/20 flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-in zoom-in-95 duration-500">
                <Outlet />
            </div>
        </div>
    );
}
