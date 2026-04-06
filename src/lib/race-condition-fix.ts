/**
 * [POS] src/lib/race-condition-fix.ts
 *   所属：lib 层 | 角色：竞态条件统一修复工具
 *   兄弟：api.ts / auth.ts / audit.ts
 *
 * [INPUT]
 *   - API调用函数、导航函数、状态更新函数
 *
 * [OUTPUT]
 *   - safeCreate / safeUpdate / safeDelete 包装器
 *   - 统一的错误处理和重试机制
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/lib/CLAUDE.md 的文件清单
 */

import { toast } from 'sonner';

// ==================== 核心修复工具 ====================

/**
 * 安全创建 - 解决创建后导航竞态
 */
export const safeCreate = async <T>(
  createFn: () => Promise<T & { id: string }>,
  onSuccess: (result: T & { id: string }) => void,
  options?: {
    verifyDelay?: number;
    retryCount?: number;
    errorMessage?: string;
  }
) => {
  const { verifyDelay = 200, retryCount = 2, errorMessage = '创建失败' } = options || {};
  
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const result = await createFn();
      
      // 验证返回数据
      if (!result?.id) {
        throw new Error('创建失败：无有效ID返回');
      }
      
      // 给数据库写入时间
      if (verifyDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, verifyDelay));
      }
      
      // 执行成功回调
      onSuccess(result);
      return result;
      
    } catch (error) {
      console.error(`Safe create attempt ${attempt + 1} failed:`, error);
      
      if (attempt === retryCount) {
        toast.error(errorMessage);
        throw error;
      }
      
      // 指数退避重试
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
    }
  }
};

/**
 * 安全更新 - 解决更新后依赖竞态
 */
export const safeUpdate = async <T>(
  updateFn: () => Promise<T>,
  onSuccess: (result: T) => void,
  options?: {
    verifyFn?: (result: T) => boolean;
    errorMessage?: string;
  }
) => {
  const { verifyFn, errorMessage = '更新失败' } = options || {};
  
  try {
    const result = await updateFn();
    
    // 验证更新结果
    if (verifyFn && !verifyFn(result)) {
      throw new Error('更新验证失败');
    }
    
    onSuccess(result);
    return result;
    
  } catch (error) {
    console.error('Safe update failed:', error);
    toast.error(errorMessage);
    throw error;
  }
};

/**
 * 安全删除 - 解决删除后刷新竞态
 */
export const safeDelete = async (
  deleteFn: () => Promise<void>,
  onSuccess: () => void,
  options?: {
    refreshDelay?: number;
    errorMessage?: string;
  }
) => {
  const { refreshDelay = 300, errorMessage = '删除失败' } = options || {};
  
  try {
    await deleteFn();
    
    // 给数据库删除和索引更新时间
    if (refreshDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, refreshDelay));
    }
    
    onSuccess();
    
  } catch (error) {
    console.error('Safe delete failed:', error);
    toast.error(errorMessage);
    throw error;
  }
};

// ==================== 防重复提交工具 ====================

/**
 * 防重复提交 Hook
 */
export const useAntiSpam = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  
  const execute = async <T>(fn: () => Promise<T>): Promise<T> => {
    if (isSubmitting) {
      throw new Error('操作进行中，请勿重复提交');
    }
    
    setIsSubmitting(true);
    setSubmitCount(prev => prev + 1);
    
    try {
      const result = await fn();
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return {
    isSubmitting,
    submitCount,
    execute
  };
};

// ==================== 重试机制 ====================

/**
 * 带指数退避的重试
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 100
): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('重试失败');
};

// ==================== 统一错误处理 ====================

/**
 * 处理API错误的统一工具
 */
export const handleApiError = (error: any, context: string) => {
  console.error(`API Error in ${context}:`, error);
  
  if (error.response?.status === 404) {
    toast.error('资源不存在或已被删除');
  } else if (error.response?.status === 409) {
    toast.error('数据冲突，请刷新后重试');
  } else if (error.response?.status >= 500) {
    toast.error('服务器错误，请稍后重试');
  } else {
    toast.error(error.message || '操作失败');
  }
};

// ==================== 乐观更新工具 ====================

/**
 * 乐观更新包装器
 */
export const optimisticUpdate = <T>(
  optimisticFn: () => void,
  apiFn: () => Promise<T>,
  rollbackFn: () => void,
  onSuccess: (result: T) => void
) => {
  // 立即执行乐观更新
  optimisticFn();
  
  // 调用API
  apiFn()
    .then(onSuccess)
    .catch((error) => {
      // 回滚乐观更新
      rollbackFn();
      handleApiError(error, 'optimistic update');
    });
};

// ==================== 类型声明 ====================

declare module 'sonner';

// 导出所有工具
export default {
  safeCreate,
  safeUpdate,
  safeDelete,
  useAntiSpam,
  retryWithBackoff,
  handleApiError,
  optimisticUpdate
};
