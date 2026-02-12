import { api } from './api';
import type { BindChildPayload, ChildInfo } from '@/types/parent';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { Question } from '@/types';

export const parentService = {
  // 发送绑定验证码
  sendBindSms: (phone: string) => 
    api.post<ApiResponse<void>>('/auth/send-code', { phone, type: 'bind_child' }),
    
  // 绑定孩子
  bindChild: (data: BindChildPayload) =>
    api.post<ApiResponse<ChildInfo>>('/parent/bind', data),
    
  // 获取已绑定孩子列表
  getChildren: () =>
    api.get<ApiResponse<ChildInfo[]>>('/parent/children'),
    
  // 解绑孩子
  unbindChild: (childId: string) =>
    api.post<ApiResponse<void>>('/parent/unbind', { childId }),
    
  // 获取孩子提问列表
  getChildQuestions: (childId: string, params?: any) =>
    api.get<ApiResponse<PaginatedResponse<Question>>>(`/parent/questions/${childId}`, { params }),
};
