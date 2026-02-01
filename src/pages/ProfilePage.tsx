import { ArrowLeft, Heart, Star, MessageSquare, Edit3, ChevronRight, LogOut, ShieldCheck, Camera, Check, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { useState } from 'react';
import { toast } from 'sonner';
import { currentUser, setCurrentUser } from '@/lib/mock-data';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const PREDEFINED_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=parent',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=shiyan',
];

export function ProfilePage({ onNavigate, onLogout }: ProfilePageProps) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; className: string }> = {
      student: { label: '学生', className: 'bg-[#BDE0FE]' },
      teacher: { label: '老师（有权限）', className: 'bg-[#D5BDAF]' },
      parent: { label: '家长', className: 'bg-[#CDB4DB]' },
    };
    return roleMap[role] || { label: '未知', className: 'bg-gray-500' };
  };

  const roleBadge = currentUser ? getRoleBadge(currentUser.role) : null;

  const handleSwitchAccount = () => {
    toast.success('切换账号');
    onLogout();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    toast.success('已退出登录');
    onLogout();
  };

  const handleSelectAvatar = (url: string) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, avatar: url };
      setCurrentUser(updatedUser);
      toast.success('头像已更新');
      setShowAvatarDialog(false);
    }
  };

  const menuItems = [
    {
      icon: ShieldCheck,
      label: '审核管理',
      color: 'text-indigo-500',
      visible: currentUser?.role === 'teacher',
      onClick: () => onNavigate('audit'),
    },
    {
      icon: Users,
      label: '用户白名单',
      color: 'text-purple-500',
      visible: currentUser?.role === 'teacher',
      onClick: () => onNavigate('admin'),
    },
    {
      icon: Heart,
      label: '我的点赞',
      color: 'text-red-500',
      visible: true,
      onClick: () => toast.success('查看我的点赞'),
    },
    {
      icon: Star,
      label: '我的收藏',
      color: 'text-yellow-500',
      visible: true,
      onClick: () => toast.success('查看我的收藏'),
    },
    {
      icon: MessageSquare,
      label: '我的提问',
      color: 'text-blue-500',
      visible: currentUser?.role === 'student' || currentUser?.role === 'teacher',
      onClick: () => toast.success('查看我的提问'),
    },
    {
      icon: Edit3,
      label: '我的回答',
      color: 'text-green-500',
      visible: currentUser?.role === 'teacher',
      onClick: () => toast.success('查看我的回答'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#EDEDE9] pb-10">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center">
          <button
            onClick={() => onNavigate('home')}
            className="p-2 hover:bg-gray-100 rounded-full transition active:scale-90"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl flex-1 text-center font-bold text-gray-800">个人中心</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* 个人信息区域 */}
        <div className="bg-white p-8 relative overflow-hidden m-4 rounded-3xl shadow-sm">
          <div className="relative flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => setShowAvatarDialog(true)}>
              <Avatar className="w-24 h-24 border-4 border-[#F5EBE0] shadow-md transition-transform active:scale-95">
                <AvatarImage src={currentUser?.avatar} />
                <AvatarFallback className="text-2xl bg-[#D6CCC2]">
                  {currentUser?.nickname?.[0] || '我'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow-md border border-gray-100">
                <Camera className="w-4 h-4 text-gray-500" />
              </div>
            </div>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{currentUser?.nickname || '未登录'}</h2>
              {roleBadge && (
                <Badge className={`${roleBadge.className} text-white border-0 px-4 py-1 rounded-full`}>
                  {roleBadge.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* 功能入口区域 */}
        <div className="p-4 space-y-3">
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden p-2">
            {menuItems
              .filter((item) => item.visible)
              .map((item, index) => (
                <button
                  key={index}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition border-b border-gray-50 last:border-b-0 active:scale-[0.98]"
                >
                  <div className={`p-2 rounded-2xl bg-opacity-10 ${item.color.replace('text', 'bg')}`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="flex-1 text-left font-medium text-gray-700">{item.label}</span>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>
              ))}
          </div>

          {/* 账号操作区域 */}
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden p-2">
            <button
              onClick={handleSwitchAccount}
              className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition border-b border-gray-50 active:scale-[0.98]"
            >
              <div className="p-2 rounded-2xl bg-gray-100">
                <ShieldCheck className="w-5 h-5 text-gray-500" />
              </div>
              <span className="flex-1 text-left font-medium text-gray-700">切换账号</span>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
            
            <button
              onClick={() => setShowLogoutDialog(true)}
              className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition active:scale-[0.98]"
            >
              <div className="p-2 rounded-2xl bg-red-50">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <span className="flex-1 text-left font-medium text-red-500">退出账号</span>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>

        {/* 版本信息 */}
        <div className="text-center text-xs text-gray-400 py-6">
          <p>知识星球问答小程序</p>
          <p className="mt-1">v1.1.0</p>
        </div>
      </div>

      {/* 头像选择对话框 */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center">选择新头像</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-4 py-4">
            {PREDEFINED_AVATARS.map((url, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectAvatar(url)}
                className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all active:scale-90 ${
                  currentUser?.avatar === url ? 'border-[#D5BDAF]' : 'border-transparent'
                }`}
              >
                <img src={url} alt={`avatar-${idx}`} className="w-full h-full object-cover" />
                {currentUser?.avatar === url && (
                  <div className="absolute inset-0 bg-[#D5BDAF] bg-opacity-20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 退出确认对话框 */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>是否确认退出？</AlertDialogTitle>
            <AlertDialogDescription>
              退出后需要重新登录才能使用
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600"
            >
              确认退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
