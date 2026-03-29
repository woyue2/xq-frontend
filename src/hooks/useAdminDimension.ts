/**
 * [POS] src/hooks/useAdminDimension.ts
 *   所属：hooks 层 | 角色：题目维度配置（method 维度）全量 state + API 交互逻辑
 *   兄弟：useAdminWhitelist.ts（同 hooks 层，管理员白名单）
 *
 * [INPUT]
 *   - react              → useState
 *   - sonner             → toast
 *   - @/services/api     → adminService
 *   - @/types/api        → QuestionDimensionDto / QuestionDimensionOptionDto
 *
 * [OUTPUT]
 *   - useAdminDimension() → methodDimension / methodOptions / loading 状态 / 全部 handler
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/hooks/CLAUDE.md 的文件清单
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { adminService } from '@/services/api';
import type { QuestionDimensionDto, QuestionDimensionOptionDto } from '@/types/api';

export function useAdminDimension() {
  const [methodDimension, setMethodDimension] = useState<QuestionDimensionDto | null>(null);
  const [methodOptions, setMethodOptions] = useState<QuestionDimensionOptionDto[]>([]);
  const [loadingMethodDim, setLoadingMethodDim] = useState(false);
  const [savingMethodMeta, setSavingMethodMeta] = useState(false);

  const loadMethodDimension = async () => {
    try {
      setLoadingMethodDim(true);
      const dims = await adminService.getQuestionDimensions();
      const methodDim = dims.find((d) => d.key === 'method') ?? null;
      setMethodDimension(methodDim);
      setMethodOptions(
        (methodDim?.options ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      );
    } catch {
      toast.error('加载题目维度配置失败，请稍后重试');
      setMethodDimension(null);
      setMethodOptions([]);
    } finally {
      setLoadingMethodDim(false);
    }
  };

  const handleSaveMethodMeta = async () => {
    if (!methodDimension) return;
    try {
      setSavingMethodMeta(true);
      const updated = await adminService.updateQuestionDimension(methodDimension.key, {
        name: methodDimension.name,
        enabled: methodDimension.enabled,
      });
      setMethodDimension(updated);
      toast.success('解题方法维度配置已保存');
    } catch {
      toast.error('保存解题方法维度配置失败');
    } finally {
      setSavingMethodMeta(false);
    }
  };

  const handleUpdateMethodOption = async (option: QuestionDimensionOptionDto) => {
    if (!methodDimension) return;
    try {
      await adminService.updateQuestionDimensionOption(methodDimension.key, option.id, {
        label: option.label,
        order: option.order,
        enabled: option.enabled,
      });
      toast.success('选项已更新');
    } catch {
      toast.error('更新选项失败');
    }
  };

  const handleAddMethodOption = async () => {
    if (!methodDimension) return;
    const value = window.prompt('请输入新选项的内部值（例如：代入法）');
    if (!value) return;
    const label = window.prompt('请输入显示文案', value);
    if (!label) return;
    try {
      const maxOrder =
        methodOptions.length > 0 ? Math.max(...methodOptions.map((o) => o.order ?? 0)) : 0;
      const created = await adminService.createQuestionDimensionOption(methodDimension.key, {
        value,
        label,
        order: maxOrder + 10,
        enabled: true,
      });
      setMethodOptions(
        [...methodOptions, created].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      );
      toast.success('已新增选项');
    } catch {
      toast.error('新增选项失败');
    }
  };

  return {
    methodDimension,
    setMethodDimension,
    methodOptions,
    setMethodOptions,
    loadingMethodDim,
    savingMethodMeta,
    loadMethodDimension,
    handleSaveMethodMeta,
    handleUpdateMethodOption,
    handleAddMethodOption,
  };
}
