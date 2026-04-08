/**
 * SubjectForm 组件使用示例
 * 
 * 展示如何在管理界面中使用 SubjectForm 组件进行科目的创建和编辑
 */
import { useState } from 'react';
import { SubjectForm } from './SubjectForm';
import type { SubjectFormData } from './SubjectForm';
import type { SubjectDTO } from '@/types/dto';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function SubjectFormExample() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectDTO | null>(null);

  // 示例：创建科目
  const handleCreateSubmit = async (data: SubjectFormData) => {
    const token = localStorage.getItem('token');
    
    const response = await fetch('/api/subjects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.code === 201) {
      toast.success('科目创建成功');
      // 刷新列表或更新状态
    } else {
      throw { response: { status: result.code, data: result } };
    }
  };

  // 示例：编辑科目
  const handleEditSubmit = async (data: SubjectFormData) => {
    if (!editingSubject) return;

    const token = localStorage.getItem('token');
    
    const response = await fetch(`/api/subjects?id=${editingSubject.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.code === 200) {
      toast.success('科目更新成功');
      setEditingSubject(null);
      // 刷新列表或更新状态
    } else {
      throw { response: { status: result.code, data: result } };
    }
  };

  // 示例科目数据
  const exampleSubject: SubjectDTO = {
    id: '1',
    key: 'math',
    name: '数学',
    description: '数学科目',
    order: 1,
    enabled: true,
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>SubjectForm 使用示例</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 创建科目示例 */}
          <div>
            <h3 className="text-lg font-semibold mb-2">创建科目</h3>
            <Button onClick={() => setCreateDialogOpen(true)}>
              打开创建表单
            </Button>
            <SubjectForm
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              onSubmit={handleCreateSubmit}
            />
          </div>

          {/* 编辑科目示例 */}
          <div>
            <h3 className="text-lg font-semibold mb-2">编辑科目</h3>
            <Button
              onClick={() => {
                setEditingSubject(exampleSubject);
                setEditDialogOpen(true);
              }}
            >
              编辑示例科目
            </Button>
            <SubjectForm
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              initialData={editingSubject || undefined}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditingSubject(null)}
            />
          </div>

          {/* 使用说明 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">使用说明</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>创建模式：不传 initialData，所有字段可编辑</li>
              <li>编辑模式：传入 initialData，key 字段不可修改</li>
              <li>表单验证：key 只能包含字母、数字、下划线和短横线</li>
              <li>必填字段：key, name, order</li>
              <li>可选字段：description</li>
              <li>启用状态：默认为 true，可通过开关切换</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
