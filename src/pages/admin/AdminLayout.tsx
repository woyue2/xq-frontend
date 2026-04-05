/**
 * [POS] src/pages/admin/AdminLayout.tsx
 *   所属：pages/admin 层 | 角色：管理后台共享布局
 *   兄弟：WhitelistPage.tsx / DimensionsPage.tsx / SubjectsPage.tsx
 *
 * [INPUT]
 *   - react-router-dom    → useNavigate, Outlet
 *   - lucide-react        → Shield, ChevronLeft
 *   - @/components/ui     → Button
 *   - @/config/app-constants → ROUTES
 *
 * [OUTPUT]
 *   - AdminLayout（布局组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/pages/admin/CLAUDE.md 的文件清单
 */
import { useNavigate, Outlet } from 'react-router-dom';
import { Shield, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/app-constants';

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminLayout({ title, subtitle = '好好学习，天天向上', actions }: AdminLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#EDEDE9] flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(ROUTES.profile)}
            className="p-2 hover:bg-gray-100 rounded-full transition active:scale-90"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex flex-col items-center flex-1">
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#D5BDAF]" />
              {title}
            </h1>
            <p className="text-[9px] text-[#D5BDAF] font-bold leading-none">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {actions}
          </div>
        </div>
      </div>

      {/* 页面内容 */}
      <Outlet />
    </div>
  );
}
