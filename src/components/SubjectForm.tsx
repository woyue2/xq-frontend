/**
 * [POS] src/components/SubjectForm.tsx
 *   所属：components 层 | 角色：科目创建和编辑表单
 *   兄弟：TopicForm.tsx / SubjectManager.tsx
 *
 * [INPUT]
 *   - react                          → useState / useEffect
 *   - @/components/ui/dialog         → Dialog / DialogContent / DialogHeader / DialogTitle / DialogFooter
 *   - @/components/ui/button         → Button
 *   - @/components/ui/input          → Input
 *   - @/components/ui/label          → Label
 *   - @/components/ui/textarea       → Textarea
 *   - @/components/ui/switch         → Switch
 *   - @/types/dto                    → SubjectDTO
 *   - @/lib/error-handler            → handleApiError
 *
 * [OUTPUT]
 *   - SubjectForm（科目表单组件）
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { handleApiError } from '@/lib/error-handler';
import type { SubjectDTO } from '@/types/dto';

export interface SubjectFormData {
  key: string;
  name: string;
  description?: string;
  order: number;
  enabled: boolean;
}

export interface SubjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<SubjectDTO>;
  onSubmit: (data: SubjectFormData) => Promise<void>;
  onCancel?: () => void;
}

export function SubjectForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  onCancel,
}: SubjectFormProps) {
  const isEditMode = !!initialData?.id;

  // Form state
  const [formData, setFormData] = useState<SubjectFormData>({
    key: '',
    name: '',
    description: '',
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
        key: initialData?.key || '',
        name: initialData?.name || '',
        description: initialData?.description || '',
        order: initialData?.order ?? 0,
        enabled: initialData?.enabled ?? true,
      });
      setErrors({});
    }
  }, [open, initialData]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate key (required, alphanumeric and dash/underscore only)
    if (!formData.key.trim()) {
      newErrors.key = 'key 为必填项';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.key)) {
      newErrors.key = 'key 只能包含字母、数字、下划线和短横线';
    }

    // Validate name (required)
    if (!formData.name.trim()) {
      newErrors.name = 'name 为必填项';
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
            {isEditMode ? '编辑科目' : '创建科目'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Key field */}
          <div className="space-y-2">
            <Label htmlFor="key">
              Key <span className="text-red-500">*</span>
            </Label>
            <Input
              id="key"
              value={formData.key}
              onChange={(e) =>
                setFormData({ ...formData, key: e.target.value })
              }
              disabled={isEditMode || submitting}
              placeholder="例如：math, chinese, english"
              className={errors.key ? 'border-red-500' : ''}
            />
            {errors.key && (
              <p className="text-sm text-red-500">{errors.key}</p>
            )}
            {isEditMode && (
              <p className="text-xs text-gray-500">
                编辑模式下 key 不可修改
              </p>
            )}
          </div>

          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="name">
              名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={submitting}
              placeholder="例如：数学、语文、英语"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Description field */}
          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={submitting}
              placeholder="科目描述（可选）"
              rows={3}
            />
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
