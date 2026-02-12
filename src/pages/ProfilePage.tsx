import { ArrowLeft, Heart, Star, MessageSquare, Edit3, ChevronRight, LogOut, ShieldCheck, Camera, Check, Users, Pencil, Loader2, Baby, Phone, Plus, KeyRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { UI_CONFIG } from '@/config/ui-config';
import { aiTextConfig } from '@/config/ai-text';
import { parentService } from '@/services/parentService';
import { authService, userService, questionService } from '@/services/api';
import type { ChildInfo } from '@/types/parent';
import { Label } from '@/components/ui/label';

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
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // 家长绑定相关状态
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [showBindDialog, setShowBindDialog] = useState(false);
  const [bindName, setBindName] = useState('');
  const [bindPhone, setBindPhone] = useState('');
  const [bindCode, setBindCode] = useState('');
  const [bindSchool, setBindSchool] = useState('');
  const [bindCountdown, setBindCountdown] = useState(0);
  const [childToUnbind, setChildToUnbind] = useState<ChildInfo | null>(null);
  const [showUnbindDialog, setShowUnbindDialog] = useState(false);
  const [showUnbindFinalDialog, setShowUnbindFinalDialog] = useState(false);

  // 加载绑定孩子列表
  useEffect(() => {
    if (currentUser?.role === 'parent') {
      loadChildren();
    }
  }, [currentUser]);

  const loadChildren = async () => {
    try {
      const res = await parentService.getChildren();
      if (res.data.code === 200) {
        setChildren(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load children', error);
    }
  };
const handleGetBindCode = async () => {
  // 先检查孩子的姓名是否已填写
  if (!bindName || !bindName.trim()) {
    toast.error('请先输入孩子的姓名');
    return;
  }

  if (!bindPhone || bindPhone.length !== 11) {
    toast.error('请输入正确的手机号');
    return;
  }

  // 如果已在倒计时，直接返回
  if (bindCountdown > 0) return;

  let timer: number | null = null;
  
  try {
    setBindCountdown(60);
    timer = setInterval(() => {
      setBindCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 调用发送验证码接口
    await parentService.sendBindSms(bindPhone);
    toast.success('验证码已发送');
  } catch (error) {
    // 失败时清除定时器并重置倒计时，允许用户立即重试
    if (timer) {
      clearInterval(timer);
    }
    setBindCountdown(0);
    toast.error('发送失败：请检查手机号或网络');
  }
};
  const handleBindChild = async () => {
    if (!bindName || !bindPhone || !bindCode) {
      toast.error('请填写完整信息');
      return;
    }
    try {
      await parentService.bindChild({
        childName: bindName,
        phone: bindPhone,
        code: bindCode,
        school: bindSchool
      });
      toast.success('绑定成功');
      setShowBindDialog(false);
      setBindName('');
      setBindPhone('');
      setBindCode('');
      setBindSchool('');
      loadChildren();
    } catch (error) {
      // Error handled by interceptor usually
    }
  };

  const handleUpdateNickname = async () => {
    if (!newNickname.trim()) {
      toast.error('请输入昵称');
      return;
    }

    // 简单的前端校验
    if (newNickname.length < 2) {
      toast.error(aiTextConfig.auditMessages.nicknameTooShort);
      return;
    }

    setIsSubmittingNickname(true);
    try {
      // 调用后端 API 更新（含 AI 审核）
      const updatedUser = await userService.updateProfile({ nickname: newNickname });

      // 更新本地状态
      updateUser(updatedUser);
      toast.success(aiTextConfig.auditMessages.nicknameUpdated);
      setShowNicknameDialog(false);
      setNewNickname('');
    } catch (error: any) {
      // 错误由拦截器统一处理，但对于业务错误（如审核失败）可以在此额外提示
      console.error('Update nickname failed', error);
    } finally {
      setIsSubmittingNickname(false);
    }
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser) {
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

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleUpdateAvatar = async (url: string) => {
    setIsUploadingAvatar(true);
    try {
      // 调用后端更新（含 AI 审核）
      const updatedUser = await userService.updateProfile({ avatar: url });
      updateUser(updatedUser);
      toast.success('头像已更新');
      setShowAvatarDialog(false);
    } catch (err) {
      console.error('Update avatar failed', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const compressImage = (file: File, maxSizeMB = 2): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建 canvas 上下文'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          // 逐步降低质量，直到文件大小符合要求
          const maxSize = maxSizeMB * 1024 * 1024;
          let quality = 0.9;
          const minQuality = 0.1;
          const qualityStep = 0.1;

          const tryCompress = (currentQuality: number): Promise<File> => {
            return new Promise((res, rej) => {
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    rej(new Error('压缩失败'));
                    return;
                  }
                  if (blob.size <= maxSize || currentQuality <= minQuality) {
                    // 达到目标大小或最低质量，返回结果
                    blob.arrayBuffer().then(() => res(new File([blob], file.name, { type: 'image/jpeg' })));
                  } else {
                    // 继续降低质量
                    tryCompress(currentQuality - qualityStep);
                  }
                },
                'image/jpeg',
                currentQuality
              );
            });
          };

          tryCompress(quality).then(resolve).catch(reject);
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let processedFile: File = file;
    const maxSize = 2 * 1024 * 1024; // 2MB

    // 如果文件超过2MB，自动压缩
    if (file.size > maxSize) {
      toast.loading('图片较大，正在压缩...', { id: 'compress-avatar' });
      try {
        processedFile = await compressImage(file, 2);
        toast.dismiss('compress-avatar');
        toast.success('压缩完成，准备上传');
      } catch (error) {
        toast.dismiss('compress-avatar');
        toast.error('压缩失败，请选择更小的图片');
        return;
      }
    }

    // 校验图片宽高比 (只允许 1:1, 4:3, 3:4)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(processedFile);
      });

      const ratio = img.width / img.height;
      const allowedRatios = [1, 4/3, 3/4];
      const tolerance = 0.01; // 允许一定的误差

      const isValidRatio = allowedRatios.some(allowedRatio =>
        Math.abs(ratio - allowedRatio) < tolerance
      );

      if (!isValidRatio) {
        toast.error('头像仅支持 1:1、4:3 或 3:4 比例的图片');
        return;
      }
    } catch (error) {
      toast.error('无法读取图片，请重试');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      toast.loading('正在上传...', { id: 'upload-avatar' });
      // 1. 上传图片到 OSS/本地
      const { imageUrl } = await questionService.uploadImage(processedFile, {
        purpose: 'avatar',
        senderName: currentUser?.nickname
      });

      // 2. 更新用户头像（触发后端 AI 审核）
      await handleUpdateAvatar(imageUrl);

      toast.dismiss('upload-avatar');
    } catch (err) {
      toast.dismiss('upload-avatar');
      // 错误由拦截器处理
    } finally {
      setIsUploadingAvatar(false);
      // 清空 input 防止重复选择同一文件不触发 onChange
      e.target.value = '';
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('密码至少需 8 位');
      return;
    }
    try {
      setIsSubmittingPassword(true);
      await authService.setPassword(newPassword);
      toast.success('密码已更新');
      setShowPasswordDialog(false);
      setNewPassword('');
    } catch {
      // 具体错误由拦截器处理
    } finally {
      setIsSubmittingPassword(false);
    }
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
      icon: Phone,
      label: '系统配置中心',
      color: 'text-purple-500',
      visible: currentUser.role === 'teacher',
      onClick: () => navigate('/test'),
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
              
              {/* 手机号显示 */}
              {currentUser?.phone && (
                <p className="text-sm text-gray-500 mt-2">
                  {currentUser.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                </p>
              )}
              
              {roleBadge && (
                <Badge className={`${roleBadge.className} text-white border-0 px-4 py-1 rounded-full mt-2`}>
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
                <Button size="sm" variant="outline" onClick={() => setShowBindDialog(true)} className="h-8 rounded-full">
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
                    <div key={child.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-white shadow-sm">
                          <AvatarImage src={child.avatar} />
                          <AvatarFallback>{(child.realName || child.name)[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm text-gray-800">
                            {child.realName && child.realName !== child.name
                              ? `${child.realName} (${child.name})`
                              : child.name}
                          </div>
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
                          onClick={() => navigate(`/parent/questions/${child.id}`)}
                        >
                          查看提问
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-gray-400 hover:text-red-500 hover:bg-red-50"
                          onClick={() => {
                            setChildToUnbind(child);
                            setShowUnbindDialog(true);
                          }}
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
              onClick={() => setShowPasswordDialog(true)}
              className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition border-b border-gray-50 active:scale-[0.98]"
            >
              <div className="p-2 rounded-2xl bg-blue-50">
                <KeyRound className="w-5 h-5 text-blue-500" />
              </div>
              <span className="flex-1 text-left font-medium text-gray-700">修改密码</span>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>

            <button
              onClick={() => setShowLogoutDialog(true)}
              className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition active:scale-[0.98]"
            >
              <div className="p-2 rounded-2xl bg-red-50">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <span className="flex-1 text-left font-medium text-red-500">退出登录</span>
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
                  className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all active:scale-90 ${currentUser?.avatar === url ? 'border-morandi-5' : 'border-transparent'
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
                className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-morandi-5 hover:text-morandi-5 cursor-pointer transition-colors ${isUploadingAvatar ? 'opacity-50 pointer-events-none' : ''
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

      {/* 解绑孩子确认对话框 */}
      <AlertDialog open={showUnbindDialog} onOpenChange={setShowUnbindDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认解绑该孩子？</AlertDialogTitle>
            <AlertDialogDescription>
              解绑后将无法查看该孩子的问题记录，是否确认解绑？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUnbindDialog(false);
                setShowUnbindFinalDialog(true);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              继续解绑
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 第二次解绑确认对话框 */}
      <AlertDialog open={showUnbindFinalDialog} onOpenChange={setShowUnbindFinalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>再次确认解绑？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可撤销，确定要解绑该孩子吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowUnbindFinalDialog(false);
                setShowUnbindDialog(true);
              }}
            >
              返回
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (childToUnbind) {
                  try {
                    await parentService.unbindChild(childToUnbind.id);
                    toast.success('已成功解绑');
                    setShowUnbindFinalDialog(false);
                    setChildToUnbind(null);
                    loadChildren();
                  } catch (error) {
                    toast.error('解绑失败，请稍后重试');
                  }
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              确认解绑
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 设置密码对话框 */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center">修改密码</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入至少 8 位密码"
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
              <Label htmlFor="bind-child-name">孩子的姓名</Label>
              <Input
                id="bind-child-name"
                value={bindName}
                onChange={(e) => setBindName(e.target.value)}
                placeholder="请输入孩子姓名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bind-child-phone">孩子的手机号</Label>
              <div className="flex gap-2">
                <Input
                  id="bind-child-phone"
                  value={bindPhone}
                  onChange={(e) => setBindPhone(e.target.value)}
                  placeholder="请输入孩子的手机号"
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
                placeholder="请输入孩子收到的验证码"
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
