/**
 * SubjectForm 组件测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SubjectForm } from '@/components/SubjectForm';
import type { SubjectFormData } from '@/components/SubjectForm';
import type { SubjectDTO } from '@/types/dto';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('SubjectForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('创建模式', () => {
    it('应该渲染创建表单', () => {
      render(
        <SubjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('创建科目')).toBeInTheDocument();
      expect(screen.getByLabelText(/Key/)).toBeInTheDocument();
      expect(screen.getByLabelText(/名称/)).toBeInTheDocument();
      expect(screen.getByLabelText(/描述/)).toBeInTheDocument();
      expect(screen.getByLabelText(/排序/)).toBeInTheDocument();
      expect(screen.getByLabelText(/启用状态/)).toBeInTheDocument();
    });

    it('应该允许输入所有字段', () => {
      render(
        <SubjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const keyInput = screen.getByLabelText(/Key/) as HTMLInputElement;
      const nameInput = screen.getByLabelText(/名称/) as HTMLInputElement;
      const descInput = screen.getByLabelText(/描述/) as HTMLTextAreaElement;
      const orderInput = screen.getByLabelText(/排序/) as HTMLInputElement;

      fireEvent.change(keyInput, { target: { value: 'math' } });
      fireEvent.change(nameInput, { target: { value: '数学' } });
      fireEvent.change(descInput, { target: { value: '数学科目' } });
      fireEvent.change(orderInput, { target: { value: '1' } });

      expect(keyInput.value).toBe('math');
      expect(nameInput.value).toBe('数学');
      expect(descInput.value).toBe('数学科目');
      expect(orderInput.value).toBe('1');
    });

    it('应该验证必填字段', async () => {
      render(
        <SubjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByText('创建');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('key 为必填项')).toBeInTheDocument();
        expect(screen.getByText('name 为必填项')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('应该验证 key 格式', async () => {
      render(
        <SubjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const keyInput = screen.getByLabelText(/Key/);
      fireEvent.change(keyInput, { target: { value: '数学@#$' } });

      const submitButton = screen.getByText('创建');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('key 只能包含字母、数字、下划线和短横线')
        ).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('应该提交有效的表单数据', async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <SubjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const keyInput = screen.getByLabelText(/Key/);
      const nameInput = screen.getByLabelText(/名称/);
      const descInput = screen.getByLabelText(/描述/);
      const orderInput = screen.getByLabelText(/排序/);

      fireEvent.change(keyInput, { target: { value: 'math' } });
      fireEvent.change(nameInput, { target: { value: '数学' } });
      fireEvent.change(descInput, { target: { value: '数学科目' } });
      fireEvent.change(orderInput, { target: { value: '1' } });

      const submitButton = screen.getByText('创建');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          key: 'math',
          name: '数学',
          description: '数学科目',
          order: 1,
          enabled: true,
        });
      });

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('编辑模式', () => {
    const existingSubject: SubjectDTO = {
      id: '1',
      key: 'math',
      name: '数学',
      description: '数学科目',
      order: 1,
      enabled: true,
    };

    it('应该渲染编辑表单', () => {
      render(
        <SubjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          initialData={existingSubject}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('编辑科目')).toBeInTheDocument();
      expect(screen.getByText('保存')).toBeInTheDocument();
    });

    it('应该填充初始数据', () => {
      render(
        <SubjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          initialData={existingSubject}
          onSubmit={mockOnSubmit}
        />
      );

      const keyInput = screen.getByLabelText(/Key/) as HTMLInputElement;
      const nameInput = screen.getByLabelText(/名称/) as HTMLInputElement;
      const descInput = screen.getByLabelText(/描述/) as HTMLTextAreaElement;
      const orderInput = screen.getByLabelText(/排序/) as HTMLInputElement;

      expect(keyInput.value).toBe('math');
      expect(nameInput.value).toBe('数学');
      expect(descInput.value).toBe('数学科目');
      expect(orderInput.value).toBe('1');
    });

    it('应该禁用 key 字段', () => {
      render(
        <SubjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          initialData={existingSubject}
          onSubmit={mockOnSubmit}
        />
      );

      const keyInput = screen.getByLabelText(/Key/) as HTMLInputElement;
      expect(keyInput).toBeDisabled();
      expect(screen.getByText('编辑模式下 key 不可修改')).toBeInTheDocument();
    });

    it('应该允许修改其他字段', () => {
      render(
        <SubjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          initialData={existingSubject}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/名称/) as HTMLInputElement;
      const descInput = screen.getByLabelText(/描述/) as HTMLTextAreaElement;

      fireEvent.change(nameInput, { target: { value: '高等数学' } });
      fireEvent.change(descInput, { target: { value: '高等数学科目' } });

      expect(nameInput.value).toBe('高等数学');
      expect(descInput.value).toBe('高等数学科目');
    });

    it('应该提交更新的数据', async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <SubjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          initialData={existingSubject}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/名称/);
      fireEvent.change(nameInput, { target: { value: '高等数学' } });

      const submitButton = screen.getByText('保存');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          key: 'math',
          name: '高等数学',
          description: '数学科目',
          order: 1,
          enabled: true,
        });
      });
    });
  });

  describe('启用状态切换', () => {
    it('应该切换启用状态', () => {
      render(
        <SubjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
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
        <SubjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
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
        <SubjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const keyInput = screen.getByLabelText(/Key/);
      const nameInput = screen.getByLabelText(/名称/);
      const orderInput = screen.getByLabelText(/排序/);

      fireEvent.change(keyInput, { target: { value: 'math' } });
      fireEvent.change(nameInput, { target: { value: '数学' } });
      fireEvent.change(orderInput, { target: { value: '1' } });

      const submitButton = screen.getByText('创建');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('提交中...')).toBeInTheDocument();
      });
    });
  });
});
