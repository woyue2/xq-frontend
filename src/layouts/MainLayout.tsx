/**
 * [POS] src/layouts/MainLayout.tsx
 *   所属：layouts 层 | 角色：已登录态主布局，含顶栏导航、侧边栏及页面 Outlet
 *   兄弟：AuthLayout.tsx
 *
 * [INPUT]
 *   - react-router-dom       → Outlet / useLocation / useNavigate
 *   - @/stores/useAuthStore  → useAuthStore
 *   - @/components/ui/*      → SidebarProvider / Avatar / Button / Input / AlertDialog
 *   - lucide-react           → Search / Plus / X / Bell
 *   - framer-motion          → motion / AnimatePresence
 *   - @/lib/utils            → cn
 *   - react                  → useState / useEffect
 *
 * [OUTPUT]
 *   - MainLayout（布局组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/layouts/CLAUDE.md 的文件清单
 */
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, X, LogOut, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { getCurrentSlogan } from '@/config/ai-text';
import { ROUTES } from '@/config/app-constants';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function MainLayout() {
  const { user, logout, isActiveMember } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [slogan, setSlogan] = useState(getCurrentSlogan());
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  useEffect(() => {
    // Update slogan every minute to check if 5-minute block changed
    const interval = setInterval(() => {
      setSlogan(getCurrentSlogan());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // For now, just show a toast or navigate with query
      navigate(ROUTES.homeWithSearch(searchQuery.trim()));
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.login);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Glassmorphism Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/70 backdrop-blur-md shadow-sm transition-all duration-300">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center relative overflow-hidden">
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
                <div className="flex flex-col cursor-pointer" onClick={() => navigate(ROUTES.home)}>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    知否
                  </h1>
                  <p className="text-[10px] text-gray-500 font-medium leading-none mt-0.5">
                    {slogan}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-white/50 active:scale-95 transition-transform"
                    onClick={() => setShowSearch(true)}
                  >
                    <Search className="w-5 h-5 text-gray-600" />
                  </Button>

                  {user ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="relative cursor-pointer active:scale-95 transition-transform focus:outline-none"
                          data-testid="nav-profile"
                          aria-label="profile"
                        >
                          <Avatar className="w-8 h-8 border-2 border-white shadow-sm">
                            <AvatarImage src={user?.avatar} />
                            <AvatarFallback>{user?.nickname?.[0] || '用户'}</AvatarFallback>
                          </Avatar>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium">{user.nickname}</p>
                            <p className="text-xs text-gray-500">{user.phone}</p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(user.role === 'admin' || user.role === 'teacher') && (
                          <>
                            <DropdownMenuItem onClick={() => navigate('/admin/subjects')}>
                              <Settings className="w-4 h-4 mr-2" />
                              管理后台
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                          <LogOut className="w-4 h-4 mr-2" />
                          退出登录
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <button
                      type="button"
                      className="relative cursor-pointer active:scale-95 transition-transform focus:outline-none"
                      onClick={() => setShowLoginDialog(true)}
                      data-testid="nav-profile"
                      aria-label="profile"
                    >
                      <Avatar className="w-8 h-8 border-2 border-white shadow-sm">
                        <AvatarFallback>登录</AvatarFallback>
                      </Avatar>
                    </button>
                  )}
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    autoFocus
                    placeholder="搜索问题..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearchQuery(e.target.value)
                    }
                    onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-9 h-9 bg-gray-100/50 border-transparent focus:bg-white focus:border-blue-300 focus:ring-blue-100 transition-all rounded-full"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  className="text-gray-500 hover:text-gray-900 shrink-0"
                >
                  取消
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 pb-24 animate-in fade-in duration-500">
        <Outlet />
      </main>

      {/* 提问入口按钮：仅对非家长且在有效期内的用户显示 */}
      {user && user.role !== 'parent' && (isActiveMember ?? true) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => navigate(ROUTES.create)}
            className={cn(
              'w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-600 shadow-2xl flex items-center justify-center p-0',
              'transition-all duration-300 backdrop-blur-md active:scale-95 border-none outline-none',
              'opacity-30 hover:opacity-100 hover:scale-110 hover:shadow-cyan-500/20',
              isActive('/create') && 'opacity-100 scale-105 shadow-cyan-500/30',
            )}
            data-testid="nav-create"
          >
            <Plus className="w-8 h-8 text-white" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* 游客登录引导 */}
      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>需要登录</AlertDialogTitle>
            <AlertDialogDescription>
              该功能需要登录后使用，请登录或注册账号。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate(ROUTES.login)}>
              去登录 / 注册
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface NavItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

function NavItem({ icon: Icon, label, active, onClick, ...props }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1 w-16 transition-colors duration-200',
        active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600',
      )}
      {...props}
    >
      <Icon className={cn('w-6 h-6', active && 'fill-current')} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[10px] font-medium">{label}</span>
      {active && <span className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />}
    </button>
  );
}
