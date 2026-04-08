/**
 * [POS] src/stores/useAuthStore.ts
 *   所属：stores 层 | 角色：登录用户信息 + token 持久化状态
 *   兄弟：（简化版仅此一个 store）
 *
 * [INPUT]
 *   - zustand              → create
 *   - zustand/middleware    → persist / createJSONStorage
 *   - @/types              → User
 *   - @/lib/permissions    → isMemberActive / getUserPermissions / Permission
 *
 * [OUTPUT]
 *   - useAuthStore（Zustand store，含 user/token/setUser/clearAuth 等）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/stores/CLAUDE.md 的文件清单
 */
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
        // 持久化 Token 以便拦截器和刷新后使用
        try {
          localStorage.setItem('token', token);
        } catch {
          // 忽略本地存储异常（如隐私模式）
        }

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
        try {
          localStorage.removeItem('token');
        } catch {
          // 忽略本地存储异常
        }

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
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          state.isActiveMember = isMemberActive(state.user);
          state.permissions = getUserPermissions(state.user);
        }
      },
    },
  ),
);
