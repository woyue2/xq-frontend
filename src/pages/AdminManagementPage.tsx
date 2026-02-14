import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaretLeft, Plus, Trash, MagnifyingGlass, UserPlus, Shield, Phone, CheckCircle, XCircle, Clock, Calendar, Minus, Pencil } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { UserRole } from '@/types';
import { adminService } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  QuestionDimensionDto,
  QuestionDimensionOptionDto,
  WhitelistUser as WhitelistUserApi,
  AddWhitelistPayload
} from '@/types/api';

interface WhitelistUserItem {
    id: string;
    // 已注册用户在 user 表中的 ID（如有）
    userId?: string;
    phone: string;
    name: string;
    role: UserRole;
    isRegistered: boolean;
    createdAt: string;
    registeredAt?: string;
    validUntil?: string; // 有效期
    createdBy?: string;
    deletedAt?: string | null;
    deletedBy?: string | null;
}

const EXPIRING_SOON_DAYS = 30;

const needsExpiryForRole = (role: UserRole) =>
  role === 'student' || role === 'parent';

const isExpiredDate = (validUntil?: string) => {
  if (!validUntil) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(validUntil);
  return date < today;
};

const isExpiringSoonDate = (validUntil?: string) => {
  if (!validUntil) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(validUntil);
  const diffMs = date.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= EXPIRING_SOON_DAYS;
};

