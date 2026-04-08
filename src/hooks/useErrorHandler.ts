/**
 * [POS] src/hooks/useErrorHandler.ts
 *   所属：hooks 层 | 角色：React Hook 形式的错误处理工具
 *   兄弟：useDebounce.ts, useSafeSubmit.ts
 *
 * [INPUT]
 *   - react                  → useState, useCallback
 *   - @/lib/error-handler    → handleApiError, ApiError, ConflictDetails
 *
 * [OUTPUT]
 *   - useErrorHandler        → React Hook，提供错误处理和状态管理
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化）
 *   2. src/hooks/CLAUDE.md 的文件清单
 */
import { useState, useCallback } from 'react';
import { handleApiError, ApiError, ConflictDetails } from '@/lib/error-handler';

/**
 * 错误处理状态
 */
export interface ErrorState {
  error: ApiError | null;
  fieldErrors: Record<string, string>;
  hasError: boolean;
}

/**
 * 错误处理 Hook 配置
 */
export interface UseErrorHandlerOptions {
  onUnauthorized?: () => void;
  onForbidden?: () => void;
  onConflict?: (details?: ConflictDetails) => void;
  onServerError?: () => void;
}

/**
 * 错误处理 Hook
 * 
 * 提供统一的错误处理和状态管理
 * 
 * @param options - 可选配置
 * @returns 错误状态和处理函数
 * 
 * @example
 * ```tsx
 * const { error, fieldErrors, handleError, clearError } = useErrorHandler({
 *   onUnauthorized: () => navigate('/login'),
 *   onForbidden: () => setShowPermissionDialog(true),
 * });
 * 
 * try {
 *   await api.post('/questions', data);
 * } catch (err) {
 *   handleError(err);
 * }
 * 
 * // 在表单中显示字段错误
 * {fieldErrors.title && <span className="text-red-500">{fieldErrors.title}</span>}
 * ```
 */
export function useErrorHandler(options?: UseErrorHandlerOptions) {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    fieldErrors: {},
    hasError: false,
  });

  /**
   * 处理错误
   */
  const handleError = useCallback(
    (error: any) => {
      const apiError = handleApiError(error, {
        ...options,
        onBadRequest: (details) => {
          // 保存字段级错误到状态
          if (details) {
            setErrorState({
              error: apiError,
              fieldErrors: details,
              hasError: true,
            });
          }
        },
      });

      setErrorState((prev) => ({
        ...prev,
        error: apiError,
        hasError: true,
      }));
    },
    [options]
  );

  /**
   * 清除错误状态
   */
  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      fieldErrors: {},
      hasError: false,
    });
  }, []);

  /**
   * 清除特定字段的错误
   */
  const clearFieldError = useCallback((fieldName: string) => {
    setErrorState((prev) => {
      const newFieldErrors = { ...prev.fieldErrors };
      delete newFieldErrors[fieldName];
      return {
        ...prev,
        fieldErrors: newFieldErrors,
        hasError: prev.error !== null || Object.keys(newFieldErrors).length > 0,
      };
    });
  }, []);

  /**
   * 获取特定字段的错误消息
   */
  const getFieldError = useCallback(
    (fieldName: string): string | undefined => {
      return errorState.fieldErrors[fieldName];
    },
    [errorState.fieldErrors]
  );

  return {
    error: errorState.error,
    fieldErrors: errorState.fieldErrors,
    hasError: errorState.hasError,
    handleError,
    clearError,
    clearFieldError,
    getFieldError,
  };
}
