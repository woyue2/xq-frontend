import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Eye, EyeOff, X } from 'lucide-react';
import { mockUsers, validInviteCodes } from '@/lib/mock-data';
import type { UserRole } from '@/types';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavigate } from 'react-router-dom';

import { parentService } from '@/services/parentService';
import { authService } from '@/services/api';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 学生注册专用字段
  const [grade, setGrade] = useState('');
  const [age, setAge] = useState('');
  const [school, setSchool] = useState('');

  // 家长注册专用字段
  const [childName, setChildName] = useState('');
  const [childPhone, setChildPhone] = useState('');
  const [childCode, setChildCode] = useState('');
  const [childSchool, setChildSchool] = useState('');
  const [childCountdown, setChildCountdown] = useState(0);

  // 判断是否为学生邀请码
  const isStudentInvite = !isLogin && (inviteCode === 'STUDENT2024' || inviteCode === 'ZHISHIXINGQIU2024');
  // 判断是否为家长邀请码
  const isParentInvite = !isLogin && inviteCode === 'PARENT2024';
  // 判断是否为老师邀请码
  const isTeacherInvite = !isLogin && inviteCode === 'TEACHER2024';

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

    if (USE_MOCK) {
      toast.success('验证码已发送');
      return;
    }

    try {
      await authService.sendCode({
        phone,
        type: isLogin ? 'login' : 'register'
      });
      toast.success('验证码已发送');
    } catch {
      // 统一错误已经在拦截器中处理，这里只停止倒计时
      setCountdown(0);
    }
  };

  const handleGetChildCode = () => {
    if (!childPhone || childPhone.length !== 11) {
      toast.error('请输入正确的孩子手机号');
      return;
    }

    setChildCountdown(60);
    const timer = setInterval(() => {
      setChildCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 调用发送验证码接口
    parentService.sendBindSms(childPhone);
    toast.success('验证码已发送');
  };

  const handleSubmit = async () => {
    // 表单验证
    if (!phone || phone.length !== 11) {
      toast.error('请输入正确的手机号');
      return;
    }

    if (!code) {
      toast.error('请输入验证码');
      return;
    }

    if (!isLogin && !inviteCode) {
      toast.error('请输入邀请码');
      return;
    }

    if (!isLogin && !validInviteCodes.includes(inviteCode)) {
      toast.error('邀请码无效');
      return;
    }

    // 学生注册需要年级和年龄
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

    // 家长注册需要绑定孩子信息
    if (isParentInvite) {
      if (!childName) {
        toast.error('请输入孩子姓名');
        return;
      }
      if (!childPhone || childPhone.length !== 11) {
        toast.error('请输入正确的孩子手机号');
        return;
      }
      if (!childCode) {
        toast.error('请输入孩子验证码');
        return;
      }
    }

    // 分支 1：前端 mock 模式（用于纯前端体验与测试）
    if (USE_MOCK) {
      // 模拟登录/注册
      let user = mockUsers.find((u) => u.phone === phone);

      if (!user && isLogin) {
        toast.error('账号不存在，请先注册');
        return;
      }

      if (!user && !isLogin) {
        // 注册新用户
        const roleMap: Record<string, UserRole> = {
          'ZHISHIXINGQIU2024': 'student',
          'STUDENT2024': 'student',
          'TEACHER2024': 'teacher',
          'PARENT2024': 'parent',
        };

        user = {
          id: String(mockUsers.length + 1),
          phone,
          nickname: `用户${phone.slice(-4)}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone}`,
          role: roleMap[inviteCode] || 'student',
          // 学生专属字段
          ...(isStudentInvite && {
            grade,
            age: parseInt(age),
            school,
          }),
        };

        mockUsers.push(user);
        toast.success('注册成功');
      }

      if (user) {
        login(user, 'mock-jwt-token');
        
        // 如果是家长注册，执行绑定逻辑
        if (isParentInvite) {
          try {
            await parentService.bindChild({
              childName,
              phone: childPhone,
              code: childCode,
              school: childSchool
            });
            toast.success('自动绑定孩子成功');
          } catch (error) {
            console.error('自动绑定失败:', error);
            toast.error('自动绑定孩子失败，请稍后重试');
          }
        }

        toast.success('登录成功');
        navigate('/');
      }
      return;
    }

    // 分支 2：真实后端联调模式
    try {
      if (isLogin) {
        const response = await authService.login({
          phone,
          code
        });
        const { token, user } = response.data.data;
        login(user, token);
        toast.success('登录成功');
        navigate('/');
        return;
      }

      // 注册走后端 /auth/register
      const desiredRole: UserRole =
        isStudentInvite ? 'student' : isParentInvite ? 'parent' : 'teacher';

      const registerResult = await authService.register({
        phone,
        code,
        nickname: `用户${phone.slice(-4)}`,
        grade: isStudentInvite ? grade : undefined,
        age: isStudentInvite ? parseInt(age, 10) : undefined,
        school: isStudentInvite ? school : undefined,
        role: desiredRole
      });

      // authService.register 已经返回 LoginResponse
      login(registerResult.user, registerResult.token);

      // 如果是家长注册，执行绑定逻辑（已登录状态下）
      if (isParentInvite) {
        try {
          await parentService.bindChild({
            childName,
            phone: childPhone,
            code: childCode,
            school: childSchool
          });
          toast.success('自动绑定孩子成功');
        } catch (error) {
          console.error('自动绑定失败:', error);
          toast.error('自动绑定孩子失败，请稍后重试');
        }
      }

      toast.success('注册并登录成功');
      navigate('/');
    } catch {
      // 具体错误提示由 axios 拦截器处理，这里无需重复处理
    }
  };

  const canSubmit = phone.length === 11 && code && (isLogin || (inviteCode && (!isStudentInvite || (grade && age && school))));

  return (
    <div className="flex flex-col min-h-screen">
      {/* 顶部标题栏 */}
      <div className="bg-white shadow-sm py-4">
        <h1 className="text-center text-xl">
          {isLogin ? '账号登录' : '账号注册'}
        </h1>
      </div>

      {/* 中间内容区 */}
      <div className="flex-1 flex flex-col justify-center pb-10">
        <div className="w-full space-y-6">
          {/* Logo区域 */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl">
              知
            </div>
            <h2 className="text-2xl mb-1">初中知识问答</h2>
            <p className="text-xs text-[#D5BDAF] font-bold mb-3">好好学习，天天向上</p>
            <p className="text-gray-500">欢迎来到知识星球</p>
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
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                className="pr-8"
              />
              {phone && (
                <button
                  onClick={() => setPhone('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 验证码输入 */}
          <div className="space-y-2">
            <Label htmlFor="code">验证码</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="code"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="pr-8"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                onClick={handleGetCode}
                disabled={countdown > 0}
                variant="outline"
                className="whitespace-nowrap"
              >
                {countdown > 0 ? `${countdown}秒` : '获取验证码'}
              </Button>
            </div>
          </div>

          {/* 邀请码输入（仅注册时显示） */}
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="invite">邀请码 *</Label>
              <Input
                id="invite"
                type="text"
                placeholder="需输入有效邀请码方可注册"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  // 切换邀请码时重置学生字段
                  setGrade('');
                  setAge('');
                }}
              />
              <p className="text-xs text-gray-500">
                需输入有效邀请码方可注册
              </p>
              <p className="text-xs text-gray-500">
                提示：学生邀请码 STUDENT2024 | 老师邀请码 TEACHER2024 | 家长邀请码 PARENT2024
              </p>
            </div>
          )}

          {/* 学生专属字段（仅注册且使用学生邀请码时显示） */}
          {isStudentInvite && (
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

          {/* 家长专属字段（仅注册且使用家长邀请码时显示） */}
          {isParentInvite && (
            <div className="space-y-4 border-t pt-4 mt-2">
              <p className="text-sm font-medium text-gray-700">绑定孩子信息</p>
              
              <div className="space-y-2">
                <Label htmlFor="childName">孩子姓名 *</Label>
                <Input
                  id="childName"
                  placeholder="请输入孩子姓名"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="childSchool">孩子学校</Label>
                <Input
                  id="childSchool"
                  data-testid="childSchool"
                  placeholder="请输入孩子学校（选填）"
                  value={childSchool}
                  onChange={(e) => setChildSchool(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="childPhone">孩子手机号 *</Label>
                <div className="relative">
                  <Input
                    id="childPhone"
                    type="tel"
                    placeholder="请输入孩子手机号"
                    value={childPhone}
                    onChange={(e) => setChildPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="pr-8"
                  />
                  {childPhone && (
                    <button
                      onClick={() => setChildPhone('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="childCode">验证码 *</Label>
                <div className="flex gap-2">
                  <Input
                    id="childCode"
                    placeholder="请输入验证码"
                    value={childCode}
                    onChange={(e) => setChildCode(e.target.value)}
                  />
                  <Button
                    onClick={handleGetChildCode}
                    disabled={childCountdown > 0 || !childPhone || childPhone.length !== 11}
                    variant="outline"
                    className="whitespace-nowrap"
                  >
                    {childCountdown > 0 ? `${childCountdown}秒` : '获取验证码'}
                  </Button>
                </div>
              </div>
            </div>
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
                setIsLogin(!isLogin);
                setInviteCode('');
                setGrade('');
                setAge('');
                setChildName('');
                setChildPhone('');
                setChildCode('');
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
