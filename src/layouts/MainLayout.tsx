import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MagnifyingGlass, Plus, X, Bell, SlidersHorizontal } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, type PointerEvent } from 'react';
import { getCurrentSlogan } from '@/config/ai-text';
import { notificationService } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type FontScale = 'small' | 'regular' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
const FONT_SCALE_STORAGE_KEY = 'ui-font-scale';
const FONT_SIZE_BY_SCALE: Record<FontScale, string> = {
    // 修改原因：按最新需求将字号范围整体扩大到两倍，并从 5 档扩展为 6 档。
    // ⚠️ 不确定因素：“两倍”按当前档位像素值直接翻倍处理；若视觉仍偏小可继续微调。
    small: '15px',
    regular: '17px',
    medium: '18px',
    large: '20px',
    xlarge: '23px',
    xxlarge: '25px'
};

export function MainLayout() {
    const { user, logout, isActiveMember } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [slogan, setSlogan] = useState(getCurrentSlogan());
    const [unreadCount, setUnreadCount] = useState(0);
    const [refreshTick, setRefreshTick] = useState(0);
    const [showFontPanel, setShowFontPanel] = useState(false);
    const [fontScale, setFontScale] = useState<FontScale>('medium');
    const fontPanelRef = useRef<HTMLDivElement | null>(null);
    const fontToggleButtonRef = useRef<HTMLButtonElement | null>(null);
    const [swipeStart, setSwipeStart] = useState<{
        x: number;
        y: number;
        pointerId: number;
    } | null>(null);

    useEffect(() => {
        // Update slogan every minute to check if 5-minute block changed
        const interval = setInterval(() => {
            setSlogan(getCurrentSlogan());
        }, 60000); 

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem(FONT_SCALE_STORAGE_KEY);
            if (
                saved === 'small' ||
                saved === 'regular' ||
                saved === 'medium' ||
                saved === 'large' ||
                saved === 'xlarge' ||
                saved === 'xxlarge'
            ) {
                // 修改原因：页面初始化时恢复用户字号偏好，保证刷新和重登后保持一致。
                setFontScale(saved);
            }
        } catch {
            // ⚠️ 不确定因素：极少数浏览器可能禁用 localStorage；此时回退为中号字体。
            setFontScale('medium');
        }
    }, []);

    useEffect(() => {
        if (!showFontPanel) return;

        // 修改原因：用户点击字号滑栏外部区域时，自动收起面板。
        const handleOutsidePointerDown = (event: globalThis.PointerEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (fontPanelRef.current?.contains(target)) return;
            if (fontToggleButtonRef.current?.contains(target)) return;
            setShowFontPanel(false);
        };

        document.addEventListener('pointerdown', handleOutsidePointerDown);
        return () => {
            document.removeEventListener('pointerdown', handleOutsidePointerDown);
        };
    }, [showFontPanel]);

    useEffect(() => {
        // 修改原因：使用根变量统一控制字号，确保“全页面”即时生效且改动最小。
        document.documentElement.style.setProperty('--font-size', FONT_SIZE_BY_SCALE[fontScale]);
        try {
            window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, fontScale);
        } catch {
            // ignore
        }
    }, [fontScale]);

    useEffect(() => {
        let cancelled = false;
        if (!user) {
            setUnreadCount(0);
            return;
        }

        notificationService
            .getUnreadCount()
            .then(({ unreadCount }) => {
                if (!cancelled) {
                    setUnreadCount(unreadCount);
                }
            })
            .catch(() => {
                // 失败由全局拦截器提示，这里忽略
            });

        return () => {
            cancelled = true;
        };
    }, [user]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            // For now, just show a toast or navigate with query
            navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
            setShowSearch(false);
            setSearchQuery('');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getPageScrollTop = () =>
        window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

    const isRefreshBlockedTarget = (target: EventTarget | null) => {
        if (!(target instanceof HTMLElement)) return false;
        return !!target.closest('input,textarea,button,a,select,label,[data-no-refresh="true"]');
    };

    const triggerPageDataRefresh = async () => {
        // 修改原因：按需求“刷新数据而非整页 reload”，统一走 React Query 失效 + 当前页重挂载。
        await queryClient.invalidateQueries();
        setRefreshTick((prev) => prev + 1);
        toast.success('已刷新数据');
    };

    const handleMainPointerDown = (event: PointerEvent<HTMLElement>) => {
        if (isRefreshBlockedTarget(event.target)) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        setSwipeStart({
            x: event.clientX,
            y: event.clientY,
            pointerId: event.pointerId
        });
    };

    const handleMainPointerUp = async (event: PointerEvent<HTMLElement>) => {
        if (!swipeStart) return;
        if (swipeStart.pointerId !== event.pointerId) return;

        const deltaX = event.clientX - swipeStart.x;
        const deltaY = event.clientY - swipeStart.y;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        const top = getPageScrollTop();
        setSwipeStart(null);

        // 修改原因：只在“页面到顶 + 上滑手势”触发刷新，避免普通滚动误触。
        // ⚠️ 不确定因素：阈值基于通用手感（90px、纵向优势1.2）；若真机误触需再调参。
        if (top > 2) return;
        if (deltaY > -90) return;
        if (absY <= absX * 1.2) return;

        await triggerPageDataRefresh();
    };

    const handleMainPointerCancel = (event: PointerEvent<HTMLElement>) => {
        if (!swipeStart) return;
        if (swipeStart.pointerId !== event.pointerId) return;
        setSwipeStart(null);
    };

    const isActive = (path: string) => location.pathname === path;
    const fontScaleToSliderValue: Record<FontScale, number> = {
        small: 0,
        regular: 1,
        medium: 2,
        large: 3,
        xlarge: 4,
        xxlarge: 5
    };

    const sliderValueToFontScale = (value: number): FontScale => {
        if (value <= 0) return 'small';
        if (value >= 5) return 'xxlarge';
        if (value <= 1) return 'regular';
        if (value <= 2) return 'medium';
        if (value <= 3) return 'large';
        return 'xlarge';
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Glassmorphism Header */}
            <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/70 backdrop-blur-md shadow-sm transition-all duration-300">
                <div className="max-w-5xl mx-auto px-4 relative">
                    {/* 修改原因：方案A改为同层内展开，避免绝对定位弹层被头部容器裁剪。 */}
                    <div className="h-14 flex items-center">
                        <AnimatePresence mode="wait" initial={false}>
                            {!showSearch ? (
                                <motion.div
                                    key="default"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center justify-between w-full"
                                >
                                <div className="flex flex-col cursor-pointer" onClick={() => navigate('/')}>
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                                        题题高
                                    </h1>
                                    <p className="text-[10px] text-gray-500 font-medium leading-none mt-0.5">
                                        {slogan}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Button
                                            ref={fontToggleButtonRef}
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-full hover:bg-white/50 active:scale-95 transition-transform"
                                            onClick={() => setShowFontPanel((prev) => !prev)}
                                            aria-label="font-size"
                                            data-no-refresh="true"
                                        >
                                            <SlidersHorizontal className="w-5 h-5 text-gray-600" />
                                        </Button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-full hover:bg-white/50 active:scale-95 transition-transform"
                                        onClick={() => setShowSearch(true)}
                                    >
                                        <MagnifyingGlass className="w-5 h-5 text-gray-600" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-full hover:bg-white/50 active:scale-95 transition-transform relative"
                                        onClick={() => navigate('/notifications')}
                                        aria-label="notifications"
                                        data-testid="nav-notifications"
                                    >
                                        <Bell className="w-5 h-5 text-gray-600" />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </Button>

                                    <button
                                        type="button"
                                        className="relative cursor-pointer active:scale-95 transition-transform focus:outline-none"
                                        onClick={() => navigate('/profile')}
                                        data-testid="nav-profile"
                                        aria-label="profile"
                                    >
                                        <Avatar className="w-8 h-8 border-2 border-white shadow-sm">
                                            <AvatarImage src={user?.avatar} />
                                            <AvatarFallback>{user?.nickname?.[0] || '我'}</AvatarFallback>
                                        </Avatar>
                                    </button>
                                </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="search"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center w-full gap-2"
                                >
                                    <div className="relative flex-1">
                                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            autoFocus
                                            placeholder="搜索问题..."
                                            value={searchQuery}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
                                            className="w-full pl-9 h-9 bg-gray-100/50 border-transparent focus:bg-white focus:border-blue-300 focus:ring-blue-100 transition-all rounded-full"
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setShowSearch(false); setSearchQuery(''); setShowFontPanel(false); }}
                                        className="text-gray-500 hover:text-gray-900 shrink-0"
                                    >
                                        取消
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {!showSearch && showFontPanel && (
                        <div className="pb-3" data-no-refresh="true">
                            {/* 修改原因：字号控制改为头部同层内展开条，点击后可见性更稳定。 */}
                            <div
                                ref={fontPanelRef}
                                className="rounded-2xl border border-gray-100 bg-white/95 p-3 shadow-sm backdrop-blur-md"
                            >
                                <p className="text-xs text-gray-500 mb-2">字体大小</p>
                                <input
                                    type="range"
                                    min={0}
                                    // 修改原因：滑块从 5 档继续扩展为 6 档。
                                    max={5}
                                    step={1}
                                    value={fontScaleToSliderValue[fontScale]}
                                    onChange={(e) =>
                                        setFontScale(
                                            sliderValueToFontScale(Number(e.target.value))
                                        )
                                    }
                                    className="w-full accent-blue-500"
                                />
                                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                    <button
                                        type="button"
                                        className={cn(
                                            'px-2 py-0.5 rounded-full transition',
                                            fontScale === 'small' ? 'bg-blue-50 text-blue-600' : ''
                                        )}
                                        onClick={() => setFontScale('small')}
                                    >
                                        最小
                                    </button>
                                    <button
                                        type="button"
                                        className={cn(
                                            'px-2 py-0.5 rounded-full transition',
                                            fontScale === 'regular' ? 'bg-blue-50 text-blue-600' : ''
                                        )}
                                        onClick={() => setFontScale('regular')}
                                    >
                                        偏小
                                    </button>
                                    <button
                                        type="button"
                                        className={cn(
                                            'px-2 py-0.5 rounded-full transition',
                                            fontScale === 'medium' ? 'bg-blue-50 text-blue-600' : ''
                                        )}
                                        onClick={() => setFontScale('medium')}
                                    >
                                        中
                                    </button>
                                    <button
                                        type="button"
                                        className={cn(
                                            'px-2 py-0.5 rounded-full transition',
                                            fontScale === 'large' ? 'bg-blue-50 text-blue-600' : ''
                                        )}
                                        onClick={() => setFontScale('large')}
                                    >
                                        偏大
                                    </button>
                                    <button
                                        type="button"
                                        className={cn(
                                            'px-2 py-0.5 rounded-full transition',
                                            fontScale === 'xlarge' ? 'bg-blue-50 text-blue-600' : ''
                                        )}
                                        onClick={() => setFontScale('xlarge')}
                                    >
                                        很大
                                    </button>
                                    <button
                                        type="button"
                                        className={cn(
                                            'px-2 py-0.5 rounded-full transition',
                                            fontScale === 'xxlarge' ? 'bg-blue-50 text-blue-600' : ''
                                        )}
                                        onClick={() => setFontScale('xxlarge')}
                                    >
                                        最大
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>


            {/* Main Content Area */}
            <main
                className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 pb-24 animate-in fade-in duration-500"
                onPointerDown={handleMainPointerDown}
                onPointerUp={handleMainPointerUp}
                onPointerCancel={handleMainPointerCancel}
            >
                <Outlet key={`${location.pathname}${location.search}:${refreshTick}`} />
            </main>

            {/* 提问入口按钮：仅对非家长且在有效期内的用户显示 */}
            {user && user.role !== 'parent' && (isActiveMember ?? true) && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <button
                        onClick={() => navigate('/create')}
                        className={cn(
                            "w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-600 shadow-2xl flex items-center justify-center p-0",
                            "transition-all duration-300 backdrop-blur-md active:scale-95 border-none outline-none",
                            "opacity-30 hover:opacity-100 hover:scale-110 hover:shadow-cyan-500/20",
                            isActive('/create') && "opacity-100 scale-105 shadow-cyan-500/30"
                        )}
                        data-testid="nav-create"
                    >
                        <Plus className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </button>
                </div>
            )}
        </div>
    );
}

function NavItem({ icon: Icon, label, active, onClick, ...props }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 transition-colors duration-200",
                active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
            )}
            {...props}
        >
            <Icon className={cn("w-6 h-6", active && "fill-current")} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{label}</span>
            {active && (
                <span className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
            )}
        </button>
    );
}
