/**
 * [POS] src/lib/error-handler.ts
 *   所属：lib 层 | 角色：统一错误处理工具
 *   兄弟：utils.ts, permissions.ts
 *
 * [INPUT]
 *   - sonner                 → toast（错误提示）
 *   - @/stores/useAuthStore  → useAuthStore.getState()（Token 清除）
 *
 * [OUTPUT]
 *   - handleApiError         → 统一 API 错误处理函数
 *   - showConflictDialog     → 显示 409 冲突对话框
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化）
 *   2. src/lib/CLAUDE.md 的文件清单
 */
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * API 错误响应格式
 */
export interface ApiError {
  code: number;
  message: string;
  timestamp?: number;
  details?: Record<string, string>; // 用于 400 错误的字段级错误信息
}

/**
 * 409 冲突错误的详细信息
 */
export interface ConflictDetails {
  type: 'subject' | 'topic';
  name: string;
  relatedCount: number;
  relatedType: 'questions' | 'topics';
}

/**
 * 统一处理 API 错误
 * 
 * @param error - Axios 错误对象
 * @param options - 可选配置
 * @returns 处理后的错误信息
 */
export function handleApiError(
  error: any,
  options?: {
    onUnauthorized?: () => void;
    onForbidden?: () => void;
    onBadRequest?: (details?: Record<string, string>) => void;
    onConflict?: (details?: ConflictDetails) => void;
    onServerError?: () => void;
  }
): ApiError {
  const { response } = error;
  const status = response?.status;
  const data = response?.data as ApiError | undefined;

  const apiError: ApiError = {
    code: status || 500,
    message: data?.message || '网络错误',
    timestamp: data?.timestamp || Date.now(),
    details: data?.details,
  };

  switch (status) {
    case 401:
      // 清除 token，重定向到登录页
      useAuthStore.getState().logout();
      toast.error('登录已过期，请重新登录');
      
      // 延迟跳转，让用户看到提示
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
      
      if (options?.onUnauthorized) {
        options.onUnauthorized();
      }
      break;

    case 403:
      // 显示权限不足提示
      toast.error('权限不足，无法执行此操作');
      
      if (options?.onForbidden) {
        options.onForbidden();
      }
      break;

    case 400:
      // 在表单字段旁显示错误信息
      // 如果有详细的字段错误，由调用方处理
      if (apiError.details) {
        if (options?.onBadRequest) {
          options.onBadRequest(apiError.details);
        }
      } else {
        // 没有字段级错误，显示通用错误
        toast.error(apiError.message || '请求参数错误');
      }
      break;

    case 409:
      // 显示关联数据说明对话框
      const conflictDetails = parseConflictDetails(apiError.message);
      
      if (conflictDetails) {
        showConflictDialog(conflictDetails);
      } else {
        toast.error(apiError.message || '操作冲突');
      }
      
      // 无论是否解析成功，都调用回调（如果提供）
      if (options?.onConflict) {
        options.onConflict(conflictDetails || undefined);
      }
      break;

    case 500:
      // 显示通用错误提示
      toast.error('服务器繁忙，请稍后再试');
      
      if (options?.onServerError) {
        options.onServerError();
      }
      break;

    default:
      // 其他错误
      toast.error(apiError.message || '请求失败');
  }

  return apiError;
}

/**
 * 解析 409 冲突错误的详细信息
 * 
 * @param message - 错误消息
 * @returns 冲突详细信息或 null
 */
function parseConflictDetails(message: string): ConflictDetails | null {
  // 尝试从错误消息中提取关联信息
  // 示例消息格式：
  // "无法删除科目「数学」，存在 15 个关联问题"
  // "无法删除科目「数学」，存在 3 个关联考点"
  // "无法删除考点「代数」，存在 8 个关联问题"
  
  const subjectQuestionMatch = message.match(/无法删除科目[「『](.+?)[」』].*?(\d+)\s*个关联问题/);
  if (subjectQuestionMatch) {
    return {
      type: 'subject',
      name: subjectQuestionMatch[1],
      relatedCount: parseInt(subjectQuestionMatch[2], 10),
      relatedType: 'questions',
    };
  }

  const subjectTopicMatch = message.match(/无法删除科目[「『](.+?)[」』].*?(\d+)\s*个关联考点/);
  if (subjectTopicMatch) {
    return {
      type: 'subject',
      name: subjectTopicMatch[1],
      relatedCount: parseInt(subjectTopicMatch[2], 10),
      relatedType: 'topics',
    };
  }

  const topicQuestionMatch = message.match(/无法删除考点[「『](.+?)[」』].*?(\d+)\s*个关联问题/);
  if (topicQuestionMatch) {
    return {
      type: 'topic',
      name: topicQuestionMatch[1],
      relatedCount: parseInt(topicQuestionMatch[2], 10),
      relatedType: 'questions',
    };
  }

  return null;
}

/**
 * 显示 409 冲突对话框
 * 使用 sonner toast 显示详细的冲突信息
 * 
 * @param details - 冲突详细信息
 */
export function showConflictDialog(details: ConflictDetails): void {
  const typeName = details.type === 'subject' ? '科目' : '考点';
  const relatedTypeName = details.relatedType === 'questions' ? '问题' : '考点';
  
  const message = `无法删除${typeName}「${details.name}」，存在 ${details.relatedCount} 个关联${relatedTypeName}。请先删除或转移这些${relatedTypeName}。`;
  
  toast.error(message, {
    duration: 5000, // 显示更长时间
  });
}

/**
 * 从 API 错误中提取字段级错误信息
 * 用于表单验证错误的显示
 * 
 * @param error - API 错误对象
 * @returns 字段错误映射
 */
export function extractFieldErrors(error: ApiError): Record<string, string> {
  return error.details || {};
}
