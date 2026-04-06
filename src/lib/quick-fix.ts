/**
 * [POS] src/lib/quick-fix.ts
 *   所属：lib 层 | 角色：竞态条件快速修复工具（哥的救心丸）
 *   兄弟：race-condition-fix.ts / api.ts
 *
 * [INPUT]
 *   - 痛苦的debug经历
 *
 * [OUTPUT]
 *   - 立即可用的修复工具
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/lib/CLAUDE.md 的文件清单
 */

import { toast } from 'sonner';

// ==================== 哥的快速止血方案 ====================

/**
 * 超级简单的防重复提交
 * 直接替换所有按钮的onClick
 */
export const createSafeHandler = (
  handler: () => Promise<any>,
  options?: {
    loadingText?: string;
    successText?: string;
    errorText?: string;
  }
) => {
  let isSubmitting = false;
  
  return async () => {
    if (isSubmitting) {
      console.log('🛡️ 防重复提交已触发');
      return;
    }
    
    isSubmitting = true;
    
    try {
      const result = await handler();
      
      if (options?.successText) {
        toast.success(options.successText);
      }
      
      return result;
    } catch (error) {
      console.error('❌ 操作失败:', error);
      
      if (options?.errorText) {
        toast.error(options.errorText);
      } else {
        toast.error('操作失败，请重试');
      }
    } finally {
      isSubmitting = false;
    }
  };
};

/**
 * 安全导航包装器 - 解决创建后导航竞态
 */
export const safeNavigate = async (
  apiCall: () => Promise<any>,
  navigate: (path: string) => void,
  getPath: (result: any) => string
) => {
  try {
    const result = await apiCall();
    
    // 给数据库一点时间，别催
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const path = getPath(result);
    navigate(path);
    
  } catch (error) {
    console.error('❌ 安全导航失败:', error);
    toast.error('操作失败，请重试');
  }
};

/**
 * 全局状态管理 - 防止页面级别的重复操作
 */
export class GlobalSubmitGuard {
  private static operations = new Map<string, boolean>();
  
  static canExecute(operationId: string): boolean {
    if (this.operations.get(operationId)) {
      console.log(`🛡️ 全局防护: ${operationId} 正在执行中`);
      return false;
    }
    return true;
  }
  
  static setExecuting(operationId: string, isExecuting: boolean): void {
    this.operations.set(operationId, isExecuting);
  }
  
  static clearAll(): void {
    this.operations.clear();
  }
}

/**
 * 带防护的API调用
 */
export const guardedApiCall = async <T>(
  operationId: string,
  apiCall: () => Promise<T>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
  }
): Promise<T> => {
  if (!GlobalSubmitGuard.canExecute(operationId)) {
    throw new Error('操作进行中，请勿重复提交');
  }
  
  GlobalSubmitGuard.setExecuting(operationId, true);
  
  try {
    const result = await apiCall();
    
    if (options?.successMessage) {
      toast.success(options.successMessage);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ ${operationId} 失败:`, error);
    
    if (options?.errorMessage) {
      toast.error(options.errorMessage);
    } else {
      toast.error(`${operationId}失败，请重试`);
    }
    
    throw error;
  } finally {
    GlobalSubmitGuard.setExecuting(operationId, false);
  }
};

// ==================== 常用场景预设 ====================

/**
 * 创建问题的安全处理
 */
export const safeCreateQuestion = async (
  payload: any,
  questionService: any,
  navigate: any,
  ROUTES: any
) => {
  return guardedApiCall(
    'create-question',
    async () => {
      const created = await questionService.createQuestion(payload);
      
      if (!created?.id) {
        throw new Error('创建失败：无有效ID');
      }
      
      // 延迟导航确保数据写入
      setTimeout(() => {
        navigate(ROUTES.question(created.id));
      }, 300);
      
      return created;
    },
    {
      successMessage: '问题已提交',
      errorMessage: '提问失败，请重试'
    }
  );
};

/**
 * 回答问题的安全处理
 */
export const safeCreateAnswer = async (
  payload: any,
  answerService: any,
  questionId: string,
  navigate: any,
  ROUTES: any
) => {
  return guardedApiCall(
    'create-answer',
    async () => {
      const created = await answerService.createAnswer(payload);
      
      // 延迟导航
      setTimeout(() => {
        navigate(ROUTES.question(questionId));
      }, 300);
      
      return created;
    },
    {
      successMessage: '回答已提交',
      errorMessage: '回答失败，请重试'
    }
  );
};

/**
 * 删除操作的安全处理
 */
export const safeDelete = async (
  deleteFn: () => Promise<void>,
  onSuccess: () => void,
  options?: {
    confirmText?: string;
    successMessage?: string;
    errorMessage?: string;
  }
) => {
  if (options?.confirmText && !confirm(options.confirmText)) {
    return;
  }
  
  return guardedApiCall(
    'delete-operation',
    async () => {
      await deleteFn();
      
      // 延迟刷新确保数据一致性
      setTimeout(() => {
        onSuccess();
      }, 200);
    },
    {
      successMessage: options?.successMessage || '删除成功',
      errorMessage: options?.errorMessage || '删除失败，请重试'
    }
  );
};

// ==================== 调试工具 ====================

/**
 * 竞态条件调试日志
 */
export const debugRaceCondition = (operation: string, step: string, data?: any) => {
  console.log(`🔍 [竞态调试] ${operation} - ${step}`, data || '');
};

/**
 * 性能监控 - 检测可能的竞态
 */
export const performanceMonitor = {
  timings: new Map<string, number>(),
  
  start(operation: string) {
    this.timings.set(operation, Date.now());
  },
  
  end(operation: string) {
    const start = this.timings.get(operation);
    if (start) {
      const duration = Date.now() - start;
      console.log(`⏱️ ${operation} 耗时: ${duration}ms`);
      
      if (duration > 1000) {
        console.warn(`⚠️ ${operation} 可能存在性能问题，注意竞态条件`);
      }
      
      this.timings.delete(operation);
    }
  }
};

// ==================== 导出 ====================

export default {
  createSafeHandler,
  safeNavigate,
  GlobalSubmitGuard,
  guardedApiCall,
  safeCreateQuestion,
  safeCreateAnswer,
  safeDelete,
  debugRaceCondition,
  performanceMonitor
};
