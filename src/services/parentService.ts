/**
 * [POS] src/services/parentService.ts
 *   所属：services 层 | 角色：家长端 API 服务（绑定子女、查看子女问题等）
 *   兄弟：auth.service.ts / admin.service.ts / api.ts（re-export 桶）
 *
 * [INPUT]
 *   - ./api              → api（axios 实例）
 *   - @/types/parent     → BindChildPayload / ChildInfo
 *   - @/types/api        → ApiResponse / PaginatedResponse
 *   - @/types            → Question
 *
 * [OUTPUT]
 *   - parentService（家长端 API 调用对象）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/services/CLAUDE.md 的文件清单
 */
import { api } from './api';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { Question } from '@/types';

export const parentService = {
  // 发送绑定验证码
  sendBindSms: (phone: string) =>
    api.post<ApiResponse<void>>('/auth/send-code', { phone, type: 'bind_child' }),

  // 绑定孩子
  bindChild: (data: BindChildPayload) => api.post<ApiResponse<ChildInfo>>('/parent/bind', data),

  // 获取已绑定孩子列表
  getChildren: () => api.get<ApiResponse<ChildInfo[]>>('/parent/children'),

  // 解绑孩子
  unbindChild: (childId: string) => api.post<ApiResponse<void>>('/parent/unbind', { childId }),

  // 获取孩子提问列表
  getChildQuestions: (childId: string, params?: any) =>
    api.get<ApiResponse<PaginatedResponse<Question>>>(`/parent/questions/${childId}`, { params }),
};
