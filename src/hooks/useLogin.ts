/**
 * [POS] src/hooks/useLogin.ts
 *   所属：hooks 层 | 角色：登录/注册页全量 state + API 交互逻辑
 *   兄弟：useAdminWhitelist.ts（同 hooks 层）
 *
 * [INPUT]
 *   - react                    → useState / useRef / useEffect
 *   - react-router-dom         → useNavigate
 *   - sonner                   → toast
 *   - @/services/api           → authService
 *   - @/services/parentService → parentService
 *   - @/stores/useAuthStore    → useAuthStore
 *   - @/lib/mock-env           → USE_MOCK
 *   - @/lib/mock-data          → validInviteCodes
 *   - @/types                  → UserRole
 *   - @/config/app-constants   → ROUTES
 *
 * [OUTPUT]
 *   - useLogin（hook）→ 登录/注册全量 state、派生值、handler
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化）
 *   2. src/hooks/CLAUDE.md 的文件清单
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authService } from '@/services/api';
import { parentService } from '@/services/parentService';
import { useAuthStore } from '@/stores/useAuthStore';
import { USE_MOCK } from '@/lib/mock-env';
import { validInviteCodes } from '@/lib/mock-data';
import type { UserRole } from '@/types';
import { ROUTES } from '@/config/app-constants';

export function useLogin() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loginMode, setLoginMode] = useState<'code' | 'password'>('password'); // [DISABLED] 验证码登录暂时隐藏，默认密码登录

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');

  const [grade, setGrade] = useState('');
  const [age, setAge] = useState('');
  const [school, setSchool] = useState('');

  const [childName, setChildName] = useState('');
  const [childPhone, setChildPhone] = useState('');
  const [childCode, setChildCode] = useState('');
  const [childSchool, setChildSchool] = useState('');
  const [childCountdown, setChildCountdown] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const childTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (childTimerRef.current) clearInterval(childTimerRef.current);
    };
  }, []);

  // ─── 派生值 ────────────────────────────────────────────────────────────────
  const isStudentInvite =
    !isLogin && (inviteCode === 'STUDENT2024' || inviteCode === 'ZHISHIXINGQIU2024');
  const isParentInvite = !isLogin && inviteCode === 'PARENT2024';
  const isTeacherInvite = !isLogin && inviteCode === 'TEACHER2024';

  const basePhoneValid = phone.length === 11;
  const loginValid =
    isLogin && ((loginMode === 'code' && !!code) || (loginMode === 'password' && !!password));
  const registerValid =
    !isLogin &&
    !!inviteCode &&
    password.length >= 8 &&
    (!isStudentInvite || (grade && age && school));
  const canSubmit = basePhoneValid && (loginValid || registerValid);

  // ─── handlers ──────────────────────────────────────────────────────────────
  const handleGetCode = async () => {
    if (!phone || phone.length !== 11) {
      toast.error('请输入正确的手机号');
      return;
    }

    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      await authService.sendCode({
        phone,
        type: isLogin ? 'login' : 'register',
      });
      toast.success('验证码已发送');
    } catch {
      setCountdown(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleGetChildCode = async () => {
    if (!childPhone || childPhone.length !== 11) {
      toast.error('请输入正确的孩子手机号');
      return;
    }

    setChildCountdown(60);
    if (childTimerRef.current) clearInterval(childTimerRef.current);
    childTimerRef.current = setInterval(() => {
      setChildCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(childTimerRef.current!);
          childTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      await parentService.sendBindSms(childPhone);
      toast.success('验证码已发送');
    } catch {
      setChildCountdown(0);
      if (childTimerRef.current) {
        clearInterval(childTimerRef.current);
        childTimerRef.current = null;
      }
      toast.error('验证码发送失败，请稍后重试');
    }
  };

  const handleSubmit = async () => {
    if (!phone || phone.length !== 11) {
      toast.error('请输入正确的手机号');
      return;
    }

    if (isLogin && loginMode === 'code' && !code) {
      toast.error('请输入验证码');
      return;
    }

    if (isLogin && loginMode === 'password' && !password) {
      toast.error('请输入密码');
      return;
    }

    // [DISABLED] 注册验证码校验已移除，使用固定码兜底
    // if (!isLogin && !code) {
    //   toast.error('请输入验证码');
    //   return;
    // }

    if (!isLogin && !inviteCode) {
      toast.error('请输入邀请码');
      return;
    }

    if (USE_MOCK && !isLogin) {
      if (!validInviteCodes.includes(inviteCode)) {
        toast.error('邀请码无效');
        return;
      }
    }

    if (!isLogin && password.length < 8) {
      toast.error('密码至少8位');
      return;
    }

    if (isStudentInvite) {
      if (!grade) {
        toast.error('请选择年级');
        return;
      }
      if (!age) {
        toast.error('请输入年龄');
        return;
      }
      const ageNum = parseInt(age);
      if (ageNum < 10 || ageNum > 18) {
        toast.error('请输入有效年龄（10-18岁）');
        return;
      }
      if (!school) {
        toast.error('请输入学校名称');
        return;
      }
    }

    if (isParentInvite) {
      if (!childName) {
        toast.error('请输入孩子姓名');
        return;
      }
      if (!childPhone || childPhone.length !== 11) {
        toast.error('请输入正确的孩子手机号');
        return;
      }
      // [DISABLED] 孩子验证码校验已移除，使用固定码兜底
      // if (!childCode) {
      //   toast.error('请输入孩子验证码');
      //   return;
      // }
    }

    try {
      if (isLogin) {
        if (loginMode === 'password') {
          const response = await authService.passwordLogin({ phone, password });
          const { token, user } = response.data.data;
          login(user, token);
          toast.success('登录成功');
          navigate(ROUTES.home);
          return;
        }

        const response = await authService.login({ phone, code });
        const { token, user } = response.data.data;
        login(user, token);
        toast.success('登录成功');
        navigate(ROUTES.home);
        return;
      }

      const desiredRole: UserRole = isStudentInvite
        ? 'student'
        : isParentInvite
          ? 'parent'
          : 'teacher';

      const registerResult = await authService.register({
        phone,
        code: '123456', // [DISABLED] 验证码已隐藏，使用固定码兜底
        password,
        name: name.trim(),
        nickname: nickname.trim() || `用户${phone.slice(-4)}`,
        grade: isStudentInvite ? grade : undefined,
        age: isStudentInvite ? parseInt(age, 10) : undefined,
        school: isStudentInvite ? school : undefined,
        role: desiredRole,
      });

      login(registerResult.user, registerResult.token);

      if (isParentInvite) {
        try {
          await parentService.bindChild({
            childName,
            phone: childPhone,
            code: '123456', // [DISABLED] 验证码已隐藏，使用固定码兜底
            school: childSchool,
          });
          toast.success('自动绑定孩子成功');
        } catch (error) {
          console.error('自动绑定失败:', error);
          toast.error('自动绑定孩子失败，请稍后重试');
        }
      }

      toast.success('注册并登录成功');
      navigate(ROUTES.home);
    } catch {
      // 具体错误提示由 axios 拦截器处理
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setInviteCode('');
    setGrade('');
    setAge('');
    setChildName('');
    setChildPhone('');
    setChildCode('');
  };

  return {
    // mode
    isLogin,
    loginMode,
    setLoginMode,
    // form fields
    phone,
    setPhone,
    code,
    setCode,
    password,
    setPassword,
    inviteCode,
    setInviteCode,
    showPassword,
    setShowPassword,
    name,
    setName,
    nickname,
    setNickname,
    // student fields
    grade,
    setGrade,
    age,
    setAge,
    school,
    setSchool,
    // parent / child fields
    childName,
    setChildName,
    childPhone,
    setChildPhone,
    childCode,
    setChildCode,
    childSchool,
    setChildSchool,
    // countdown
    countdown,
    childCountdown,
    // derived
    isStudentInvite,
    isParentInvite,
    isTeacherInvite,
    canSubmit,
    // actions
    handleGetCode,
    handleGetChildCode,
    handleSubmit,
    switchMode,
  };
}
