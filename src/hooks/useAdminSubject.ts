/**
 * [POS] src/hooks/useAdminSubject.ts
 *   所属：hooks 层 | 角色：科目/考点配置全量 state + API 交互逻辑
 *   兄弟：useAdminDimension.ts（同 hooks 层，题目维度配置）
 *
 * [INPUT]
 *   - react                          → useState
 *   - sonner                         → toast
 *   - @/services/api                 → adminService
 *   - @/services/subjectConfig.service → subjectConfigService
 *   - @/types/api                    → SubjectAdminDto / TopicAdminDto
 *
 * [OUTPUT]
 *   - useAdminSubject() → subjects / selectedSubject / topics / loading 状态 / 全部 handler
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/hooks/CLAUDE.md 的文件清单
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { adminService } from '@/services/api';
import { subjectConfigService } from '@/services/subjectConfig.service';
import type { SubjectAdminDto, TopicAdminDto } from '@/types/api';

export function useAdminSubject() {
  const [subjects, setSubjects] = useState<SubjectAdminDto[]>([]);
  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string | null>(null);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);

  const selectedSubject = subjects.find((s) => s.key === selectedSubjectKey) ?? null;
  const topics: TopicAdminDto[] = selectedSubject
    ? [...selectedSubject.topics].sort((a, b) => a.order - b.order)
    : [];

  const loadSubjects = async () => {
    try {
      setLoadingSubjects(true);
      const list = await adminService.getSubjects();
      setSubjects(list);
      if (!selectedSubjectKey && list.length > 0) {
        setSelectedSubjectKey(list[0].key);
      }
    } catch {
      toast.error('加载科目配置失败，请稍后重试');
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSaveSubjectMeta = async () => {
    if (!selectedSubject) return;
    try {
      setSavingSubject(true);
      const updated = await adminService.updateSubject(selectedSubject.key, {
        name: selectedSubject.name,
        enabled: selectedSubject.enabled,
        order: selectedSubject.order,
      });
      setSubjects((prev) =>
        prev.map((s) =>
          s.key === updated.key
            ? { ...s, name: updated.name, enabled: updated.enabled, order: updated.order }
            : s,
        ),
      );
      toast.success('科目信息已保存');
      subjectConfigService.clearCache();
    } catch {
      toast.error('保存失败，请稍后重试');
    } finally {
      setSavingSubject(false);
    }
  };

  const setSelectedSubjectField = (field: keyof SubjectAdminDto, value: unknown) => {
    setSubjects((prev) =>
      prev.map((s) => (s.key === selectedSubjectKey ? { ...s, [field]: value } : s)),
    );
  };

  const handleUpdateTopic = async (topic: TopicAdminDto) => {
    if (!selectedSubject) return;
    try {
      const updated = await adminService.updateSubjectTopic(selectedSubject.key, topic.id, {
        label: topic.label,
        order: topic.order,
        enabled: topic.enabled,
      });
      setSubjects((prev) =>
        prev.map((s) =>
          s.key === selectedSubject.key
            ? { ...s, topics: s.topics.map((t) => (t.id === updated.id ? updated : t)) }
            : s,
        ),
      );
      toast.success('考点已更新');
      subjectConfigService.clearCache();
    } catch {
      toast.error('更新失败，请稍后重试');
    }
  };

  const handleAddTopic = async () => {
    if (!selectedSubject) return;
    const label = `新考点 ${Date.now().toString().slice(-4)}`;
    const value = `${selectedSubject.key.replace('subject_', '')}_topic_${Date.now()}`;
    const maxOrder = topics.reduce((m, t) => Math.max(m, t.order), 0);
    try {
      const created = await adminService.createSubjectTopic(selectedSubject.key, {
        value,
        label,
        order: maxOrder + 10,
        enabled: true,
      });
      setSubjects((prev) =>
        prev.map((s) =>
          s.key === selectedSubject.key ? { ...s, topics: [...s.topics, created] } : s,
        ),
      );
      toast.success('考点已添加');
      subjectConfigService.clearCache();
    } catch {
      toast.error('添加失败，请稍后重试');
    }
  };

  const setTopicField = (id: string, field: keyof TopicAdminDto, value: unknown) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.key === selectedSubjectKey
          ? { ...s, topics: s.topics.map((t) => (t.id === id ? { ...t, [field]: value } : t)) }
          : s,
      ),
    );
  };

  return {
    subjects,
    selectedSubjectKey,
    setSelectedSubjectKey,
    selectedSubject,
    topics,
    loadingSubjects,
    savingSubject,
    loadSubjects,
    handleSaveSubjectMeta,
    setSelectedSubjectField,
    handleUpdateTopic,
    handleAddTopic,
    setTopicField,
  };
}
