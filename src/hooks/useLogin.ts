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

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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

      toast.success('注册并登录成功');
      navigate(ROUTES.home);
    } catch (error: unknown) {
      // 密码登录：根据错误类型展示专项 toast
      if (isLogin && loginMode === 'password') {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        const status = axiosError?.response?.status;
        const message = axiosError?.response?.data?.message;

        if (status === 401) {
          toast.error('密码错误，请重新输入', { duration: 4000 });
        } else if (message) {
          toast.error(message, { duration: 4000 });
        }
        // 其他错误（500、网络超时）由拦截器兜底，此处不重复弹 toast
      }
      // 非密码登录的具体错误提示由 axios 拦截器处理
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setInviteCode('');
    setGrade('');
    setAge('');
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
    // countdown
    countdown,
    // derived
    isStudentInvite,
    isParentInvite,
    isTeacherInvite,
    canSubmit,
    // actions
    handleGetCode,
    handleSubmit,
    switchMode,
  };
}
