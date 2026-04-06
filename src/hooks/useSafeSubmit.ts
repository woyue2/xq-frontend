/**
 * [POS] src/hooks/useSafeSubmit.ts
 *   所属：hooks 层 | 角色：统一防重复提交和竞态条件处理
 *   兄弟：useDebounce.ts / useAuthStore.ts
 *
 * [INPUT]
 *   - 提交函数、成功回调、错误处理
 *
 * [OUTPUT]
 *   - isSubmitting 状态
 *   - safeSubmit 函数（防重复+错误处理）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/hooks/CLAUDE.md 的文件清单
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface SafeSubmitOptions<T = any> {
  onSuccess?: (result: T) => void;
  onError?: (error: any) => void;
  successMessage?: string;
  errorMessage?: string;
  preventSpam?: boolean;
  resetOnSuccess?: boolean;
}

export function useSafeSubmit<T = any>(
  submitFn: () => Promise<T>,
  options: SafeSubmitOptions<T> = {}
) {
  const {
    onSuccess,
    onError,
    successMessage,
    errorMessage = '操作失败，请重试',
    preventSpam = true,
    resetOnSuccess = false
  } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [lastError, setLastError] = useState<any>(null);

  const safeSubmit = useCallback(async () => {
    // 防重复提交
    if (preventSpam && isSubmitting) {
      console.log('Submit blocked: already submitting');
      return;
    }

    setIsSubmitting(true);
    setLastError(null);
    setSubmitCount(prev => prev + 1);

    try {
      const result = await submitFn();
      
      // 成功处理
      if (successMessage) {
        toast.success(successMessage);
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      if (resetOnSuccess) {
        setSubmitCount(0);
      }
      
      return result;
      
    } catch (error) {
      console.error('Submit failed:', error);
      setLastError(error);
      
      // 错误处理
      if (errorMessage) {
        toast.error(errorMessage);
      }
      
      if (onError) {
        onError(error);
      }
      
      throw error;
      
    } finally {
      setIsSubmitting(false);
    }
  }, [submitFn, isSubmitting, onSuccess, onError, successMessage, errorMessage, preventSpam, resetOnSuccess]);

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setSubmitCount(0);
    setLastError(null);
  }, []);

  return {
    isSubmitting,
    submitCount,
    lastError,
    safeSubmit,
    reset
  };
}

// 专门用于导航的安全提交
export function useSafeNavigateSubmit<T extends { id: string }>(
  submitFn: () => Promise<T>,
  navigateFn: (id: string) => void,
  options: SafeSubmitOptions<T> = {}
) {
  return useSafeSubmit(submitFn, {
    ...options,
    onSuccess: (result) => {
      if (result?.id) {
        // 延迟导航，确保数据库写入完成
        setTimeout(() => {
          navigateFn(result.id);
        }, 200);
      }
      // 调用用户自定义的 onSuccess
      if (options.onSuccess) {
        options.onSuccess(result);
      }
    }
  });
}
