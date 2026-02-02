import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';
import { isMemberActive, getUserPermissions, Permission } from '@/lib/permissions';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // 衍生状态 (不用每次计算)
    isActiveMember: boolean;
    permissions: Permission[];

    // Actions
    login: (user: User, token: string) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            isActiveMember: false,
            permissions: [],

            login: (user, token) => {
                set({
                    user,
                    token,
                    isAuthenticated: true,
                    // 登录时立即计算权限快照
                    isActiveMember: isMemberActive(user),
                    permissions: getUserPermissions(user),
                });
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isActiveMember: false,
                    permissions: [],
                });
                // 清理其他可能的本地存储（如果需要）
            },

            updateUser: (updates) => {
                const { user } = get();
                if (!user) return;

                const newUser = { ...user, ...updates };
                set({
                    user: newUser,
                    // 用户更新（如续费）后，重新计算权限
                    isActiveMember: isMemberActive(newUser),
                    permissions: getUserPermissions(newUser),
                });
            },
        }),
        {
            name: 'auth-storage', // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated
                // isActiveMember 和 permissions 不持久化，每次初始化或 hydrate 时应该重算（为了简单先持久化，实际项目可以在 onRehydrate 中算）
                // 实际上 Zustand persist 会恢复所有字段。这里简单处理。
            }),
        }
    )
);
