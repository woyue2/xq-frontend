/**
 * [POS] src/pages/ProfilePage.tsx
 *   所属：pages 层 | 角色：个人主页（资料编辑/头像/昵称/登出），路由 `/profile`，已登录可见
 *   兄弟：LoginPage.tsx
 *
 * [INPUT]
 *   - lucide-react       → ArrowLeft / Heart / Star 等图标
 *   - react-router-dom   → useNavigate
 *   - sonner             → toast（解绑提示）
 *   - @/components/ui/*  → Avatar / Badge / Label 等
 *   - @/config/ui-config → UI_CONFIG（角色颜色）
 *   - @/hooks/useProfile → useProfile（全量 state + handlers）
 *
 * [OUTPUT]
 *   - ProfilePage（页面组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/pages/CLAUDE.md 的文件清单
 */
import {
  ArrowLeft,
  Heart,
  Star,
  MessageSquare,
  Edit3,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Camera,
  Check,
  Users,
  Pencil,
  Loader2,
  Baby,
  Phone,
  Plus,
  KeyRound,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UI_CONFIG } from '@/config/ui-config';
import { useProfile } from '@/hooks/useProfile';
import { ROUTES } from '@/config/app-constants';

const PREDEFINED_AVATARS = [
  '/avatars/notionists-1775390793571.svg',
  '/avatars/notionists-1775390806025.svg',
  '/avatars/notionists-1775390810100.svg',
  '/avatars/notionists-1775390812760.svg',
  '/avatars/notionists-1775390819759.svg',
  '/avatars/notionists-1775390827521.svg',
  '/avatars/notionists-1775390829628.svg',
  '/avatars/notionists-1775390831345.svg',
  '/avatars/notionists-1775390832944.svg',
  '/avatars/notionists-1775390835123.svg',
  '/avatars/notionists-1775390836926.svg',
  '/avatars/notionists-1775390838432.svg',
  '/avatars/notionists-1775390839930.svg',
  '/avatars/notionists-1775390842266.svg',
  '/avatars/notionists-1775390843868.svg',
  '/avatars/notionists-1775390845252.svg',
  '/avatars/notionists-1775390846480.svg',
  '/avatars/notionists-1775390848600.svg',
  '/avatars/notionists-1775390849662.svg',
  '/avatars/notionists-1775390851658.svg',
  '/avatars/notionists-1775390853241.svg',
];

