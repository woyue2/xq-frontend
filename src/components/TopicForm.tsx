/**
 * [POS] src/components/TopicForm.tsx
 *   所属：components 层 | 角色：考点创建和编辑表单
 *   兄弟：SubjectForm.tsx / TopicManager.tsx
 *
 * [INPUT]
 *   - react                          → useState / useEffect
 *   - @/components/ui/dialog         → Dialog / DialogContent / DialogHeader / DialogTitle / DialogFooter
 *   - @/components/ui/button         → Button
 *   - @/components/ui/input          → Input
 *   - @/components/ui/label          → Label
 *   - @/components/ui/switch         → Switch
 *   - @/types/dto                    → TopicDTO
 *   - @/lib/error-handler            → handleApiError
 *
 * [OUTPUT]
 *   - TopicForm（考点表单组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/components/CLAUDE.md 的文件清单
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { handleApiError } from '@/lib/error-handler';
import type { TopicDTO } from '@/types/dto';

export interface TopicFormData {
  subjectKey: string;
  value: string;
  label: string;
  order: number;
  enabled: boolean;
}

export interface TopicFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectKey: string;
  initialData?: Partial<TopicDTO>;
  onSubmit: (data: TopicFormData) => Promise<void>;
  onCancel?: () => void;
}

export function TopicForm({
  open,
  onOpenChange,
  subjectKey,
  initialData,
  onSubmit,
  onCancel,
}: TopicFormProps) {
  const isEditMode = !!initialData?.id;

  // Form state
  const [formData, setFormData] = useState<TopicFormData>({
    subjectKey: '',
    value: '',
    label: '',
    order: 0,
    enabled: true,
  });

  // Field errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  // Initialize form data when dialog opens or initialData changes
  useEffect(() => {
    if (open) {
      setFormData({
        subjectKey: subjectKey,
        value: initialData?.value || '',
        label: initialData?.label || '',
        order: initialData?.order ?? 0,
        enabled: initialData?.enabled ?? true,
      });
      setErrors({});
    }
  }, [open, subjectKey, initialData]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate value (required, alphanumeric and dash/underscore only)
    if (!formData.value.trim()) {
      newErrors.value = 'value 为必填项';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.value)) {
      newErrors.value = 'value 只能包含字母、数字、下划线和短横线';
    }

    // Validate label (required)
    if (!formData.label.trim()) {
      newErrors.label = 'label 为必填项';
    }

    // Validate order (must be a number)
    if (typeof formData.order !== 'number' || isNaN(formData.order)) {
      newErrors.order = 'order 必须为数字';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      handleApiError(error, {
        onBadRequest: (details) => {
          if (details) {
            setErrors(details);
          }
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? '编辑考点' : '创建考点'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Value field */}
          <div className="space-y-2">
            <Label htmlFor="value">
              Value <span className="text-red-500">*</span>
            </Label>
            <Input
              id="value"
              value={formData.value}
              onChange={(e) =>
                setFormData({ ...formData, value: e.target.value })
              }
              disabled={isEditMode || submitting}
              placeholder="例如：algebra, geometry, calculus"
              className={errors.value ? 'border-red-500' : ''}
            />
            {errors.value && (
              <p className="text-sm text-red-500">{errors.value}</p>
            )}
            {isEditMode && (
              <p className="text-xs text-gray-500">
                编辑模式下 value 不可修改
              </p>
            )}
          </div>

          {/* Label field */}
          <div className="space-y-2">
            <Label htmlFor="label">
              名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) =>
                setFormData({ ...formData, label: e.target.value })
              }
              disabled={submitting}
              placeholder="例如：代数、几何、微积分"
              className={errors.label ? 'border-red-500' : ''}
            />
            {errors.label && (
              <p className="text-sm text-red-500">{errors.label}</p>
            )}
          </div>

          {/* Order field */}
          <div className="space-y-2">
            <Label htmlFor="order">
              排序 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="order"
              type="number"
              value={formData.order}
              onChange={(e) =>
                setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })
              }
              disabled={submitting}
              placeholder="数字越小越靠前"
              className={errors.order ? 'border-red-500' : ''}
            />
            {errors.order && (
              <p className="text-sm text-red-500">{errors.order}</p>
            )}
          </div>

          {/* Enabled switch */}
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">启用状态</Label>
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, enabled: checked })
              }
              disabled={submitting}
            />
          </div>

          {/* Form actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '提交中...' : isEditMode ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
