/**
 * [POS] src/services/auth.service.ts
 *   所属：services 层 | 角色：认证服务（简化版）
 *   简化版：仅支持密码登录，无验证码功能
 *
 * [INPUT]
 *   - ./http              → api
 *   - @/types/api         → ApiResponse / PasswordLoginPayload / LoginResponse
 *   - @/types             → UserRole
 *
 * [OUTPUT]
 *   - authService  → passwordLogin / register / sendCode (stub)
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化）
 *   2. src/services/CLAUDE.md 的文件清单
 */
import { api } from './http';
import type { ApiResponse, PasswordLoginPayload, LoginResponse } from '@/types/api';
import type { UserRole } from '@/types';

// 简化版认证服务
export const authService = {
  /**
   * 密码登录
   */
  passwordLogin: async (payload: PasswordLoginPayload) => {
    return await api.post<ApiResponse<LoginResponse>>('/auth?action=password-login', payload);
  },

  /**
   * 注册（简化版：直接创建用户并登录）
   */
  register: async (payload: {
    phone: string;
    code: string; // 简化版中不验证，仅保留接口兼容性
    password: string;
    name?: string;
    nickname?: string;
    grade?: string;
    age?: number;
    school?: string;
    role: UserRole;
  }) => {
    // 简化版：注册即创建用户，返回 token
    // 实际实现需要调用 API 创建用户
    const response = await api.post<ApiResponse<LoginResponse>>('/auth?action=register', {
      phone: payload.phone,
      password: payload.password,
      name: payload.name,
      nickname: payload.nickname,
      role: payload.role,
      grade: payload.grade,
      age: payload.age,
      school: payload.school,
    });
    
    return response.data.data;
  },

  /**
   * 发送验证码（简化版：存根，不实际发送）
   */
  sendCode: async (payload: { phone: string; type: 'login' | 'register' }) => {
    // 简化版不支持验证码，返回成功响应
    return Promise.resolve({ data: { code: 200, message: '验证码已发送' } });
  },

  /**
   * 验证码登录（简化版：存根，不支持）
   */
  login: async (payload: { phone: string; code: string }) => {
    // 简化版不支持验证码登录，抛出错误
    throw new Error('简化版不支持验证码登录，请使用密码登录');
  },
};