export function AdminManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // 测试环境下提供一组默认白名单数据，便于前端单测等场景；
  // 实际运行时将在挂载后通过 adminService.getWhitelist 覆盖为后端数据。
  const initialWhitelist: WhitelistUserItem[] =
    typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test'
      ? [
          {
            id: '1',
            phone: '13800138000',
            name: '张三',
            role: 'student',
            isRegistered: true,
            createdAt: '2024-01-15 10:00:00',
            registeredAt: '2024-01-15 10:30:00',
            validUntil: '2026-06-30'
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
            validUntil: '2026-03-31'
          },
          {
            id: '4',
            phone: '13600136000',
            name: '赵六',
            role: 'parent',
            isRegistered: false,
            createdAt: '2024-01-21 11:00:00',
            validUntil: '2026-03-31'
          }
        ]
      : [];

  const [whitelist, setWhitelist] = useState<WhitelistUserItem[]>(initialWhitelist);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterExpiry, setFilterExpiry] = useState<'all' | 'expiring' | 'expired'>('all');
  
  // 添加用户对话框
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');
  
  // 删除确认对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WhitelistUserItem | null>(null);

  // 课时管理对话框
  const [expiryDialogOpen, setExpiryDialogOpen] = useState(false);
  const [expiryTarget, setExpiryTarget] = useState<WhitelistUserItem | null>(null);
  const [expiryMonths, setExpiryMonths] = useState(1);
  const [customExpiryDate, setCustomExpiryDate] = useState('');

  // 二次确认对话框
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingExpiry, setPendingExpiry] = useState<{ user: WhitelistUserItem; date: string } | null>(null);

  // 解题方法/办法维度配置
  const [methodDimension, setMethodDimension] = useState<QuestionDimensionDto | null>(null);
  const [methodOptions, setMethodOptions] = useState<QuestionDimensionOptionDto[]>([]);
  const [loadingMethodDim, setLoadingMethodDim] = useState(false);
  const [savingMethodMeta, setSavingMethodMeta] = useState(false);

  const [loadingWhitelist, setLoadingWhitelist] = useState(false);

  // 基础权限校验：仅允许老师访问后台管理页面
  useEffect(() => {
    if (!user) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }

    if (user.role !== 'teacher') {
      toast.error('只有老师可以访问管理后台');
      navigate('/profile');
    }
  }, [user, navigate]);

  // 从后端加载白名单列表
  useEffect(() => {
    let cancelled = false;

    const loadWhitelistFromApi = async () => {
      // 仅在已登录且为老师/管理员时才调用后台白名单接口
      if (!user || user.role !== 'teacher') {
        return;
      }

      try {
        setLoadingWhitelist(true);
        const res = await adminService.getWhitelist({
          page: 1,
          pageSize: 50
        });

        if (cancelled || !res || !Array.isArray(res.items)) return;

        const items = (res.items as WhitelistUserApi[]).map(
          (u): WhitelistUserItem => ({
            id: u.id,
            // 后端若已将白名单绑定到真实用户，则返回 userId，可用于跳转到学生历史提问页
            userId: (u as any).userId,
            phone: u.phone,
            name: u.name,
            role: u.role as UserRole,
            isRegistered: u.isRegistered,
            createdAt: u.createdAt,
            registeredAt: u.registeredAt,
            validUntil: u.validUntil ? u.validUntil.slice(0, 10) : undefined
          })
        );

        setWhitelist(items);
      } catch {
        if (!cancelled) {
          toast.error('加载白名单失败，请稍后重试');
        }
      } finally {
        if (!cancelled) {
          setLoadingWhitelist(false);
        }
      }
    };

    loadWhitelistFromApi();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // 过滤逻辑
  const filteredList = whitelist.filter(user => {
    const matchSearch = user.phone.includes(searchTerm) || user.name.includes(searchTerm);
    const matchRole = filterRole === 'all' || user.role === filterRole;
    const matchStatus = filterStatus === 'all' || 
      (filterStatus === 'registered' && user.isRegistered) ||
      (filterStatus === 'pending' && !user.isRegistered);

    const needsExpiry = needsExpiryForRole(user.role);
    const expired = needsExpiry && isExpiredDate(user.validUntil);
    const expiringSoon = needsExpiry && isExpiringSoonDate(user.validUntil) && !expired;

    const matchExpiry =
      filterExpiry === 'all'
        ? true
        : filterExpiry === 'expiring'
        ? expiringSoon
        : expired;

    const includeByExpiry = needsExpiry ? matchExpiry : filterExpiry === 'all';

    return matchSearch && matchRole && matchStatus && includeByExpiry;
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
  const isExpired = (validUntil?: string) => {
    return isExpiredDate(validUntil);
  };

  // 计算新的过期时间
  const calculateNewExpiry = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  const handleAddUser = async () => {
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

    // 检查是否已存在（前端快速拦截，后端仍会做最终校验）
    if (whitelist.some(u => u.phone === newPhone)) {
      toast.error('该手机号已在白名单中');
      return;
    }

    try {
      const payload: AddWhitelistPayload = {
        phone: newPhone,
        name: newName,
        role: newRole as 'student' | 'teacher' | 'parent'
      };

      // 学生和家长默认设置 3 个月有效期
      if (newRole === 'student' || newRole === 'parent') {
        const expiry = calculateNewExpiry(3);
        payload.validUntil = new Date(expiry).toISOString();
      }

      const created = await adminService.addToWhitelist(payload);

      const mapped: WhitelistUserItem = {
        id: created.id,
        userId: (created as any).userId,
        phone: created.phone,
        name: created.name,
        role: created.role as UserRole,
        isRegistered: created.isRegistered,
        createdAt: created.createdAt,
        registeredAt: created.registeredAt,
        validUntil: created.validUntil
          ? created.validUntil.slice(0, 10)
          : undefined
      };

      setWhitelist([mapped, ...whitelist]);
      toast.success('添加成功！用户可以使用该手机号注册');

      // 重置表单
      setNewPhone('');
      setNewName('');
      setNewRole('student');
      setAddDialogOpen(false);
    } catch {
      // 具体错误提示由 axios 拦截器统一处理（如 PHONE_EXISTS 等）
    }
  };

  const handleDeleteUser = (user: WhitelistUserItem) => {
    setDeleteTarget(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      try {
        await adminService.removeFromWhitelist(deleteTarget.id);
        setWhitelist(whitelist.filter(u => u.id !== deleteTarget.id));
        toast.success('已从白名单移除');
      } catch {
        // 错误提示由拦截器处理
      } finally {
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
      }
    }
  };

  // 打开课时管理对话框
  const handleManageExpiry = (user: WhitelistUserItem) => {
    setExpiryTarget(user);
    setExpiryMonths(1);
    // 默认显示当前有效期，如果没有则显示当前计算的有效期
    setCustomExpiryDate(user.validUntil || calculateNewExpiry(1));
    setExpiryDialogOpen(true);
  };

  // 第一步：预览新的过期时间
  const handleExpirySubmit = () => {
    if (expiryTarget) {
      // 优先使用自定义日期
      const newExpiry = customExpiryDate || calculateNewExpiry(expiryMonths);
      setPendingExpiry({ user: expiryTarget, date: newExpiry });
      setExpiryDialogOpen(false);
      setConfirmDialogOpen(true);
    }
  };

  // 第二步：确认修改
  const confirmExpiryChange = async () => {
    if (pendingExpiry) {
      try {
        const updated = await adminService.updateValidity(
          pendingExpiry.user.id,
          new Date(pendingExpiry.date).toISOString()
        );

        setWhitelist(
          whitelist.map((u) =>
            u.id === updated.id
              ? {
                  ...u,
                  validUntil: updated.validUntil
                    ? updated.validUntil.slice(0, 10)
                    : pendingExpiry.date
                }
              : u
          )
        );
        toast.success('课时有效期已更新');
      } catch {
        // 错误提示交由拦截器
      } finally {
        setConfirmDialogOpen(false);
        setPendingExpiry(null);
        setExpiryTarget(null);
      }
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

  const expiryStats = {
    expiringSoon: whitelist.filter(
      (u) =>
        needsExpiryForRole(u.role) &&
        isExpiringSoonDate(u.validUntil) &&
        !isExpiredDate(u.validUntil)
    ).length,
    expired: whitelist.filter(
      (u) => needsExpiryForRole(u.role) && isExpiredDate(u.validUntil)
    ).length,
  };

  const loadMethodDimension = async () => {
    try {
      setLoadingMethodDim(true);
      const dims = await adminService.getQuestionDimensions();
      const methodDim = dims.find((d) => d.key === 'method') ?? null;
      setMethodDimension(methodDim);
      setMethodOptions(
        (methodDim?.options ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      );
    } catch {
      toast.error('加载题目维度配置失败，请稍后重试');
      setMethodDimension(null);
      setMethodOptions([]);
    } finally {
      setLoadingMethodDim(false);
    }
  };

  const handleSaveMethodMeta = async () => {
    if (!methodDimension) return;
    try {
      // 修改原因：维度元数据（name/enabled）直接写入数据库配置，属于运行数据的一部分。
      setSavingMethodMeta(true);
      const updated = await adminService.updateQuestionDimension(methodDimension.key, {
        name: methodDimension.name,
        enabled: methodDimension.enabled
      });
      setMethodDimension(updated);
      toast.success('解题方法维度配置已保存');
    } catch {
      toast.error('保存解题方法维度配置失败');
    } finally {
      setSavingMethodMeta(false);
    }
  };

  const handleUpdateMethodOption = async (option: QuestionDimensionOptionDto) => {
    if (!methodDimension) return;
    try {
      // 修改原因：选项的 label/order/enabled 会影响后台维度配置数据，应保留该保存链路。
      await adminService.updateQuestionDimensionOption(methodDimension.key, option.id, {
        label: option.label,
        order: option.order,
        enabled: option.enabled
      });
      toast.success('选项已更新');
    } catch {
      toast.error('更新选项失败');
    }
  };

  const handleAddMethodOption = async () => {
    if (!methodDimension) return;
    const value = window.prompt('请输入新选项的内部值（例如：代入法）');
    if (!value) return;
    const label = window.prompt('请输入显示文案', value);
    if (!label) return;
    try {
      const maxOrder =
        methodOptions.length > 0
          ? Math.max(...methodOptions.map((o) => o.order ?? 0))
          : 0;
      const created = await adminService.createQuestionDimensionOption(methodDimension.key, {
        value,
        label,
        order: maxOrder + 10,
        enabled: true
      });
      setMethodOptions(
        [...methodOptions, created].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        )
      );
      toast.success('已新增选项');
    } catch {
      toast.error('新增选项失败');
    }
  };

  return (
    <div className="min-h-screen bg-[#EDEDE9] flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-gray-100 rounded-full transition active:scale-90"
          >
            <CaretLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex flex-col items-center flex-1">
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#D5BDAF]" />
              用户白名单管理
            </h1>
            <p className="text-[9px] text-[#D5BDAF] font-bold leading-none">好好学习，天天向上</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/diagnostic')}
            >
              系统诊断
            </Button>
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

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white rounded-2xl p-3 shadow-sm">
            <div className="text-xs text-orange-600 mb-0.5">即将过期（学生/家长）</div>
            <div className="text-xl font-bold text-orange-700">{expiryStats.expiringSoon}</div>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm">
            <div className="text-xs text-red-600 mb-0.5">已过期（学生/家长）</div>
            <div className="text-xl font-bold text-red-700">{expiryStats.expired}</div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="max-w-7xl mx-auto w-full px-4 py-3 space-y-3">
        {/* 搜索框 */}
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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

          <Select value={filterExpiry} onValueChange={(v) => setFilterExpiry(v as any)}>
            <SelectTrigger className="flex-1 bg-white rounded-2xl">
              <SelectValue placeholder="课时状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">课时状态：全部</SelectItem>
              <SelectItem value="expiring">仅看即将过期（学生/家长）</SelectItem>
              <SelectItem value="expired">仅看已过期（学生/家长）</SelectItem>
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
              const expired = isExpired(user.validUntil);
              const needsExpiry = user.role === 'student' || user.role === 'parent';
              
              const canViewHistory =
                user.role === 'student' && user.isRegistered && user.userId;

              return (
                <div
                  key={user.id}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {canViewHistory ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/student/${user.userId}/questions`)
                            }
                            className="flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-900 transition-colors"
                            data-testid="whitelist-student-history"
                          >
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-xs text-blue-600">
                              {user.name?.[0] ?? '学'}
                            </span>
                            <span className="truncate max-w-[120px]">
                              {user.name}
                            </span>
                          </button>
                        ) : (
                          <span className="font-bold text-gray-800">
                            {user.name}
                          </span>
                        )}
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

                       {needsExpiry && user.validUntil && (
                         <div className={`text-xs mt-1 flex items-center gap-1 ${expired ? 'text-red-600' : 'text-blue-600'}`}>
                           <Calendar className="w-3 h-3" />
                           课时有效期至：{user.validUntil} {expired && '(已过期，权限降级为只读)'}
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
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition active:scale-90"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 题目维度配置（解题方法/办法） */}
      {/* 修改原因：该区块对应后端 question-dimensions 数据管理能力，影响配置数据本身；当前不应删除。 */}
      <div className="max-w-7xl mx-auto w-full px-4 pb-6">
        <div className="bg-white rounded-2xl shadow-sm p-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-gray-800">
                题目维度配置（解题方法/办法）
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                控制“创建问题”页面中解题方法下拉的名称、启用状态和选项集合。
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMethodDimension}
                disabled={loadingMethodDim}
              >
                {loadingMethodDim ? '加载中...' : '刷新配置'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddMethodOption}
                disabled={!methodDimension}
              >
                新增选项
              </Button>
            </div>
          </div>

          {methodDimension ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">维度名称</Label>
                  <Input
                    value={methodDimension.name}
                    onChange={(e) =>
                      setMethodDimension({
                        ...methodDimension,
                        name: e.target.value
                      })
                    }
                    className="w-40 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">启用状态</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={methodDimension.enabled ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setMethodDimension({
                          ...methodDimension,
                          enabled: true
                        })
                      }
                    >
                      启用
                    </Button>
                    <Button
                      type="button"
                      variant={!methodDimension.enabled ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setMethodDimension({
                          ...methodDimension,
                          enabled: false
                        })
                      }
                    >
                      停用
                    </Button>
                  </div>
                </div>
                <div className="mt-5">
                  <Button
                    size="sm"
                    onClick={handleSaveMethodMeta}
                    disabled={savingMethodMeta}
                    className="bg-[#D5BDAF] hover:bg-[#B59D8F]"
                  >
                    {savingMethodMeta ? '保存中...' : '保存维度配置'}
                  </Button>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">
                    选项列表（含“暂不确定”/unknown）
                  </span>
                  <span className="text-xs text-gray-400">
                    建议保留 unknown 作为兜底选项
                  </span>
                </div>
                {methodOptions.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    暂无选项，请点击“新增选项”添加。
                  </p>
                ) : (
                  <div className="space-y-2">
                    {methodOptions.map((opt) => {
                      const isUnknown = opt.value === 'unknown';
                      return (
                        <div
                          key={opt.id}
                          className="flex flex-wrap items-center gap-3 border border-gray-100 rounded-xl px-3 py-2 bg-gray-50"
                        >
                          <div className="space-y-1">
                            <Label className="text-xs">展示文案</Label>
                            <Input
                              value={opt.label}
                              onChange={(e) =>
                                setMethodOptions((prev) =>
                                  prev.map((o) =>
                                    o.id === opt.id
                                      ? { ...o, label: e.target.value }
                                      : o
                                  )
                                )
                              }
                              className="w-40 h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">内部值</Label>
                            <div className="text-xs px-2 py-1 rounded bg-white border border-gray-200">
                              {opt.value}
                              {isUnknown && (
                                <span className="ml-1 text-[10px] text-gray-400">
                                  （暂不确定）
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">排序</Label>
                            <Input
                              type="number"
                              value={opt.order ?? 0}
                              onChange={(e) => {
                                const next = Number(e.target.value) || 0;
                                setMethodOptions((prev) =>
                                  prev.map((o) =>
                                    o.id === opt.id
                                      ? { ...o, order: next }
                                      : o
                                  )
                                );
                              }}
                              className="w-20 h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">启用</Label>
                            <button
                              type="button"
                              onClick={() =>
                                setMethodOptions((prev) =>
                                  prev.map((o) =>
                                    o.id === opt.id
                                      ? { ...o, enabled: !o.enabled }
                                      : o
                                  )
                                )
                              }
                              className={`px-3 py-1 rounded-full text-xs border transition ${
                                opt.enabled
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-gray-50 text-gray-400 border-gray-200'
                              }`}
                            >
                              {opt.enabled ? '启用' : '停用'}
                            </button>
                          </div>
                          <div className="ml-auto">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateMethodOption(opt)}
                            >
                              保存
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              暂未加载到解题方法维度配置，请点击“刷新配置”获取。
            </div>
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
              <Label>有效期至</Label>
              <div className="relative">
                <Input 
                  type="date"
                  value={customExpiryDate}
                  onChange={(e) => setCustomExpiryDate(e.target.value)}
                  className="w-full h-11 px-4 text-base border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-white rounded-xl shadow-sm"
                />
                {expiryTarget?.validUntil && isExpired(expiryTarget.validUntil) && (
                  <div className="text-xs text-red-600 mt-1 ml-1">
                    原有效期: {expiryTarget.validUntil} (已过期)
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>延长课时（月）</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newMonths = Math.max(1, expiryMonths - 1);
                    setExpiryMonths(newMonths);
                    setCustomExpiryDate(calculateNewExpiry(newMonths));
                  }}
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
                  onClick={() => {
                    const newMonths = Math.min(12, expiryMonths + 1);
                    setExpiryMonths(newMonths);
                    setCustomExpiryDate(calculateNewExpiry(newMonths));
                  }}
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
                   <div>原有效期：{pendingExpiry.user.validUntil || '未设置'}</div>
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
