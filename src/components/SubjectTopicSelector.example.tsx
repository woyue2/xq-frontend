/**
 * SubjectTopicSelector 组件使用示例
 * 
 * 本文件展示 SubjectTopicSelector 组件的各种使用场景
 */

import { useState } from 'react';
import { SubjectTopicSelector } from './SubjectTopicSelector';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * 示例 1: 基础用法
 */
export function BasicExample() {
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">基础用法</h3>
      
      <SubjectTopicSelector
        subjectValue={subject}
        topicValue={topic}
        onSubjectChange={setSubject}
        onTopicChange={setTopic}
      />

      <div className="mt-4 p-4 bg-gray-50 rounded">
        <p className="text-sm">
          <strong>选中的科目:</strong> {subject || '未选择'}
        </p>
        <p className="text-sm">
          <strong>选中的考点:</strong> {topic || '未选择'}
        </p>
      </div>
    </Card>
  );
}

/**
 * 示例 2: 必填标识
 */
export function RequiredExample() {
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">必填标识</h3>
      
      <SubjectTopicSelector
        subjectValue={subject}
        topicValue={topic}
        onSubjectChange={setSubject}
        onTopicChange={setTopic}
        required
      />
    </Card>
  );
}

/**
 * 示例 3: 表单集成
 */
export function FormExample() {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    subject: '',
    topic: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('请输入标题');
      return;
    }
    
    if (!formData.subject) {
      alert('请选择科目');
      return;
    }

    console.log('提交表单:', formData);
    alert('表单提交成功！查看控制台输出');
  };

  const handleReset = () => {
    setFormData({
      title: '',
      content: '',
      subject: '',
      topic: '',
    });
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">表单集成示例</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="请输入问题标题"
            className="w-full px-3 py-2 border rounded-md"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">内容</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="请输入问题详细内容（可选）"
            className="w-full px-3 py-2 border rounded-md"
            rows={4}
            maxLength={500}
          />
        </div>

        <SubjectTopicSelector
          subjectValue={formData.subject}
          topicValue={formData.topic}
          onSubjectChange={(value) => setFormData(prev => ({ ...prev, subject: value, topic: '' }))}
          onTopicChange={(value) => setFormData(prev => ({ ...prev, topic: value }))}
          required
        />

        <div className="flex gap-2">
          <Button type="submit">提交</Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            重置
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * 示例 4: 筛选器用法
 */
export function FilterExample() {
  const [filters, setFilters] = useState({
    subject: '',
    topic: '',
  });

  const handleClearFilters = () => {
    setFilters({ subject: '', topic: '' });
  };

  const handleApplyFilters = () => {
    console.log('应用筛选:', filters);
    alert('筛选已应用！查看控制台输出');
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">筛选器用法</h3>
      
      <SubjectTopicSelector
        subjectValue={filters.subject}
        topicValue={filters.topic}
        onSubjectChange={(value) => setFilters(prev => ({ ...prev, subject: value }))}
        onTopicChange={(value) => setFilters(prev => ({ ...prev, topic: value }))}
      />

      <div className="mt-4 flex gap-2">
        <Button onClick={handleApplyFilters}>应用筛选</Button>
        <Button variant="outline" onClick={handleClearFilters}>
          清除筛选
        </Button>
      </div>

      {(filters.subject || filters.topic) && (
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <p className="text-sm font-medium mb-2">当前筛选条件:</p>
          {filters.subject && (
            <p className="text-sm">• 科目: {filters.subject}</p>
          )}
          {filters.topic && (
            <p className="text-sm">• 考点: {filters.topic}</p>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * 示例 5: 自定义样式
 */
export function CustomStyleExample() {
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">自定义样式</h3>
      
      <SubjectTopicSelector
        subjectValue={subject}
        topicValue={topic}
        onSubjectChange={setSubject}
        onTopicChange={setTopic}
        className="max-w-md"
      />
    </Card>
  );
}

/**
 * 完整示例页面
 */
export function SubjectTopicSelectorExamples() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">SubjectTopicSelector 组件示例</h1>
        <p className="text-gray-600">
          科目和考点选择器组件的各种使用场景
        </p>
      </div>

      <BasicExample />
      <RequiredExample />
      <FormExample />
      <FilterExample />
      <CustomStyleExample />
    </div>
  );
}

export default SubjectTopicSelectorExamples;
