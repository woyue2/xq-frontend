/**
 * [POS] src/lib/error-handler.example.tsx
 *   所属：lib 层 | 角色：错误处理工具使用示例
 *
 * 本文件展示如何在不同场景下使用统一错误处理工具
 */
import { useState } from 'react';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ErrorMessage } from '@/components/ui/error-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/http';

/**
 * 示例 1: 表单提交错误处理
 * 
 * 展示如何处理 400 错误并在表单字段旁显示错误信息
 */
export function FormErrorExample() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { fieldErrors, handleError, clearFieldError } = useErrorHandler();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await api.post('/api/questions', { title, content });
      // 成功处理...
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">标题</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            // 用户输入时清除该字段的错误
            clearFieldError('title');
          }}
          className={fieldErrors.title ? 'border-destructive' : ''}
        />
        {fieldErrors.title && (
          <ErrorMessage>{fieldErrors.title}</ErrorMessage>
        )}
      </div>

      <div>
        <Label htmlFor="content">内容</Label>
        <Input
          id="content"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            clearFieldError('content');
          }}
          className={fieldErrors.content ? 'border-destructive' : ''}
        />
        {fieldErrors.content && (
          <ErrorMessage>{fieldErrors.content}</ErrorMessage>
        )}
      </div>

      <Button type="submit">提交</Button>
    </form>
  );
}

/**
 * 示例 2: 删除操作冲突处理
 * 
 * 展示如何处理 409 错误（删除有关联数据的科目/考点）
 */
export function DeleteConflictExample() {
  const { handleError } = useErrorHandler({
    onConflict: (details) => {
      // 可以在这里执行额外的操作，如显示自定义对话框
      console.log('冲突详情:', details);
    },
  });

  const handleDelete = async (subjectId: string) => {
    try {
      await api.delete(`/api/subjects?id=${subjectId}`);
      // 成功处理...
    } catch (error) {
      // handleApiError 会自动显示冲突对话框
      handleError(error);
    }
  };

  return (
    <Button onClick={() => handleDelete('math')} variant="destructive">
      删除科目
    </Button>
  );
}

/**
 * 示例 3: 权限不足处理
 * 
 * 展示如何处理 403 错误
 */
export function PermissionDeniedExample() {
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  
  const { handleError } = useErrorHandler({
    onForbidden: () => {
      // 可以显示自定义的权限不足对话框
      setShowPermissionDialog(true);
    },
  });

  const handleAdminAction = async () => {
    try {
      await api.post('/api/subjects', { name: '新科目' });
      // 成功处理...
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <>
      <Button onClick={handleAdminAction}>执行管理员操作</Button>
      
      {showPermissionDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">权限不足</h3>
            <p className="text-sm text-muted-foreground mb-4">
              您没有权限执行此操作，请联系管理员。
            </p>
            <Button onClick={() => setShowPermissionDialog(false)}>
              知道了
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 示例 4: 未登录处理
 * 
 * 展示如何处理 401 错误（自动清除 token 并重定向到登录页）
 */
export function UnauthorizedExample() {
  const { handleError } = useErrorHandler({
    onUnauthorized: () => {
      // handleApiError 已经自动清除 token 并重定向
      // 这里可以执行额外的清理操作
      console.log('用户未登录，已重定向到登录页');
    },
  });

  const handleProtectedAction = async () => {
    try {
      await api.post('/api/questions', { title: '新问题' });
      // 成功处理...
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <Button onClick={handleProtectedAction}>创建问题（需要登录）</Button>
  );
}

/**
 * 示例 5: 服务器错误处理
 * 
 * 展示如何处理 500 错误
 */
export function ServerErrorExample() {
  const { handleError } = useErrorHandler({
    onServerError: () => {
      // 可以记录错误日志或执行其他操作
      console.error('服务器错误');
    },
  });

  const handleAction = async () => {
    try {
      await api.get('/api/questions');
      // 成功处理...
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <Button onClick={handleAction}>获取问题列表</Button>
  );
}
