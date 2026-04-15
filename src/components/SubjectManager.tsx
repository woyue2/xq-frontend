/**
 * [POS] src/components/SubjectManager.tsx
 *   所属：components 层 | 角色：科目管理组件（管理员用）
 *   兄弟：TopicManager.tsx / SubjectTopicSelector.tsx
 *
 * [INPUT]
 *   - react                          → useState / useEffect
 *   - @/components/ui/button         → Button
 *   - @/components/ui/card           → Card / CardContent / CardHeader / CardTitle
 *   - @/components/ui/badge          → Badge
 *   - @/components/ui/alert-dialog   → AlertDialog / AlertDialogAction / AlertDialogCancel / AlertDialogContent / AlertDialogDescription / AlertDialogFooter / AlertDialogHeader / AlertDialogTitle / AlertDialogTrigger
 *   - @/types/dto                    → SubjectDTO
 *   - @/lib/error-handler            → handleApiError
 *   - @/lib/utils                    → cn
 *   - lucide-react                   → Plus / Edit / Trash2 / ChevronRight
 *   - @/components/SubjectForm       → SubjectForm / SubjectFormData
 *   - sonner                         → toast
 *
 * [OUTPUT]
 *   - SubjectManager（科目管理组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/components/CLAUDE.md 的文件清单
 */
import { useState, useEffect } from 'react';
import { mutate } from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/error-handler';
import type { SubjectDTO } from '@/types/dto';
import { Plus, Edit, Trash2, ChevronRight } from 'lucide-react';
import { SubjectForm } from './SubjectForm';
import type { SubjectFormData } from './SubjectForm';
import { toast } from 'sonner';

export interface SubjectManagerProps {
  onSubjectSelect?: (subjectKey: string) => void;
  className?: string;
}

export function SubjectManager({
  onSubjectSelect,
  className,
}: SubjectManagerProps) {
  const [subjects, setSubjects] = useState<SubjectDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectDTO | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectDTO | null>(null);

  // Load all subjects (including disabled ones for admin view)
  // Note: The current API only returns enabled subjects for public access.
  // For admin view, we should ideally have an admin=1 query parameter,
  // but for now we'll work with what's available and note this limitation.
  const loadSubjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subjects', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.code === 200) {
        // Sort by order
        const sortedSubjects = [...data.data].sort((a, b) => a.order - b.order);
        setSubjects(sortedSubjects);
      } else {
        handleApiError({ response: { status: data.code, data } });
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleSubjectClick = (subjectKey: string) => {
    setSelectedSubjectKey(subjectKey);
    onSubjectSelect?.(subjectKey);
  };

  const handleDeleteClick = (subject: SubjectDTO) => {
    setSubjectToDelete(subject);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!subjectToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/subjects?id=${subjectToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.code === 200) {
        // Remove from list
        setSubjects((prev) => prev.filter((s) => s.id !== subjectToDelete.id));
        
        // Invalidate SWR cache for subjects
        await mutate('/api/subjects');
        
        // Clear selection if deleted subject was selected
        if (selectedSubjectKey === subjectToDelete.key) {
          setSelectedSubjectKey(null);
          onSubjectSelect?.('');
        }
      } else {
        handleApiError({ response: { status: data.code, data } });
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteDialogOpen(false);
      setSubjectToDelete(null);
    }
  };

  const handleCreateSubject = () => {
    setEditingSubject(null);
    setFormDialogOpen(true);
  };

  const handleEditSubject = (subject: SubjectDTO) => {
    setEditingSubject(subject);
    setFormDialogOpen(true);
  };

  const handleFormSubmit = async (data: SubjectFormData) => {
    const token = localStorage.getItem('token');

    try {
      if (editingSubject) {
        // Update existing subject
        console.log('[SubjectManager] Updating subject:', editingSubject.id, data);
        const response = await fetch(`/api/subjects?id=${editingSubject.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        console.log('[SubjectManager] Update response:', result);

        if (result.code === 200) {
          toast.success('科目更新成功');
          // Update local state
          setSubjects((prev) =>
            prev.map((s) => (s.id === editingSubject.id ? result.data : s))
          );
          // Invalidate SWR cache for subjects
          await mutate('/api/subjects');
        } else {
          toast.error(result.message || '更新失败');
          throw { response: { status: result.code, data: result } };
        }
      } else {
        // Create new subject
        console.log('[SubjectManager] Creating subject:', data);
        const response = await fetch('/api/subjects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        console.log('[SubjectManager] Create response:', result);

        if (result.code === 201) {
          toast.success('科目创建成功');
          // Add to local state
          setSubjects((prev) => [...prev, result.data].sort((a, b) => a.order - b.order));
          // Invalidate SWR cache for subjects
          await mutate('/api/subjects');
        } else {
          toast.error(result.message || '创建失败');
          throw { response: { status: result.code, data: result } };
        }
      }
    } catch (error) {
      console.error('[SubjectManager] Form submit error:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>科目管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>科目管理</CardTitle>
        <Button onClick={handleCreateSubject} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          添加科目
        </Button>
      </CardHeader>
      <CardContent>
        {subjects.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            暂无科目，点击"添加科目"创建第一个科目
          </div>
        ) : (
          <div className="space-y-2">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-colors',
                  selectedSubjectKey === subject.key
                    ? 'bg-blue-50 border-blue-200'
                    : 'hover:bg-gray-50 cursor-pointer'
                )}
                onClick={() => handleSubjectClick(subject.key)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{subject.name}</span>
                      <Badge variant={subject.enabled ? 'default' : 'secondary'}>
                        {subject.enabled ? '启用' : '禁用'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        排序: {subject.order}
                      </span>
                    </div>
                    {subject.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {subject.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSubject(subject);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog
                    open={deleteDialogOpen && subjectToDelete?.id === subject.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        setDeleteDialogOpen(false);
                        setSubjectToDelete(null);
                      }
                    }}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(subject);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要删除科目「{subject.name}」吗？此操作不可撤销。
                          {subject.enabled && (
                            <span className="block mt-2 text-amber-600">
                              注意：该科目当前处于启用状态。
                            </span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteConfirm}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Subject Form Dialog */}
      <SubjectForm
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        initialData={editingSubject || undefined}
        onSubmit={handleFormSubmit}
        onCancel={() => setEditingSubject(null)}
      />
    </Card>
  );
}
