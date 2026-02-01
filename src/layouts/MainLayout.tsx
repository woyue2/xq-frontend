import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Input } from '@/app/components/ui/input';
import { Search, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { getCurrentSlogan } from '@/config/ai-text';

export function MainLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [slogan, setSlogan] = useState(getCurrentSlogan());

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
            navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
            setShowSearch(false);
            setSearchQuery('');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
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
                                <div className="flex flex-col cursor-pointer" onClick={() => navigate('/')}>
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

                                    <div
                                        className="relative cursor-pointer active:scale-95 transition-transform"
                                        onClick={() => navigate('/profile')}
                                    >
                                        <Avatar className="w-8 h-8 border-2 border-white shadow-sm">
                                            <AvatarImage src={user?.avatar} />
                                            <AvatarFallback>{user?.nickname?.[0] || '我'}</AvatarFallback>
                                        </Avatar>
                                    </div>
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
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
                                        className="w-full pl-9 h-9 bg-gray-100/50 border-transparent focus:bg-white focus:border-blue-300 focus:ring-blue-100 transition-all rounded-full"
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setShowSearch(false); setSearchQuery(''); }}
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

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <button
                    onClick={() => navigate('/create')}
                    className={cn(
                        // Premium design from user
                        "w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-600 shadow-2xl flex items-center justify-center p-0",
                        "transition-all duration-300 backdrop-blur-md active:scale-95 border-none outline-none",
                        "opacity-30 hover:opacity-100 hover:scale-110 hover:shadow-cyan-500/20",
                        // Active page state
                        isActive('/create') && "opacity-100 scale-105 shadow-cyan-500/30"
                    )}
                    data-testid="nav-create"
                >
                    <Plus className="w-8 h-8 text-white" strokeWidth={2.5} />
                </button>
            </div>
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
