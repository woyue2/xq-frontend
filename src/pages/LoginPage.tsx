import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Eye, EyeSlash, X, Users, Baby } from '@phosphor-icons/react';
import type { UserRole } from '@/types';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { authService } from '@/services/api';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  // 登录默认使用密码；验证码仅用于注册/绑定/改绑等流程
  const [loginMode] = useState<'code' | 'password'>('password');
  const [lastSentCode, setLastSentCode] = useState('');
  const [showRegisterCodeHint, setShowRegisterCodeHint] = useState(false);
  const registerCodeRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 注册场景下的真实姓名（可选）
  const [name, setName] = useState('');
  // 注册场景下用于展示的昵称（如未填写则生成默认值）
  const [nickname, setNickname] = useState('');

  // 学生注册专用字段
  const [grade, setGrade] = useState('');
  const [age, setAge] = useState('');
  const [school, setSchool] = useState('');

  // 注册时选择的身份
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'student' | 'parent' | null>(null);

  const resetRegisterCodeHint = () => {
    if (registerCodeRevealTimerRef.current) {
      clearTimeout(registerCodeRevealTimerRef.current);
      registerCodeRevealTimerRef.current = null;
    }
    setShowRegisterCodeHint(false);
    setLastSentCode('');
  };

  useEffect(() => {
    return () => {
      if (registerCodeRevealTimerRef.current) {
        clearTimeout(registerCodeRevealTimerRef.current);
      }
    };
  }, []);

  const handleGetCode = async () => {
    if (!phone || phone.length !== 11) {
      toast.error('请输入正确的手机号');
      return;
    }

    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      const response = await authService.sendCode({
        phone,
        type: isLogin ? 'login' : 'register'
      });
      toast.success('验证码已发送');

      if (!isLogin) {
        // ⚠️ 不确定因素：后端在部分环境可能不返回 code；无 code 时不展示“本次验证码”文案。
        const sentCode = response.data.data?.code ?? '';
        resetRegisterCodeHint();
        if (sentCode) {
          setLastSentCode(sentCode);
          registerCodeRevealTimerRef.current = setTimeout(() => {
            setShowRegisterCodeHint(true);
            registerCodeRevealTimerRef.current = null;
          }, 2000);
        }
      } else {
        resetRegisterCodeHint();
      }
    } catch {
      // 统一错误已经在拦截器中处理，这里只停止倒计时
      setCountdown(0);
      resetRegisterCodeHint();
    }
  };

  const handleSubmit = async () => {
    // 表单验证
    if (!phone || phone.length !== 11) {
      toast.error('请输入正确的手机号');
      return;
    }

    if (isLogin && !password) {
      toast.error('请输入密码');
      return;
    }

    if (!isLogin && !code) {
      toast.error('请输入验证码');
      return;
    }

    if (!isLogin && (!password || password.length < 8)) {
      toast.error('请设置至少 8 位登录密码');
      return;
    }

    if (!isLogin && !selectedRole) {
      // 修改原因：注册改为角色驱动，不再依赖邀请码；未选角色时阻止提交。
      toast.error('请先选择注册身份');
      return;
    }

    // 姓名验证：家长可选，学生必填
    if (!isLogin && selectedRole !== 'parent' && !name.trim()) {
      toast.error('请输入真实姓名');
      return;
    }

    // 学生注册需要年级和年龄
    if (selectedRole === 'student') {
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

    // 统一走真实后端联调模式（在测试环境下由 api.ts Mock 拦截器兜底）
    try {
      if (isLogin) {
        const response = await authService.passwordLogin({
          phone,
          password
        });
        const { token, user } = response.data.data;
        login(user, token);
        toast.success('登录成功');
        navigate('/');
        return;
      }

      // 注册走后端 /auth/register
      // 修改原因：注册角色来源统一为前端角色选择，不再从邀请码推断。
      const desiredRole: UserRole = selectedRole === 'parent' ? 'parent' : 'student';

      const registerResult = await authService.register({
        phone,
        code,
        password,
        name: name.trim(),
        nickname: nickname.trim() || `用户${phone.slice(-4)}`,
        grade: selectedRole === 'student' ? grade : undefined,
        age: selectedRole === 'student' ? parseInt(age, 10) : undefined,
        school: selectedRole === 'student' ? school : undefined,
        role: desiredRole
      });

      // authService.register 已经返回 LoginResponse
      login(registerResult.user, registerResult.token);

      toast.success('注册并登录成功');
      navigate('/');
    } catch {
      // 具体错误提示由 axios 拦截器处理，这里无需重复处理
    }
  };

  const basePhoneValid = phone.length === 11;
  const loginValid = isLogin && !!password;
  const registerValid =
    !isLogin &&
    !!selectedRole &&
    !!code &&
    password.length >= 8 &&
    (selectedRole === 'student'
      ? grade && age && school
      : selectedRole === 'parent'
      ? true  // 家长注册不需要额外字段验证
      : false);
  const canSubmit = basePhoneValid && (loginValid || registerValid);

  return (
    // 修改原因：夸克“智能排版”可能改写视口计算，min-h-[100dvh] 用于优先匹配动态可视区域高度。
    // ⚠️ 不确定因素：不同夸克版本对 dvh 的支持存在差异，保留 min-h-screen 作为回退。
    <div className="flex flex-col min-h-screen min-h-[100dvh] overflow-y-auto">
      {/* 角色选择弹窗 */}
      <Dialog open={showRoleSelect} onOpenChange={setShowRoleSelect}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">选择注册身份</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-6">
            <Button
              variant="outline"
              className="h-32 flex flex-col gap-3"
              onClick={() => {
                setSelectedRole('student');
                setShowRoleSelect(false);
                setIsLogin(false);
              }}
            >
              <Users className="w-10 h-10 text-blue-500" />
              <div className="flex flex-col gap-1">
                <span className="font-medium">学生</span>
                <span className="text-xs text-gray-500">需要填写学校信息</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex flex-col gap-3"
              onClick={() => {
                setSelectedRole('parent');
                setShowRoleSelect(false);
                setIsLogin(false);
              }}
            >
              <Baby className="w-10 h-10 text-orange-500" />
              <div className="flex flex-col gap-1">
                <span className="font-medium">家长</span>
                <span className="text-xs text-gray-500">需要绑定孩子</span>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 顶部标题栏 */}
      {/* <div className="bg-white shadow-sm py-4">
        <h1 className="text-center text-xl">
          {isLogin ? '账号登录' : '账号注册'}
        </h1>
      </div> */}

      {/* 中间内容区 */}
      {/* 修改原因：在被浏览器二次排版时保留纵向伸缩空间，避免首屏被工具栏/重排策略裁切后无法滚动查看完整表单。 */}
      <div className="flex-1 flex flex-col justify-center pb-10">
        <div className="w-full space-y-6">
          {/* Logo区域 */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl">
              知
            </div>
            <h2 className="text-2xl mb-1">初中知识问答</h2>
            <p className="text-xs text-[#D5BDAF] font-bold mb-3">好好学习，天天向上</p>
          </div>

          {/* 手机号输入 */}
          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                placeholder="请输入11位手机号"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 11));
                  resetRegisterCodeHint();
                }}
                className="pr-8"
              />
              {phone && (
                <button
                  onClick={() => {
                    setPhone('');
                    resetRegisterCodeHint();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 验证码 / 密码输入 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="code">
                {isLogin ? '密码' : '验证码'}
              </Label>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="code"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isLogin ? '请输入密码' : '请输入验证码'}
                  value={isLogin ? password : code}
                  onChange={(e) => {
                    if (isLogin) {
                      setPassword(e.target.value);
                    } else {
                      setCode(e.target.value);
                    }
                  }}
                  className="pr-8"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!isLogin && (
                <Button
                  onClick={handleGetCode}
                  disabled={countdown > 0}
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}秒` : '获取验证码'}
                </Button>
              )}
            </div>
            {!isLogin && lastSentCode && (
              <p
                className={`text-xs text-amber-600 transition-all duration-700 ease-out ${
                  showRegisterCodeHint ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                }`}
              >
                本次验证码：{lastSentCode}
              </p>
            )}
          </div>

          {/* 注册真实姓名输入（仅注册模式） */}
          {/* 注册真实姓名输入（仅注册模式，家长不显示） */}
          {!isLogin && selectedRole !== 'parent' && (
            <div className="space-y-2">
              <Label htmlFor="registerName">真实姓名 *</Label>
              <Input
                id="registerName"
                type="text"
                placeholder="请输入真实姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          {/* 注册昵称输入（仅注册模式） */}
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="nickname">昵称（用于展示，可选）</Label>
              <Input
                id="nickname"
                type="text"
                placeholder="请输入昵称（如未填写将自动生成）"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
          )}

          {/* 注册密码输入（仅注册模式，位于姓名下方） */}
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="registerPassword">密码 *</Label>
              <div className="relative">
                <Input
                  id="registerPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请设置至少8位密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-8"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">密码至少 8 位，建议包含数字和字母</p>
            </div>
          )}

          {/* 学生专属字段（仅学生注册时显示） */}
          {selectedRole === 'student' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="grade">年级 *</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger id="grade">
                    <SelectValue placeholder="请选择年级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="初一">初一</SelectItem>
                    <SelectItem value="初二">初二</SelectItem>
                    <SelectItem value="初三">初三</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">年龄 *</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="请输入年龄（10-18岁）"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="10"
                  max="18"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="school">学校 *</Label>
                <Input
                  id="school"
                  type="text"
                  placeholder="请输入学校名称"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                />
              </div>
            </>
          )}


          {/* 提交按钮 */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isLogin ? '登录' : '注册'}
            </Button>

            <Button
              onClick={() => {
                if (isLogin) {
                  // 从登录切换到注册时，显示角色选择弹窗
                  setShowRoleSelect(true);
                  resetRegisterCodeHint();
                } else {
                  // 从注册切换到登录
                  setIsLogin(true);
                  setGrade('');
                  setAge('');
                  setSchool('');
                  setName('');
                  setNickname('');
                  setPassword('');
                  setCode('');
                  setSelectedRole(null);
                  resetRegisterCodeHint();
                }
              }}
              variant="outline"
              className="w-full h-12"
            >
              {isLogin ? '快速注册' : '已有账号，去登录'}
            </Button>
          </div>

          {/* 底部辅助区 */}
          <div className="text-center space-y-2 pt-4">
            <button
              className="text-sm text-blue-500 hover:underline"
              onClick={() => {
                toast.info('请联系老师');
              }}
            >
              忘记密码？
            </button>
            <p className="text-xs text-gray-400">
              登录即表示同意《用户协议》和《隐私政策》
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
