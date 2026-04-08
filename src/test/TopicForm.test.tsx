/**
 * TopicForm 组件测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopicForm } from '@/components/TopicForm';
import type { TopicFormData } from '@/components/TopicForm';
import type { TopicDTO } from '@/types/dto';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('TopicForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnOpenChange = vi.fn();
  const testSubjectKey = 'math';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('创建模式', () => {
    it('应该渲染创建表单', () => {
      render(
        <TopicForm
          open={true}
          onOpenChange={mockOnOpenChange}
          subjectKey={testSubjectKey}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('创建考点')).toBeInTheDocument();
      expect(screen.getByLabelText(/Value/)).toBeInTheDocument();
      expect(screen.getByLabelText(/名称/)).toBeInTheDocument();
      expect(screen.getByLabelText(/排序/)).toBeInTheDocument();
      expect(screen.getByLabelText(/启用状态/)).toBeInTheDocument();
    });

    it('应该允许输入所有字段', () => {
      render(
        <TopicForm
          open={true}
          onOpenChange={mockOnOpenChange}
          subjectKey={testSubjectKey}
          onSubmit={mockOnSubmit}
        />
      );

      const valueInput = screen.getByLabelText(/Value/) as HTMLInputElement;
      const labelInput = screen.getByLabelText(/名称/) as HTMLInputElement;
      const orderInput = screen.getByLabelText(/排序/) as HTMLInputElement;

      fireEvent.change(valueInput, { target: { value: 'algebra' } });
      fireEvent.change(labelInput, { target: { value: '代数' } });
      fireEvent.change(orderInput, { target: { value: '1' } });

      expect(valueInput.value).toBe('algebra');
      expect(labelInput.value).toBe('代数');
      expect(orderInput.value).toBe('1');
    });

    it('应该验证必填字段', async () => {
      render(
        <TopicForm
          open={true}
          onOpenChange={mockOnOpenChange}
          subjectKey={testSubjectKey}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByText('创建');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('value 为必填项')).toBeInTheDocument();
        expect(screen.getByText('label 为必填项')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('应该验证 value 格式', async () => {
      render(
        <TopicForm
          open={true}
          onOpenChange={mockOnOpenChange}
          subjectKey={testSubjectKey}
          onSubmit={mockOnSubmit}
        />
      );

      const valueInput = screen.getByLabelText(/Value/);
      fireEvent.change(valueInput, { target: { value: '代数@#$' } });

      const submitButton = screen.getByText('创建');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('value 只能包含字母、数字、下划线和短横线')
        ).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('应该提交有效的表单数据', async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <TopicForm
          open={true}
          onOpenChange={mockOnOpenChange}
          subjectKey={testSubjectKey}
          onSubmit={mockOnSubmit}
        />
      );

      const valueInput = screen.getByLabelText(/Value/);
      const labelInput = screen.getByLabelText(/名称/);
      const orderInput = screen.getByLabelText(/排序/);

      fireEvent.change(valueInput, { target: { value: 'algebra' } });
      fireEvent.change(labelInput, { target: { value: '代数' } });
      fireEvent.change(orderInput, { target: { value: '1' } });

      const submitButton = screen.getByText('创建');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          subjectKey: testSubjectKey,
          value: 'algebra',
          label: '代数',
          order: 1,
          enabled: true,
        });
      });

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('编辑模式', () => {
    const existingTopic: TopicDTO = {
      id: '1',
      subjectKey: testSubjectKey,
      value: 'algebra',
      label: '代数',
      order: 1,
      enabled: true,
    };

    it('应该渲染编辑表单', () => {
      render(
        <TopicForm
          open={true}
          onOpenChange={mockOnOpenChange}
          subjectKey={testSubjectKey}
          initialData={existingTopic}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('编辑考点')).toBeInTheDocument();
      expect(screen.getByText('保存')).toBeInTheDocument();
    });

    it('应该填充初始数据', () => {
      render(
        <TopicForm
          open={true}
          onOpenChange={mockOnOpenChange}
          subjectKey={testSubjectKey}
          initialData={existingTopic}
          onSubmit={mockOnSubmit}
        />
      );

      const valueInput = screen.getByLabelText(/Value/) as HTMLInputElement;
      const labelInput = screen.getByLabelText(/名称/) as HTMLInputElement;
      const orderInput = screen.getByLabelText(/排序/) as HTMLInputElement;

      expect(valueInput.value).toBe('algebra');
      expect(labelInput.value).toBe('代数');
      expect(orderInput.value).toBe('1');
    });

    it('应该禁用 value 字段', () => {
      render(
        <TopicForm
          open={true}
          onOpenChange={mockOnOpenChange}
          subjectKey={testSubjectKey}
          initialData={existingTopic}
          onSubmit={mockOnSubmit}
        />
      );

      const valueInput = screen.getByLabelText(/Value/) as HTMLInputElement;
      expect(valueInput).toBeDisabled();
      expect(screen.getByText('编辑模式下 value 不可修改')).toBeInTheDocument();
    });

    it('应该允许修改其他字段', () => {
      render(
        <TopicForm
          open={true}
          onOpenChange={mockOnOpenChange}
          subjectKey={testSubjectKey}
          initialData={existingTopic}
          onSubmit={mockOnSubmit}
        />
      );

      const labelInput = screen.getByLabelText(/名称/) as HTMLInputElement;
      const orderInput = screen.getByLabelText(/排序/) as HTMLInputElement;

      fireEvent.change(labelInput, { target: { value: '高等代数' } });
      fireEvent.change(orderInput, { target: { value: '2' } });

      expect(labelInput.value).toBe('高等代数');
      expect(orderInput.value).toBe('2');
    });

    it('应该提交更新的数据', async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <TopicForm
          open={true}
          onOpenChange={mockOnOpenChange}
          subjectKey={testSubjectKey}
          initialData={existingTopic}
          onSubmit={mockOnSubmit}
        />
      );

      const labelInput = screen.getByLabelText(/名称/);
      fireEvent.change(labelInput, { target: { value: '高等代数' } });

      const submitButton = screen.getByText('保存');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          subjectKey: testSubjectKey,
          value: 'algebra',
          label: '高等代数',
          order: 1,
          enabled: true,
        });
      });
    });
  });

  describe('启用状态切换', () => {
    it('应该切换启用状态', () => {
      render(
        <TopicForm
          open={true}
          onOpenChange={mockOnOpenChange}
          subjectKey={testSubjectKey}
          onSubmit={mockOnSubmit}
        />
      );

      const enabledSwitch = screen.getByRole('switch');
      expect(enabledSwitch).toBeChecked();

      fireEvent.click(enabledSwitch);
      expect(enabledSwitch).not.toBeChecked();

      fireEvent.click(enabledSwitch);
      expect(enabledSwitch).toBeChecked();
    });
  });

  describe('取消操作', () => {
    it('应该调用 onCancel 和关闭对话框', () => {
      render(
        <TopicForm
          open={true}
          onOpenChange={mockOnOpenChange}
          subjectKey={testSubjectKey}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('取消');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('提交状态', () => {
    it('应该在提交时禁用表单', async () => {
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <TopicForm
          open={true}
          onOpenChange={mockOnOpenChange}
          subjectKey={testSubjectKey}
          onSubmit={mockOnSubmit}
        />
      );

      const valueInput = screen.getByLabelText(/Value/);
      const labelInput = screen.getByLabelText(/名称/);
      const orderInput = screen.getByLabelText(/排序/);

      fireEvent.change(valueInput, { target: { value: 'algebra' } });
      fireEvent.change(labelInput, { target: { value: '代数' } });
      fireEvent.change(orderInput, { target: { value: '1' } });

      const submitButton = screen.getByText('创建');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('提交中...')).toBeInTheDocument();
      });
    });
  });
});
