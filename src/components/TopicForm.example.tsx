/**
 * TopicForm 组件示例
 * 
 * 展示如何使用 TopicForm 组件创建和编辑考点
 */
import { useState } from 'react';
import { TopicForm, type TopicFormData } from './TopicForm';
import { Button } from '@/components/ui/button';
import type { TopicDTO } from '@/types/dto';

export function TopicFormExample() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // 示例：现有考点数据
  const existingTopic: TopicDTO = {
    id: '1',
    subjectKey: 'math',
    value: 'algebra',
    label: '代数',
    order: 1,
    enabled: true,
  };

  // 处理创建提交
  const handleCreateSubmit = async (data: TopicFormData) => {
    console.log('Creating topic:', data);
    
    // 实际应用中，这里会调用 API
    const token = localStorage.getItem('token');
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
      console.log('Topic created:', result.data);
    }
  };

  // 处理编辑提交
  const handleEditSubmit = async (data: TopicFormData) => {
    console.log('Updating topic:', data);
    
    // 实际应用中，这里会调用 API
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/subjects?topicId=${existingTopic.id}`, {
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
      console.log('Topic updated:', result.data);
    }
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">TopicForm 组件示例</h1>

      <div className="space-x-4">
        <Button onClick={() => setCreateOpen(true)}>
          打开创建表单
        </Button>
        <Button onClick={() => setEditOpen(true)} variant="outline">
          打开编辑表单
        </Button>
      </div>

      {/* 创建表单 */}
      <TopicForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        subjectKey="math"
        onSubmit={handleCreateSubmit}
      />

      {/* 编辑表单 */}
      <TopicForm
        open={editOpen}
        onOpenChange={setEditOpen}
        subjectKey="math"
        initialData={existingTopic}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}
