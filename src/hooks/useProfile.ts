/**
 * [POS] src/hooks/useProfile.ts
 *   所属：hooks 层 | 角色：个人主页全量 state + API 交互逻辑
 *   兄弟：useLogin.ts（同 hooks 层）
 *
 * [INPUT]
 *   - react                  → useState / useEffect
 *   - react-router-dom       → useNavigate
 *   - sonner                 → toast
 *   - @/services/api         → authService / userService / questionService
 *   - @/services/parentService → parentService
 *   - @/stores/useAuthStore  → useAuthStore
 *   - @/config/ai-text       → aiTextConfig
 *   - @/types/parent         → ChildInfo
 *
 * [OUTPUT]
 *   - useProfile（hook）→ 个人主页 state、dialog handler、头像/昵称/密码/绑定孩子逻辑
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化）
 *   2. src/hooks/CLAUDE.md 的文件清单
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authService, userService, questionService } from '@/services/api';
import { parentService } from '@/services/parentService';
import { useAuthStore } from '@/stores/useAuthStore';
import { aiTextConfig } from '@/config/ai-text';
import type { ChildInfo } from '@/types/parent';
import { ROUTES } from '@/config/app-constants';

export function useProfile() {
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // 家长绑定相关状态
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [showBindDialog, setShowBindDialog] = useState(false);
  const [bindName, setBindName] = useState('');
  const [bindPhone, setBindPhone] = useState('');
  const [bindCode, setBindCode] = useState('');
  const [bindSchool, setBindSchool] = useState('');
  const [bindCountdown, setBindCountdown] = useState(0);

  // 未登录跳转
  useEffect(() => {
    if (!currentUser) {
      navigate(ROUTES.login);
    }
  }, [currentUser, navigate]);

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

  const handleGetBindCode = () => {
    if (!bindPhone || bindPhone.length !== 11) {
      toast.error('请输入正确的手机号');
      return;
    }
    setBindCountdown(60);
    const timer = setInterval(() => {
      setBindCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    parentService.sendBindSms(bindPhone);
    toast.success('验证码已发送');
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
        school: bindSchool,
      });
      toast.success('绑定成功');
      setShowBindDialog(false);
      setBindName('');
      setBindPhone('');
      setBindCode('');
      setBindSchool('');
      loadChildren();
    } catch {
      // 错误由拦截器统一处理
    }
  };

  const handleUpdateNickname = async () => {
    if (!newNickname.trim()) {
      toast.error('请输入昵称');
      return;
    }
    if (newNickname.length < 2) {
      toast.error(aiTextConfig.auditMessages.nicknameTooShort);
      return;
    }
    setIsSubmittingNickname(true);
    try {
      const updatedUser = await userService.updateProfile({ nickname: newNickname });
      updateUser(updatedUser);
      toast.success(aiTextConfig.auditMessages.nicknameUpdated);
      setShowNicknameDialog(false);
      setNewNickname('');
    } catch (error: any) {
      console.error('Update nickname failed', error);
    } finally {
      setIsSubmittingNickname(false);
    }
  };

  const handleUpdateAvatar = async (url: string) => {
    setIsUploadingAvatar(true);
    try {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过 2MB');
      return;
    }
    setIsUploadingAvatar(true);
    try {
      toast.loading('正在上传...', { id: 'upload-avatar' });
      const { imageUrl } = await questionService.uploadImage(file, {
        purpose: 'avatar',
        senderName: currentUser?.nickname,
      });
      await handleUpdateAvatar(imageUrl);
      toast.dismiss('upload-avatar');
    } catch {
      toast.dismiss('upload-avatar');
    } finally {
      setIsUploadingAvatar(false);
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

  const handleSwitchAccount = () => {
    toast.success('切换账号');
    logout();
    navigate(ROUTES.login);
  };

  const handleLogout = () => {
    logout();
    toast.success('已退出登录');
    navigate(ROUTES.login);
  };

  return {
    currentUser,
    // dialog open state
    showLogoutDialog, setShowLogoutDialog,
    showAvatarDialog, setShowAvatarDialog,
    showNicknameDialog, setShowNicknameDialog,
    showPasswordDialog, setShowPasswordDialog,
    showBindDialog, setShowBindDialog,
    // nickname
    newNickname, setNewNickname,
    isSubmittingNickname,
    // password
    newPassword, setNewPassword,
    isSubmittingPassword,
    // avatar
    isUploadingAvatar,
    // bind child
    children,
    bindName, setBindName,
    bindPhone, setBindPhone,
    bindCode, setBindCode,
    bindSchool, setBindSchool,
    bindCountdown,
    // actions
    handleGetBindCode,
    handleBindChild,
    handleUpdateNickname,
    handleUpdateAvatar,
    handleFileUpload,
    handleUpdatePassword,
    handleSwitchAccount,
    handleLogout,
  };
}
