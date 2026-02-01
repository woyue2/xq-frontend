import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { SidebarProvider } from '@/app/components/ui/sidebar'; // Assuming Shadcn sidebar is available, or we might not need it for mobile.
// Actually, let's stick to the design: Glassmorphism Header + Bottom Nav (Mobile) or Top Nav (Desktop).
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Button } from '@/app/components/ui/button';
import { Search, Home, PlusSquare, User as UserIcon, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MainLayout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Glassmorphism Header */}
            <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/70 backdrop-blur-md shadow-sm transition-all duration-300">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex flex-col cursor-pointer" onClick={() => navigate('/')}>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            知否
                        </h1>
                        <p className="text-[10px] text-gray-500 font-medium leading-none mt-0.5">
                            初中知识问答
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-white/50"
                            onClick={() => navigate('/search')} // Future search page
                        >
                            <Search className="w-5 h-5 text-gray-600" />
                        </Button>

                        <div
                            className="relative cursor-pointer"
                            onClick={() => navigate('/profile')}
                        >
                            <Avatar className="w-8 h-8 border-2 border-white shadow-sm">
                                <AvatarImage src={user?.avatar} />
                                <AvatarFallback>{user?.nickname?.[0] || '我'}</AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 pb-24 animate-in fade-in duration-500">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation (Visible on small screens, hidden on large if we wanted, but sticking to mobile-first) */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-100 pb-safe">
                <div className="flex items-center justify-around h-16 max-w-md mx-auto">
                    <NavItem
                        icon={Home}
                        label="首页"
                        active={isActive('/')}
                        onClick={() => navigate('/')}
                    />

                    <div className="relative -top-5">
                        <Button
                            onClick={() => navigate('/create')}
                            className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 hover:shadow-lg hover:shadow-blue-500/30 transition-all border-4 border-white shadow-md flex items-center justify-center p-0"
                        >
                            <PlusSquare className="w-7 h-7 text-white" />
                        </Button>
                    </div>

                    <NavItem
                        icon={UserIcon}
                        label="我的"
                        active={isActive('/profile')}
                        onClick={() => navigate('/profile')}
                    />
                </div>
            </nav>
        </div>
    );
}

function NavItem({ icon: Icon, label, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 transition-colors duration-200",
                active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
            )}
        >
            <Icon className={cn("w-6 h-6", active && "fill-current")} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{label}</span>
            {active && (
                <span className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
            )}
        </button>
    );
}
