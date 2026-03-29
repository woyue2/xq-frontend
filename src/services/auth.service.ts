/**
 * auth.service.ts — 认证 & 用户基础服务
 *
 * 职责：登录、发验证码、注册、修改密码、更新用户信息
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
        const { data: res } = await api.patch<ApiResponse<User>>('/users/me', data);
        return res.data;
    },
};
