/**
 * SubjectManager 组件示例
 * 
 * 展示如何使用 SubjectManager 组件管理科目
 */
import { SubjectManager } from './SubjectManager';

export default function SubjectManagerExample() {
  const handleSubjectSelect = (subjectKey: string) => {
    console.log('Selected subject:', subjectKey);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">科目管理示例</h1>
      
      <div className="space-y-8">
        {/* 基本用法 */}
        <section>
          <h2 className="text-xl font-semibold mb-4">基本用法</h2>
          <SubjectManager onSubjectSelect={handleSubjectSelect} />
        </section>

        {/* 无回调 */}
        <section>
          <h2 className="text-xl font-semibold mb-4">无选择回调</h2>
          <SubjectManager />
        </section>
      </div>
    </div>
  );
}
