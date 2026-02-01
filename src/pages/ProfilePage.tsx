import { ArrowLeft, Heart, Star, MessageSquare, Edit3, ChevronRight, LogOut, ShieldCheck, Camera, Check, Users, Pencil, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { UI_CONFIG } from '@/config/ui-config';
import { aiTextConfig } from '@/config/ai-text';

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

export function ProfilePage() {
  const navigate = useNavigate();
  const { user: currentUser, logout, updateUser } = useAuthStore();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isSubmittingNickname, setIsSubmittingNickname] = useState(false);

  // 模拟AI审核API调用
  const simulateAIReview = async (content: string): Promise<{ passed: boolean, reason?: string }> => {
    await new Promise(resolve => setTimeout(resolve, 1500)); // 模拟API延迟
    // 简单模拟：检查敏感词
    const sensitiveWords = ['admin', '管理员', '系统', '官方', '客服'];
    if (sensitiveWords.some(w => content.toLowerCase().includes(w))) {
      return { passed: false, reason: aiTextConfig.auditMessages.nicknameSensitive };
    }
    if (content.length < 2) {
      return { passed: false, reason: aiTextConfig.auditMessages.nicknameTooShort };
    }
    if (content.length > 20) {
      return { passed: false, reason: aiTextConfig.auditMessages.nicknameTooLong };
    }
    return { passed: true };
  };

  const handleUpdateNickname = async () => {
    if (!newNickname.trim()) {
      toast.error('请输入昵称');
      return;
    }
    setIsSubmittingNickname(true);
    try {
      const result = await simulateAIReview(newNickname);
      if (result.passed) {
        updateUser({ nickname: newNickname });
        toast.success(aiTextConfig.auditMessages.nicknameUpdated);
        setShowNicknameDialog(false);
        setNewNickname('');
      } else {
        toast.error(result.reason || aiTextConfig.auditMessages.nicknameRejected);
      }
    } finally {
      setIsSubmittingNickname(false);
    }
  };

  // Redirect if not logged in
  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; className: string }> = {
      student: { label: '学生', className: UI_CONFIG.colors.roles.student },
      teacher: { label: '老师（有权限）', className: UI_CONFIG.colors.roles.teacher },
      parent: { label: '家长', className: UI_CONFIG.colors.roles.parent },
    };
    return roleMap[role] || { label: '未知', className: 'bg-morandi-gray1' };
  };

  const roleBadge = getRoleBadge(currentUser.role);

  const handleSwitchAccount = () => {
    toast.success('切换账号');
    logout();
    navigate('/login');
  };

  const handleLogout = () => {
    logout();
    toast.success('已退出登录');
    navigate('/login');
  };

  const handleSelectAvatar = (url: string) => {
    updateUser({ avatar: url });
    toast.success('头像已更新');
    setShowAvatarDialog(false);
  };

  const menuItems = [
    {
      icon: ShieldCheck,
      label: '审核管理',
      color: 'text-teal-600',
      visible: currentUser.role === 'teacher',
      onClick: () => navigate('/audit'),
    },
    {
      icon: Users,
      label: '用户白名单',
      color: 'text-cyan-600',
      visible: currentUser.role === 'teacher',
      onClick: () => navigate('/admin'),
    },
    {
      icon: Heart,
      label: '我的点赞',
      color: 'text-red-500',
      visible: true,
      onClick: () => navigate('/my-likes'),
    },
    {
      icon: Star,
      label: '我的收藏',
      color: 'text-yellow-500',
      visible: true,
      onClick: () => navigate('/my-favorites'),
    },
    {
      icon: MessageSquare,
      label: '我的提问',
      color: 'text-blue-500',
      visible: currentUser.role === 'student' || currentUser.role === 'teacher',
      onClick: () => navigate('/my-questions'),
    },
    {
      icon: Edit3,
      label: '我的回答',
      color: 'text-green-500',
      visible: currentUser.role === 'teacher',
      onClick: () => navigate('/my-answers'),
    },
  ];

  return (
    <div className="flex flex-col pb-10">
      {/* 顶部导航栏 - MainLayout covers this, but Profile often has its own style. 
          For consistency with design, we'll hide MainLayout's header for Profile or just allow double headers?
          Actually MainLayout is usually sticky. Profile header here is redundant.
          Let's remove the redundant header but keep the content structure roughly same.
       */}
      {/* <div className="bg-white shadow-sm mb-4">...</div> */}

      {/* Re-adding a simple back button header just for "Feel" if needed, but MainLayout handles navigation.
          Let's just show content.
      */}

      <div className="w-full">
        {/* 个人信息区域 */}
        <div className="bg-white p-8 relative overflow-hidden mb-4 rounded-3xl shadow-sm">
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
              <div
                className="flex items-center justify-center gap-2 cursor-pointer group"
                onClick={() => {
                  setNewNickname(currentUser?.nickname || '');
                  setShowNicknameDialog(true);
                }}
              >
                <h2 className="text-2xl font-bold text-gray-800 group-hover:text-morandi-5 transition-colors">
                  {currentUser?.nickname || '未登录'}
                </h2>
                <Pencil className="w-4 h-4 text-gray-400 group-hover:text-morandi-5 transition-colors" />
              </div>
              {roleBadge && (
                <Badge className={`${roleBadge.className} text-white border-0 px-4 py-1 rounded-full`}>
                  {roleBadge.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* 功能入口区域 */}
        <div className="space-y-3">
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden p-2">
            {menuItems
              .filter((item) => item.visible)
              .map((item, index) => (
                <button
                  key={index}
                  onClick={item.onClick}
                  data-testid={`menu-item-${item.label.replace(/\s/g, '-')}`}
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

      {/* 昵称编辑对话框 (含AI审核) */}
      <Dialog open={showNicknameDialog} onOpenChange={setShowNicknameDialog}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center">修改昵称</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Input
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="请输入新昵称 (2-20字符)"
                maxLength={20}
                disabled={isSubmittingNickname}
                className="rounded-xl"
              />
              <p className="text-xs text-gray-400 text-center">
                昵称需要经过内容审核，请遵守社区规范
              </p>
            </div>
            <Button
              onClick={handleUpdateNickname}
              disabled={isSubmittingNickname || !newNickname.trim()}
              className="w-full bg-morandi-5 hover:bg-morandi-5/90 rounded-xl"
            >
              {isSubmittingNickname ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  审核中...
                </>
              ) : (
                '确认修改'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all active:scale-90 ${currentUser?.avatar === url ? 'border-morandi-5' : 'border-transparent'
                  }`}
              >
                <img src={url} alt={`avatar-${idx}`} className="w-full h-full object-cover" />
                {currentUser?.avatar === url && (
                  <div className="absolute inset-0 bg-morandi-5 bg-opacity-20 flex items-center justify-center">
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
