/**
 * [POS] src/services/auth.service.ts
 *   所属：services 层 | 角色：认证与用户基础操作
 *   兄弟：http.ts（依赖 api 实例）
 *
 * [INPUT]
 *   - ./http       → api
 *   - @/types/api  → LoginPayload / LoginResponse / SendCodePayload / SendCodeResponse
 *                    PasswordLoginPayload / RegisterPayload / UpdateProfilePayload
 *   - @/types      → User
 *
 * [OUTPUT]
 *   - authService  → sendCode / login / passwordLogin / register / setPassword
 *   - userService  → updateProfile
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化）
 *   2. src/services/CLAUDE.md 的文件清单
 */
import { api } from './http';
import type {
    ApiResponse,
    LoginPayload,
    LoginResponse,
    PasswordLoginPayload,
    SendCodePayload,
    SendCodeResponse,
    RegisterPayload,
    UpdateProfilePayload,
} from '@/types/api';
import type { User } from '@/types';

export const authService = {
    sendCode: async (payload: SendCodePayload) => {
        return api.post<ApiResponse<SendCodeResponse>>('/auth/send-code', payload);
    },
    login: async (payload: LoginPayload) => {
        return api.post<ApiResponse<LoginResponse>>('/auth/login', payload);
    },
    passwordLogin: async (payload: PasswordLoginPayload) => {
        return api.post<ApiResponse<LoginResponse>>('/auth/password-login', payload);
    },
    register: async (payload: RegisterPayload) => {
        const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/register', payload);
        return data.data;
    },
    setPassword: async (newPassword: string) => {
        return api.post<ApiResponse<null>>('/auth/set-password', { newPassword });
    },
};

export const userService = {
    updateProfile: async (data: UpdateProfilePayload) => {
        // 新 API: PUT /users/profile
        const { data: res } = await api.put<ApiResponse<User>>('/users/profile', data);
        return res.data;
    },
};
