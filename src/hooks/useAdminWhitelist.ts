/**
 * useAdminWhitelist.ts — 管理员白名单状态 & API 逻辑
 *
 * 从 AdminManagementPage 抽取，包含：
 *   - 白名单列表 state（含过滤器）
 *   - loadWhitelistFromApi
 *   - handleAddUser / handleDeleteUser / confirmDelete
 *   - handleManageExpiry / handleExpirySubmit / confirmExpiryChange
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminService } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';
import type { UserRole } from '@/types';
import type {
    WhitelistUser as WhitelistUserApi,
    AddWhitelistPayload,
} from '@/types/api';

export interface WhitelistUserItem {
    id: string;
    userId?: string;
    phone: string;
    name: string;
    role: UserRole;
    isRegistered: boolean;
    createdAt: string;
    registeredAt?: string;
    expiresAt?: string;
}

// ─── 纯工具函数（无副作用）────────────────────────────────────────────────────
const EXPIRING_SOON_DAYS = 30;

export const needsExpiryForRole = (role: UserRole) =>
    role === 'student' || role === 'parent';

export const isExpiredDate = (expiresAt?: string): boolean => {
    if (!expiresAt) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(expiresAt) < today;
};

export const isExpiringSoonDate = (expiresAt?: string): boolean => {
    if (!expiresAt) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = new Date(expiresAt).getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= EXPIRING_SOON_DAYS;
};

const calculateNewExpiry = (months: number): string => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
};

const buildInitialWhitelist = (): WhitelistUserItem[] => {
    if (
        typeof import.meta !== 'undefined' &&
        import.meta.env?.MODE === 'test'
    ) {
        return [
            { id: '1', phone: '13800138000', name: '张三', role: 'student', isRegistered: true, createdAt: '2024-01-15 10:00:00', registeredAt: '2024-01-15 10:30:00', expiresAt: '2026-06-30' },
            { id: '2', phone: '13900139000', name: '李四', role: 'teacher', isRegistered: true, createdAt: '2024-01-16 09:00:00', registeredAt: '2024-01-16 09:15:00' },
            { id: '3', phone: '13700137000', name: '王五', role: 'student', isRegistered: false, createdAt: '2024-01-20 14:00:00', expiresAt: '2026-03-31' },
            { id: '4', phone: '13600136000', name: '赵六', role: 'parent', isRegistered: false, createdAt: '2024-01-21 11:00:00', expiresAt: '2026-03-31' },
        ];
    }
    return [];
};

/** WhitelistUserApi → WhitelistUserItem 映射（统一消除两处重复）*/
function mapApiToItem(u: WhitelistUserApi): WhitelistUserItem {
    return {
        id: u.id,
        userId: (u as any).userId,
        phone: u.phone,
        name: u.name,
        role: u.role as UserRole,
        isRegistered: u.isRegistered,
        createdAt: u.createdAt,
        registeredAt: u.registeredAt,
        expiresAt: u.validUntil ? u.validUntil.slice(0, 10) : undefined,
    };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAdminWhitelist() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // 白名单 state
    const [whitelist, setWhitelist] = useState<WhitelistUserItem[]>(buildInitialWhitelist);
    const [loadingWhitelist, setLoadingWhitelist] = useState(false);

    // 过滤器 state
    const [searchTerm, setSearchTerm]     = useState('');
    const [filterRole, setFilterRole]     = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterExpiry, setFilterExpiry] = useState<'all' | 'expiring' | 'expired'>('all');

    // 添加用户 dialog state
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newPhone, setNewPhone]           = useState('');
    const [newName, setNewName]             = useState('');
    const [newRole, setNewRole]             = useState<UserRole>('student');

    // 删除 dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget]         = useState<WhitelistUserItem | null>(null);

    // 课时管理 dialog state
    const [expiryDialogOpen, setExpiryDialogOpen]   = useState(false);
    const [expiryTarget, setExpiryTarget]           = useState<WhitelistUserItem | null>(null);
    const [expiryMonths, setExpiryMonths]           = useState(1);
    const [customExpiryDate, setCustomExpiryDate]   = useState('');
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [pendingExpiry, setPendingExpiry]         = useState<{ user: WhitelistUserItem; date: string } | null>(null);

    // ── 权限守卫
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

    // ── 从 API 加载白名单
    useEffect(() => {
        let cancelled = false;
        if (!user || user.role !== 'teacher') return;

        const load = async () => {
            try {
                setLoadingWhitelist(true);
                const res = await adminService.getWhitelist({ page: 1, limit: 50 });
                if (cancelled || !res || !Array.isArray(res.items)) return;
                setWhitelist((res.items as WhitelistUserApi[]).map(mapApiToItem));
            } catch {
                if (!cancelled) toast.error('加载白名单失败，请稍后重试');
            } finally {
                if (!cancelled) setLoadingWhitelist(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [user]);

    // ── 过滤列表（派生计算）
    const filteredList = whitelist.filter(u => {
        const matchSearch  = u.phone.includes(searchTerm) || u.name.includes(searchTerm);
        const matchRole    = filterRole === 'all' || u.role === filterRole;
        const matchStatus  = filterStatus === 'all' ||
            (filterStatus === 'registered' && u.isRegistered) ||
            (filterStatus === 'pending' && !u.isRegistered);
        const needsExpiry  = needsExpiryForRole(u.role);
        const expired      = needsExpiry && isExpiredDate(u.expiresAt);
        const expiringSoon = needsExpiry && isExpiringSoonDate(u.expiresAt) && !expired;
        const matchExpiry  = filterExpiry === 'all' ? true
            : filterExpiry === 'expiring' ? expiringSoon : expired;
        const includeByExpiry = needsExpiry ? matchExpiry : filterExpiry === 'all';
        return matchSearch && matchRole && matchStatus && includeByExpiry;
    });

    // ── 统计数据
    const stats = {
        total:     whitelist.length,
        registered: whitelist.filter(u => u.isRegistered).length,
        pending:   whitelist.filter(u => !u.isRegistered).length,
        students:  whitelist.filter(u => u.role === 'student').length,
        teachers:  whitelist.filter(u => u.role === 'teacher').length,
        parents:   whitelist.filter(u => u.role === 'parent').length,
    };
    const expiryStats = {
        expiringSoon: whitelist.filter(u => needsExpiryForRole(u.role) && isExpiringSoonDate(u.expiresAt) && !isExpiredDate(u.expiresAt)).length,
        expired:      whitelist.filter(u => needsExpiryForRole(u.role) && isExpiredDate(u.expiresAt)).length,
    };

    // ── Actions
    const handleAddUser = async () => {
        if (!newPhone || newPhone.length !== 11) {
            toast.error('请输入正确的11位手机号');
            return;
        }
        if (!newName.trim()) {
            toast.error('请输入用户姓名');
            return;
        }
        if (whitelist.some(u => u.phone === newPhone)) {
            toast.error('该手机号已在白名单中');
            return;
        }
        try {
            const payload: AddWhitelistPayload = {
                phone: newPhone,
                name: newName,
                role: newRole as 'student' | 'teacher' | 'parent',
            };
            if (newRole === 'student' || newRole === 'parent') {
                payload.validUntil = new Date(calculateNewExpiry(3)).toISOString();
            }
            const created = await adminService.addToWhitelist(payload);
            const mapped = mapApiToItem(created as unknown as WhitelistUserApi);
            setWhitelist([mapped, ...whitelist]);
            toast.success('添加成功！用户可以使用该手机号注册');
            setNewPhone(''); setNewName(''); setNewRole('student'); setAddDialogOpen(false);
        } catch {
            // 错误由 axios 拦截器处理
        }
    };

    const handleDeleteUser = (target: WhitelistUserItem) => {
        setDeleteTarget(target);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await adminService.removeFromWhitelist(deleteTarget.id);
            setWhitelist(whitelist.filter(u => u.id !== deleteTarget.id));
            toast.success('已从白名单移除');
        } catch {
            // 错误由拦截器处理
        } finally {
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
        }
    };

    const handleManageExpiry = (target: WhitelistUserItem) => {
        setExpiryTarget(target);
        setExpiryMonths(1);
        setCustomExpiryDate(target.expiresAt || calculateNewExpiry(1));
        setExpiryDialogOpen(true);
    };

    const handleExpirySubmit = () => {
        if (!expiryTarget) return;
        const newExpiry = customExpiryDate || calculateNewExpiry(expiryMonths);
        setPendingExpiry({ user: expiryTarget, date: newExpiry });
        setExpiryDialogOpen(false);
        setConfirmDialogOpen(true);
    };

    const confirmExpiryChange = async () => {
        if (!pendingExpiry) return;
        try {
            const updated = await adminService.updateValidity(
                pendingExpiry.user.id,
                new Date(pendingExpiry.date).toISOString()
            );
            setWhitelist(whitelist.map(u =>
                u.id === updated.id
                    ? { ...u, expiresAt: updated.validUntil ? updated.validUntil.slice(0, 10) : pendingExpiry.date }
                    : u
            ));
            toast.success('课时有效期已更新');
        } catch {
            // 错误由拦截器处理
        } finally {
            setConfirmDialogOpen(false);
            setPendingExpiry(null);
            setExpiryTarget(null);
        }
    };

    return {
        // state
        whitelist, filteredList, loadingWhitelist, stats, expiryStats,
        // 过滤器
        searchTerm, setSearchTerm,
        filterRole, setFilterRole,
        filterStatus, setFilterStatus,
        filterExpiry, setFilterExpiry,
        // 添加 dialog
        addDialogOpen, setAddDialogOpen,
        newPhone, setNewPhone,
        newName, setNewName,
        newRole, setNewRole,
        // 删除 dialog
        deleteDialogOpen, setDeleteDialogOpen,
        deleteTarget,
        // 课时 dialog
        expiryDialogOpen, setExpiryDialogOpen,
        expiryTarget,
        expiryMonths, setExpiryMonths,
        customExpiryDate, setCustomExpiryDate,
        confirmDialogOpen, setConfirmDialogOpen,
        pendingExpiry,
        // actions
        handleAddUser, handleDeleteUser, confirmDelete,
        handleManageExpiry, handleExpirySubmit, confirmExpiryChange,
    };
}
