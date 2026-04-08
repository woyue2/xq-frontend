/**
 * TopicManager 组件示例
 * 展示考点管理组件的使用方式
 */
import { useState } from 'react';
import { TopicManager } from './TopicManager';
import { SubjectManager } from './SubjectManager';

export default function TopicManagerExample() {
  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string>('');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">考点管理示例</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 科目管理 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">科目列表</h2>
          <SubjectManager onSubjectSelect={setSelectedSubjectKey} />
        </div>

        {/* 考点管理 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">考点列表</h2>
          <TopicManager subjectKey={selectedSubjectKey} />
        </div>
      </div>

      {/* 使用说明 */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">使用说明</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li>左侧选择一个科目，右侧会显示该科目下的考点列表</li>
          <li>点击"添加考点"按钮可以创建新考点（功能待实现）</li>
          <li>点击编辑按钮可以修改考点信息（功能待实现）</li>
          <li>点击删除按钮可以删除考点（需要确认）</li>
          <li>如果考点有关联问题，删除时会显示错误提示</li>
          <li>考点按照 order 字段排序显示</li>
          <li>启用/禁用状态用徽章显示</li>
        </ul>
      </div>

      {/* 状态显示 */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">当前状态</h3>
        <p className="text-sm">
          选中的科目: {selectedSubjectKey || '未选择'}
        </p>
      </div>
    </div>
  );
}
