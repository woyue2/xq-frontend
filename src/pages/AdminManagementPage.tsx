import { useState } from 'react';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Search,
  UserPlus,
  Shield,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Minus,
  Edit
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/app/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import type { UserRole } from '@/types';

interface WhitelistUser {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  isRegistered: boolean;
  createdAt: string;
  registeredAt?: string;
  expiresAt?: string; // 课时过期时间（学生和家长共享）
}

interface AdminManagementPageProps {
  onNavigate: (page: string) => void;
}

export function AdminManagementPage({ onNavigate }: AdminManagementPageProps) {
  // 模拟白名单数据
  const [whitelist, setWhitelist] = useState<WhitelistUser[]>([
    {
      id: '1',
      phone: '13800138000',
      name: '张三',
      role: 'student',
      isRegistered: true,
      createdAt: '2024-01-15 10:00:00',
      registeredAt: '2024-01-15 10:30:00',
      expiresAt: '2026-06-30'
    },
    {
      id: '2',
      phone: '13900139000',
      name: '李四',
      role: 'teacher',
      isRegistered: true,
      createdAt: '2024-01-16 09:00:00',
      registeredAt: '2024-01-16 09:15:00'
    },
    {
      id: '3',
      phone: '13700137000',
      name: '王五',
      role: 'student',
      isRegistered: false,
      createdAt: '2024-01-20 14:00:00',
      expiresAt: '2026-03-31'
    },
    {
      id: '4',
      phone: '13600136000',
      name: '赵六',
      role: 'parent',
      isRegistered: false,
      createdAt: '2024-01-21 11:00:00',
      expiresAt: '2026-03-31' // 家长和学生共享过期时间
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // 添加用户对话框
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');
  
  // 删除确认对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WhitelistUser | null>(null);

  // 课时管理对话框
  const [expiryDialogOpen, setExpiryDialogOpen] = useState(false);
  const [expiryTarget, setExpiryTarget] = useState<WhitelistUser | null>(null);
  const [expiryMonths, setExpiryMonths] = useState(1);

  // 二次确认对话框
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingExpiry, setPendingExpiry] = useState<{ user: WhitelistUser; date: string } | null>(null);

  // 过滤逻辑
  const filteredList = whitelist.filter(user => {
    const matchSearch = user.phone.includes(searchTerm) || user.name.includes(searchTerm);
    const matchRole = filterRole === 'all' || user.role === filterRole;
    const matchStatus = filterStatus === 'all' || 
      (filterStatus === 'registered' && user.isRegistered) ||
      (filterStatus === 'pending' && !user.isRegistered);
    return matchSearch && matchRole && matchStatus;
  });

  const getRoleBadge = (role: UserRole) => {
    const roleMap = {
      student: { label: '学生', className: 'bg-[#BDE0FE] text-blue-700' },
      teacher: { label: '老师', className: 'bg-[#D5BDAF] text-amber-900' },
      parent: { label: '家长', className: 'bg-[#CDB4DB] text-purple-700' },
    };
    return roleMap[role];
  };

  // 检查是否过期
  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  // 计算新的过期时间
  const calculateNewExpiry = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  const handleAddUser = () => {
    // 验证手机号
    if (!newPhone || newPhone.length !== 11) {
      toast.error('请输入正确的11位手机号');
      return;
    }

    // 验证姓名
    if (!newName.trim()) {
      toast.error('请输入用户姓名');
      return;
    }

    // 检查是否已存在
    if (whitelist.some(u => u.phone === newPhone)) {
      toast.error('该手机号已在白名单中');
      return;
    }

    // 添加到白名单
    const newUser: WhitelistUser = {
      id: String(Date.now()),
      phone: newPhone,
      name: newName,
      role: newRole,
      isRegistered: false,
      createdAt: new Date().toLocaleString('zh-CN'),
      // 学生和家长默认设置3个月有效期
      expiresAt: (newRole === 'student' || newRole === 'parent') ? calculateNewExpiry(3) : undefined
    };

    setWhitelist([newUser, ...whitelist]);
    toast.success('添加成功！用户可以使用该手机号注册');
    
    // 重置表单
    setNewPhone('');
    setNewName('');
    setNewRole('student');
    setAddDialogOpen(false);
  };

  const handleDeleteUser = (user: WhitelistUser) => {
    setDeleteTarget(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      setWhitelist(whitelist.filter(u => u.id !== deleteTarget.id));
      toast.success('已从白名单移除');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  // 打开课时管理对话框
  const handleManageExpiry = (user: WhitelistUser) => {
    setExpiryTarget(user);
    setExpiryMonths(1);
    setExpiryDialogOpen(true);
  };

  // 第一步：预览新的过期时间
  const handleExpirySubmit = () => {
    if (expiryTarget) {
      const newExpiry = calculateNewExpiry(expiryMonths);
      setPendingExpiry({ user: expiryTarget, date: newExpiry });
      setExpiryDialogOpen(false);
      setConfirmDialogOpen(true);
    }
  };

  // 第二步：确认修改
  const confirmExpiryChange = () => {
    if (pendingExpiry) {
      setWhitelist(whitelist.map(u => 
        u.id === pendingExpiry.user.id 
          ? { ...u, expiresAt: pendingExpiry.date }
          : u
      ));
      toast.success('课时有效期已更新');
      setConfirmDialogOpen(false);
      setPendingExpiry(null);
      setExpiryTarget(null);
    }
  };

  const stats = {
    total: whitelist.length,
    registered: whitelist.filter(u => u.isRegistered).length,
    pending: whitelist.filter(u => !u.isRegistered).length,
    students: whitelist.filter(u => u.role === 'student').length,
    teachers: whitelist.filter(u => u.role === 'teacher').length,
    parents: whitelist.filter(u => u.role === 'parent').length,
  };

  return (
    <div className="min-h-screen bg-[#EDEDE9] flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => onNavigate('profile')}
            className="p-2 hover:bg-gray-100 rounded-full transition active:scale-90"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex flex-col items-center flex-1">
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#D5BDAF]" />
              用户白名单管理
            </h1>
            <p className="text-[9px] text-[#D5BDAF] font-bold leading-none">好好学习，天天向上</p>
          </div>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-[#D5BDAF] hover:bg-[#B59D8F] text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            添加
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="max-w-7xl mx-auto w-full px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-gray-500 text-xs mb-1">白名单总数</div>
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-gray-500 text-xs mb-1">已注册</div>
            <div className="text-2xl font-bold text-green-600">{stats.registered}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-gray-500 text-xs mb-1">待注册</div>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-[#BDE0FE] bg-opacity-30 rounded-2xl p-3 border border-[#BDE0FE]">
            <div className="text-xs text-blue-700 mb-0.5">学生</div>
            <div className="text-xl font-bold text-blue-800">{stats.students}</div>
          </div>
          <div className="bg-[#D5BDAF] bg-opacity-30 rounded-2xl p-3 border border-[#D5BDAF]">
            <div className="text-xs text-amber-900 mb-0.5">老师</div>
            <div className="text-xl font-bold text-amber-900">{stats.teachers}</div>
          </div>
          <div className="bg-[#CDB4DB] bg-opacity-30 rounded-2xl p-3 border border-[#CDB4DB]">
            <div className="text-xs text-purple-700 mb-0.5">家长</div>
            <div className="text-xl font-bold text-purple-800">{stats.parents}</div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="max-w-7xl mx-auto w-full px-4 py-3 space-y-3">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索手机号或姓名..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-gray-200 rounded-2xl"
          />
        </div>

        {/* 筛选器 */}
        <div className="flex gap-2">
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="flex-1 bg-white rounded-2xl">
              <SelectValue placeholder="角色筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部角色</SelectItem>
              <SelectItem value="student">学生</SelectItem>
              <SelectItem value="teacher">老师</SelectItem>
              <SelectItem value="parent">家长</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="flex-1 bg-white rounded-2xl">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="registered">已注册</SelectItem>
              <SelectItem value="pending">待注册</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 pb-6">
        <div className="space-y-3">
          {filteredList.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center">
              <UserPlus className="w-16 h-16 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">暂无符合条件的用户</p>
            </div>
          ) : (
            filteredList.map(user => {
              const roleBadge = getRoleBadge(user.role);
              const expired = isExpired(user.expiresAt);
              const needsExpiry = user.role === 'student' || user.role === 'parent';
              
              return (
                <div
                  key={user.id}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-bold text-gray-800">{user.name}</span>
                        <Badge className={`${roleBadge.className} border-none text-xs`}>
                          {roleBadge.label}
                        </Badge>
                        {user.isRegistered ? (
                          <Badge className="bg-green-100 text-green-700 border-none text-xs flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            已注册
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700 border-none text-xs flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            待注册
                          </Badge>
                        )}
                        {needsExpiry && expired && (
                          <Badge className="bg-red-100 text-red-700 border-none text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            已过期
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{user.phone}</span>
                      </div>

                      <div className="text-xs text-gray-400">
                        添加时间：{user.createdAt}
                      </div>
                      
                      {user.isRegistered && user.registeredAt && (
                        <div className="text-xs text-green-600 mt-0.5">
                          注册时间：{user.registeredAt}
                        </div>
                      )}

                      {needsExpiry && user.expiresAt && (
                        <div className={`text-xs mt-1 flex items-center gap-1 ${expired ? 'text-red-600' : 'text-blue-600'}`}>
                          <Calendar className="w-3 h-3" />
                          课时有效期至：{user.expiresAt} {expired && '(已过期，权限降级为只读)'}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1">
                      {needsExpiry && (
                        <button
                          onClick={() => handleManageExpiry(user)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition active:scale-90"
                          title="管理课时"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 添加用户对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加用户到白名单</DialogTitle>
            <DialogDescription>
              只有在白名单中的手机号才能注册使用本系统
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">手机号 *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="请输入11位手机号"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                maxLength={11}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">姓名 *</Label>
              <Input
                id="name"
                placeholder="请输入用户姓名"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">角色 *</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">学生</SelectItem>
                  <SelectItem value="teacher">老师/管理员</SelectItem>
                  <SelectItem value="parent">家长</SelectItem>
                </SelectContent>
              </Select>
              {(newRole === 'student' || newRole === 'parent') && (
                <p className="text-xs text-gray-500">
                  默认课时有效期：3个月
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleAddUser}
              className="bg-[#D5BDAF] hover:bg-[#B59D8F]"
            >
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 课时管理对话框 */}
      <Dialog open={expiryDialogOpen} onOpenChange={setExpiryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>设置课时有效期</DialogTitle>
            <DialogDescription>
              为 {expiryTarget?.name} 设置课时有效期（以月为单位）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>当前有效期至</Label>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {expiryTarget?.expiresAt || '未设置'}
                {expiryTarget?.expiresAt && isExpired(expiryTarget.expiresAt) && (
                  <span className="text-red-600 ml-2">(已过期)</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>延长课时（月）</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setExpiryMonths(Math.max(1, expiryMonths - 1))}
                  disabled={expiryMonths <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="flex-1 text-center">
                  <div className="text-3xl font-bold text-blue-600">{expiryMonths}</div>
                  <div className="text-xs text-gray-500">个月</div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setExpiryMonths(Math.min(12, expiryMonths + 1))}
                  disabled={expiryMonths >= 12}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                可使用按钮调整月数（1-12个月）
              </p>
            </div>

            <div className="space-y-2">
              <Label>新的有效期至</Label>
              <div className="text-sm font-bold text-blue-600 bg-blue-50 p-3 rounded-lg">
                {calculateNewExpiry(expiryMonths)}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExpiryDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleExpirySubmit}
              className="bg-[#D5BDAF] hover:bg-[#B59D8F]"
            >
              下一步
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 二次确认对话框 */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认修改课时有效期？</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingExpiry && (
                <div className="space-y-2 mt-2">
                  <div>用户：<strong>{pendingExpiry.user.name}</strong> ({pendingExpiry.user.phone})</div>
                  <div>角色：<strong>{getRoleBadge(pendingExpiry.user.role).label}</strong></div>
                  <div>原有效期：{pendingExpiry.user.expiresAt || '未设置'}</div>
                  <div className="text-blue-600 font-bold">新有效期：{pendingExpiry.date}</div>
                  <div className="text-red-600 text-sm mt-3">
                    ⚠️ 此操作将立即生效，请确认无误后再提交！
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setConfirmDialogOpen(false);
              setPendingExpiry(null);
            }}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmExpiryChange}
              className="bg-[#D5BDAF] hover:bg-[#B59D8F]"
            >
              确认修改
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除用户？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  将移除用户 <strong>{deleteTarget.name}</strong> ({deleteTarget.phone}) 
                  {deleteTarget.isRegistered ? 
                    '，该用户已注册，移除后将无法登录系统。' : 
                    '，移除后该手机号将无法注册。'
                  }
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
