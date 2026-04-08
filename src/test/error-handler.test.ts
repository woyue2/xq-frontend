/**
 * [POS] src/test/error-handler.test.ts
 *   所属：test 层 | 角色：错误处理工具单元测试
 *
 * 测试统一错误处理工具的各种场景
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleApiError, showConflictDialog, extractFieldErrors, ApiError } from '@/lib/error-handler';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      logout: vi.fn(),
    })),
  },
}));

describe('error-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.href
    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('handleApiError', () => {
    it('should handle 401 error - clear token and redirect to login', () => {
      const error = {
        response: {
          status: 401,
          data: {
            code: 401,
            message: '未登录',
          },
        },
      };

      const mockLogout = vi.fn();
      vi.mocked(useAuthStore.getState).mockReturnValue({
        logout: mockLogout,
      } as any);

      handleApiError(error);

      expect(mockLogout).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('登录已过期，请重新登录');
    });

    it('should handle 403 error - show permission denied message', () => {
      const error = {
        response: {
          status: 403,
          data: {
            code: 403,
            message: '权限不足',
          },
        },
      };

      handleApiError(error);

      expect(toast.error).toHaveBeenCalledWith('权限不足，无法执行此操作');
    });

    it('should handle 400 error with field details', () => {
      const error = {
        response: {
          status: 400,
          data: {
            code: 400,
            message: '请求参数错误',
            details: {
              title: '标题不能为空',
              content: '内容不能超过500字',
            },
          },
        },
      };

      const onBadRequest = vi.fn();
      handleApiError(error, { onBadRequest });

      expect(onBadRequest).toHaveBeenCalledWith({
        title: '标题不能为空',
        content: '内容不能超过500字',
      });
    });

    it('should handle 400 error without field details', () => {
      const error = {
        response: {
          status: 400,
          data: {
            code: 400,
            message: '请求参数错误',
          },
        },
      };

      handleApiError(error);

      expect(toast.error).toHaveBeenCalledWith('请求参数错误');
    });

    it('should handle 409 error - show conflict dialog', () => {
      const error = {
        response: {
          status: 409,
          data: {
            code: 409,
            message: '无法删除科目「数学」，存在 15 个关联问题',
          },
        },
      };

      const onConflict = vi.fn();
      handleApiError(error, { onConflict });

      expect(toast.error).toHaveBeenCalled();
      expect(onConflict).toHaveBeenCalledWith({
        type: 'subject',
        name: '数学',
        relatedCount: 15,
        relatedType: 'questions',
      });
    });

    it('should handle 500 error - show server error message', () => {
      const error = {
        response: {
          status: 500,
          data: {
            code: 500,
            message: '服务器内部错误',
          },
        },
      };

      handleApiError(error);

      expect(toast.error).toHaveBeenCalledWith('服务器繁忙，请稍后再试');
    });

    it('should handle unknown error', () => {
      const error = {
        response: {
          status: 418,
          data: {
            code: 418,
            message: "I'm a teapot",
          },
        },
      };

      handleApiError(error);

      expect(toast.error).toHaveBeenCalledWith("I'm a teapot");
    });

    it('should handle network error without response', () => {
      const error = {
        message: 'Network Error',
      };

      const result = handleApiError(error);

      expect(result.code).toBe(500);
      expect(result.message).toBe('网络错误');
      expect(toast.error).toHaveBeenCalledWith('网络错误');
    });
  });

  describe('showConflictDialog', () => {
    it('should show conflict dialog for subject with questions', () => {
      showConflictDialog({
        type: 'subject',
        name: '数学',
        relatedCount: 15,
        relatedType: 'questions',
      });

      expect(toast.error).toHaveBeenCalledWith(
        '无法删除科目「数学」，存在 15 个关联问题。请先删除或转移这些问题。',
        { duration: 5000 }
      );
    });

    it('should show conflict dialog for subject with topics', () => {
      showConflictDialog({
        type: 'subject',
        name: '数学',
        relatedCount: 3,
        relatedType: 'topics',
      });

      expect(toast.error).toHaveBeenCalledWith(
        '无法删除科目「数学」，存在 3 个关联考点。请先删除或转移这些考点。',
        { duration: 5000 }
      );
    });

    it('should show conflict dialog for topic with questions', () => {
      showConflictDialog({
        type: 'topic',
        name: '代数',
        relatedCount: 8,
        relatedType: 'questions',
      });

      expect(toast.error).toHaveBeenCalledWith(
        '无法删除考点「代数」，存在 8 个关联问题。请先删除或转移这些问题。',
        { duration: 5000 }
      );
    });
  });

  describe('extractFieldErrors', () => {
    it('should extract field errors from API error', () => {
      const apiError: ApiError = {
        code: 400,
        message: '请求参数错误',
        details: {
          title: '标题不能为空',
          content: '内容不能超过500字',
        },
      };

      const fieldErrors = extractFieldErrors(apiError);

      expect(fieldErrors).toEqual({
        title: '标题不能为空',
        content: '内容不能超过500字',
      });
    });

    it('should return empty object when no details', () => {
      const apiError: ApiError = {
        code: 400,
        message: '请求参数错误',
      };

      const fieldErrors = extractFieldErrors(apiError);

      expect(fieldErrors).toEqual({});
    });
  });

  describe('conflict message parsing', () => {
    it('should parse subject with questions conflict message', () => {
      const error = {
        response: {
          status: 409,
          data: {
            code: 409,
            message: '无法删除科目「数学」，存在 15 个关联问题',
          },
        },
      };

      const onConflict = vi.fn();
      handleApiError(error, { onConflict });

      expect(onConflict).toHaveBeenCalledWith({
        type: 'subject',
        name: '数学',
        relatedCount: 15,
        relatedType: 'questions',
      });
    });

    it('should parse subject with topics conflict message', () => {
      const error = {
        response: {
          status: 409,
          data: {
            code: 409,
            message: '无法删除科目『英语』，存在 5 个关联考点',
          },
        },
      };

      const onConflict = vi.fn();
      handleApiError(error, { onConflict });

      expect(onConflict).toHaveBeenCalledWith({
        type: 'subject',
        name: '英语',
        relatedCount: 5,
        relatedType: 'topics',
      });
    });

    it('should parse topic with questions conflict message', () => {
      const error = {
        response: {
          status: 409,
          data: {
            code: 409,
            message: '无法删除考点「代数」，存在 8 个关联问题',
          },
        },
      };

      const onConflict = vi.fn();
      handleApiError(error, { onConflict });

      expect(onConflict).toHaveBeenCalledWith({
        type: 'topic',
        name: '代数',
        relatedCount: 8,
        relatedType: 'questions',
      });
    });

    it('should handle unparseable conflict message', () => {
      const error = {
        response: {
          status: 409,
          data: {
            code: 409,
            message: '操作冲突',
          },
        },
      };

      const onConflict = vi.fn();
      handleApiError(error, { onConflict });

      expect(toast.error).toHaveBeenCalledWith('操作冲突');
      expect(onConflict).toHaveBeenCalledWith(undefined);
    });
  });
});
