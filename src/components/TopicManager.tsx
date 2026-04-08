/**
 * [POS] src/components/TopicManager.tsx
 *   所属：components 层 | 角色：考点管理组件（管理员用）
 *   兄弟：SubjectManager.tsx / SubjectTopicSelector.tsx
 *
 * [INPUT]
 *   - react                          → useState / useEffect
 *   - @/components/ui/button         → Button
 *   - @/components/ui/card           → Card / CardContent / CardHeader / CardTitle
 *   - @/components/ui/badge          → Badge
 *   - @/components/ui/alert-dialog   → AlertDialog / AlertDialogAction / AlertDialogCancel / AlertDialogContent / AlertDialogDescription / AlertDialogFooter / AlertDialogHeader / AlertDialogTitle / AlertDialogTrigger
 *   - @/types/dto                    → TopicDTO
 *   - @/lib/error-handler            → handleApiError
 *   - @/lib/utils                    → cn
 *   - lucide-react                   → Plus / Edit / Trash2
 *
 * [OUTPUT]
 *   - TopicManager（考点管理组件）
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
import type { TopicDTO } from '@/types/dto';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { TopicForm, type TopicFormData } from '@/components/TopicForm';

export interface TopicManagerProps {
  subjectKey: string;
  className?: string;
}

export function TopicManager({ subjectKey, className }: TopicManagerProps) {
  const [topics, setTopics] = useState<TopicDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<TopicDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicDTO | null>(null);

  // Load topics for the selected subject
  const loadTopics = async () => {
    if (!subjectKey) {
      setTopics([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/subjects?key=${subjectKey}&topics=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();

      if (data.code === 200) {
        // Sort by order
        const sortedTopics = [...data.data].sort((a, b) => a.order - b.order);
        setTopics(sortedTopics);
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
    loadTopics();
  }, [subjectKey]);

  const handleDeleteClick = (topic: TopicDTO) => {
    setTopicToDelete(topic);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!topicToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/subjects?topicId=${topicToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();

      if (data.code === 200) {
        // Remove from list
        setTopics((prev) => prev.filter((t) => t.id !== topicToDelete.id));
        // Invalidate SWR cache for topics
        await mutate(`/api/subjects?key=${subjectKey}&topics=1`);
      } else {
        handleApiError({ response: { status: data.code, data } });
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setDeleteDialogOpen(false);
      setTopicToDelete(null);
    }
  };

  const handleCreateTopic = () => {
    setEditingTopic(null);
    setFormOpen(true);
  };

  const handleEditTopic = (topic: TopicDTO) => {
    setEditingTopic(topic);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: TopicFormData) => {
    const token = localStorage.getItem('token');
    
    if (editingTopic) {
      // Update existing topic
      const response = await fetch(`/api/subjects?topicId=${editingTopic.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          label: data.label,
          order: data.order,
          enabled: data.enabled,
        }),
      });

      const result = await response.json();

      if (result.code === 200) {
        // Update in list
        setTopics((prev) =>
          prev.map((t) => (t.id === editingTopic.id ? result.data : t))
        );
        // Invalidate SWR cache for topics
        await mutate(`/api/subjects?key=${subjectKey}&topics=1`);
      } else {
        throw { response: { status: result.code, data: result } };
      }
    } else {
      // Create new topic
      const response = await fetch('/api/subjects?topics=1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.code === 201) {
        // Add to list and sort
        setTopics((prev) => [...prev, result.data].sort((a, b) => a.order - b.order));
        // Invalidate SWR cache for topics
        await mutate(`/api/subjects?key=${subjectKey}&topics=1`);
      } else {
        throw { response: { status: result.code, data: result } };
      }
    }
  };

  if (!subjectKey) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>考点管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            请先选择一个科目
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>考点管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn('w-full', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>考点管理</CardTitle>
          <Button onClick={handleCreateTopic} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            添加考点
          </Button>
        </CardHeader>
      <CardContent>
        {topics.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            暂无考点，点击"添加考点"创建第一个考点
          </div>
        ) : (
          <div className="space-y-2">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{topic.label}</span>
                      <Badge
                        variant={topic.enabled ? 'default' : 'secondary'}
                      >
                        {topic.enabled ? '启用' : '禁用'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        排序: {topic.order}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      值: {topic.value}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditTopic(topic)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog
                    open={
                      deleteDialogOpen && topicToDelete?.id === topic.id
                    }
                    onOpenChange={(open) => {
                      if (!open) {
                        setDeleteDialogOpen(false);
                        setTopicToDelete(null);
                      }
                    }}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(topic)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要删除考点「{topic.label}」吗？此操作不可撤销。
                          {topic.enabled && (
                            <span className="block mt-2 text-amber-600">
                              注意：该考点当前处于启用状态。
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
    </Card>

      <TopicForm
        open={formOpen}
        onOpenChange={setFormOpen}
        subjectKey={subjectKey}
        initialData={editingTopic || undefined}
        onSubmit={handleFormSubmit}
        onCancel={() => {
          setFormOpen(false);
          setEditingTopic(null);
        }}
      />
    </>
  );
}