export function ProfilePage() {
  const navigate = useNavigate();
  const {
    currentUser,
    showLogoutDialog,
    setShowLogoutDialog,
    showAvatarDialog,
    setShowAvatarDialog,
    showNicknameDialog,
    setShowNicknameDialog,
    showPasswordDialog,
    setShowPasswordDialog,
    showBindDialog,
    setShowBindDialog,
    newNickname,
    setNewNickname,
    isSubmittingNickname,
    newPassword,
    setNewPassword,
    isSubmittingPassword,
    isUploadingAvatar,
    children,
    bindName,
    setBindName,
    bindPhone,
    setBindPhone,
    bindCode,
    setBindCode,
    bindSchool,
    setBindSchool,
    bindCountdown,
    handleGetBindCode,
    handleBindChild,
    handleUpdateNickname,
    handleUpdateAvatar,
    handleFileUpload,
    handleUpdatePassword,
    handleSwitchAccount,
    handleLogout,
  } = useProfile();

  if (!currentUser) {
    return null;
  }

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; className: string }> = {
      student: { label: '学生', className: UI_CONFIG.colors.roles.student },
      teacher: { label: '老师（有权限）', className: UI_CONFIG.colors.roles.teacher },
      parent: { label: '家长', className: UI_CONFIG.colors.roles.parent },
      admin: { label: '管理员', className: UI_CONFIG.colors.roles.teacher },
    };
    return roleMap[role] || { label: '未知', className: 'bg-morandi-gray1' };
  };

  const roleBadge = getRoleBadge(currentUser.role);

  const menuItems = [
    {
      icon: ShieldCheck,
      label: '审核管理',
      color: 'text-teal-600',
      visible: currentUser.role === 'teacher' || currentUser.role === 'admin',
      onClick: () => navigate(ROUTES.audit),
    },
    {
      icon: Users,
      label: '用户白名单',
      color: 'text-cyan-600',
      visible: currentUser.role === 'teacher' || currentUser.role === 'admin',
      onClick: () => navigate(ROUTES.admin),
    },
    {
      icon: Phone,
      label: '系统配置中心',
      color: 'text-purple-500',
      visible: currentUser.role === 'teacher' || currentUser.role === 'admin',
      onClick: () => navigate('/test') /* dev only */,
    },
    {
      icon: Heart,
      label: '我的点赞',
      color: 'text-red-500',
      visible: true,
      onClick: () => navigate(ROUTES.myLikes),
    },
    {
      icon: Star,
      label: '我的收藏',
      color: 'text-yellow-500',
      visible: true,
      onClick: () => navigate(ROUTES.myFavorites),
    },
    {
      icon: MessageSquare,
      label: '我的提问',
      color: 'text-blue-500',
      visible: currentUser.role === 'student' || currentUser.role === 'teacher' || currentUser.role === 'admin',
      onClick: () => navigate(ROUTES.myQuestions),
    },
    {
      icon: Edit3,
      label: '我的回答',
      color: 'text-green-500',
      visible: currentUser.role === 'teacher' || currentUser.role === 'admin',
      onClick: () => navigate(ROUTES.myAnswers),
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
            <div
              className="relative group cursor-pointer"
              onClick={() => setShowAvatarDialog(true)}
            >
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
                  {currentUser?.name || currentUser?.nickname || '未登录'}
                </h2>
                <Pencil className="w-4 h-4 text-gray-400 group-hover:text-morandi-5 transition-colors" />
              </div>

              {/* 手机号显示 */}
              {currentUser?.phone && (
                <p className="text-sm text-gray-500 mt-2">
                  {currentUser.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                </p>
              )}

              {roleBadge && (
                <Badge
                  className={`${roleBadge.className} text-white border-0 px-4 py-1 rounded-full mt-2`}
                >
                  {roleBadge.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* 功能入口区域 */}
        <div className="space-y-3">
          {/* 家长专属：我的孩子 */}
          {currentUser?.role === 'parent' && (
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-2xl bg-orange-50">
                    <Baby className="w-5 h-5 text-orange-500" />
                  </div>
                  <span className="font-medium text-gray-700">我的孩子</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowBindDialog(true)}
                  className="h-8 rounded-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加
                </Button>
              </div>

              <div className="space-y-3">
                {children.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-xl">
                    暂无绑定的孩子
                  </div>
                ) : (
                  children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between bg-gray-50 p-3 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-white shadow-sm">
                          <AvatarImage src={child.avatar} />
                          <AvatarFallback>{child.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm text-gray-800">{child.name}</div>
                          <div className="text-xs text-gray-500">
                            {child.school && <span className="mr-2">{child.school}</span>}
                            {child.grade}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => navigate(ROUTES.parentChild(child.id))}
                        >
                          查看提问
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-gray-400 hover:text-red-500 hover:bg-red-50"
                          onClick={() => toast.info('如需解绑请联系班主任')}
                        >
                          解绑
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

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
                  <div
                    className={`p-2 rounded-2xl bg-opacity-10 ${item.color.replace('text', 'bg')}`}
                  >
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
              onClick={() => setShowPasswordDialog(true)}
              className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition border-b border-gray-50 active:scale-[0.98]"
            >
              <div className="p-2 rounded-2xl bg-blue-50">
                <KeyRound className="w-5 h-5 text-blue-500" />
              </div>
              <span className="flex-1 text-left font-medium text-gray-700">设置登录密码</span>
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
          <div className="flex flex-col gap-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              {PREDEFINED_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => handleUpdateAvatar(url)}
                  disabled={isUploadingAvatar}
                  className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all active:scale-90 ${
                    currentUser?.avatar === url ? 'border-morandi-5' : 'border-transparent'
                  } ${isUploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}
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

            <div className="relative">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                id="avatar-upload-input"
                onChange={handleFileUpload}
                disabled={isUploadingAvatar}
              />
              <Label
                htmlFor="avatar-upload-input"
                className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-morandi-5 hover:text-morandi-5 cursor-pointer transition-colors ${
                  isUploadingAvatar ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
                <span>上传自定义头像</span>
              </Label>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 退出确认对话框 */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>是否确认退出？</AlertDialogTitle>
            <AlertDialogDescription>退出后需要重新登录才能使用</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-500 hover:bg-red-600">
              确认退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 设置密码对话框 */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center">设置登录密码</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入至少 6 位密码"
                disabled={isSubmittingPassword}
              />
              <p className="text-xs text-gray-400">
                设置后可以在登录页选择“使用密码登录”，通过手机号 + 密码直接登录。
              </p>
            </div>
            <Button
              onClick={handleUpdatePassword}
              disabled={isSubmittingPassword || !newPassword}
              className="w-full bg-morandi-5 hover:bg-morandi-5/90 rounded-xl"
            >
              {isSubmittingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '确认保存'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 绑定孩子对话框 */}
      <Dialog open={showBindDialog} onOpenChange={setShowBindDialog}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center">绑定孩子</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bind-child-name">孩子姓名</Label>
              <Input
                id="bind-child-name"
                value={bindName}
                onChange={(e) => setBindName(e.target.value)}
                placeholder="请输入孩子姓名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bind-child-school">学校（选填）</Label>
              <Input
                id="bind-child-school"
                value={bindSchool}
                onChange={(e) => setBindSchool(e.target.value)}
                placeholder="请输入学校名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bind-child-phone">手机号</Label>
              <div className="flex gap-2">
                <Input
                  id="bind-child-phone"
                  value={bindPhone}
                  onChange={(e) => setBindPhone(e.target.value)}
                  placeholder="请输入手机号"
                  maxLength={11}
                />
                <Button
                  variant="outline"
                  onClick={handleGetBindCode}
                  disabled={bindCountdown > 0 || !bindPhone}
                  className="whitespace-nowrap w-24"
                >
                  {bindCountdown > 0 ? `${bindCountdown}s` : '获取验证码'}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bind-child-code">验证码</Label>
              <Input
                id="bind-child-code"
                value={bindCode}
                onChange={(e) => setBindCode(e.target.value)}
                placeholder="请输入验证码"
                maxLength={6}
              />
            </div>
            <Button
              onClick={handleBindChild}
              className="w-full bg-morandi-5 hover:bg-morandi-5/90 rounded-xl mt-4"
            >
              确认绑定
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
