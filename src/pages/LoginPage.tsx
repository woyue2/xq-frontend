import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import { Eye, EyeOff, X } from 'lucide-react';
import { mockUsers, setCurrentUser, validInviteCodes } from '@/lib/mock-data';
import type { UserRole } from '@/types';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // 学生注册专用字段
  const [grade, setGrade] = useState('');
  const [age, setAge] = useState('');

  // 判断是否为学生邀请码
  const isStudentInvite = !isLogin && (inviteCode === 'STUDENT2024' || inviteCode === 'ZHISHIXINGQIU2024');
  const isParentInvite = !isLogin && inviteCode === 'PARENT2024';

  const handleGetCode = () => {
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
    
    toast.success('验证码已发送');
  };

  const handleSubmit = () => {
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
    }

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
        }),
      };
      
      mockUsers.push(user);
      toast.success('注册成功');
    }
    
    if (user) {
      setCurrentUser(user);
      toast.success('登录成功');
      onLogin();
    }
  };

  const canSubmit = phone.length === 11 && code && (isLogin || (inviteCode && (!isStudentInvite || (grade && age))));

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* 顶部标题栏 */}
      <div className="bg-white shadow-sm py-4">
        <h1 className="text-center text-xl">
          {isLogin ? '账号登录' : '账号注册'}
        </h1>
      </div>

      {/* 中间内容区 */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-20">
        <div className="w-full max-w-md mx-auto space-y-6">
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
                disabled={countdown > 0 || !phone || phone.length !== 11}
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
                setIsLogin(!isLogin);
                setInviteCode('');
                setGrade('');
                setAge('');
              }}
              variant="outline"
              className="w-full h-12"
            >
              {isLogin ? '快速注册' : '已有账号，去登录'}
            </Button>
          </div>

          {/* 底部辅助区 */}
          <div className="text-center space-y-2 pt-4">
            <button className="text-sm text-blue-500 hover:underline">
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
