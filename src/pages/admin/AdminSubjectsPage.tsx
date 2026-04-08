/**
 * [POS] src/pages/admin/AdminSubjectsPage.tsx
 *   所属：pages/admin 层 | 角色：科目和考点管理页面，路由 `/admin/subjects`，管理员可见
 *   兄弟：AdminLayout.tsx
 *
 * [INPUT]
 *   - react                          → useState
 *   - react-router-dom               → useNavigate
 *   - @/components/SubjectManager    → SubjectManager
 *   - @/components/TopicManager      → TopicManager
 *   - @/components/ui/button         → Button
 *   - @/config/app-constants         → ROUTES
 *   - lucide-react                   → ChevronLeft, Shield
 *
 * [OUTPUT]
 *   - AdminSubjectsPage（页面组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/pages/admin/CLAUDE.md 的文件清单
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SubjectManager } from '@/components/SubjectManager';
import { TopicManager } from '@/components/TopicManager';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/app-constants';
import { ChevronLeft, Shield } from 'lucide-react';

export function AdminSubjectsPage() {
  const navigate = useNavigate();
  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string>('');

  return (
    <div className="min-h-screen bg-[#EDEDE9] flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(ROUTES.home)}
            className="p-2 hover:bg-gray-100 rounded-full transition active:scale-90"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex flex-col items-center flex-1">
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#D5BDAF]" />
              科目和考点管理
            </h1>
            <p className="text-[9px] text-[#D5BDAF] font-bold leading-none">好好学习，天天向上</p>
          </div>
          <div className="w-[52px]" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* 主从布局：左侧科目列表，右侧考点列表 */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：科目管理 */}
          <div className="lg:col-span-1">
            <SubjectManager
              onSubjectSelect={setSelectedSubjectKey}
              className="h-full"
            />
          </div>

          {/* 右侧：考点管理 */}
          <div className="lg:col-span-1">
            <TopicManager
              subjectKey={selectedSubjectKey}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
