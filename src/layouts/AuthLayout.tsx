import { Outlet } from 'react-router-dom';

export function AuthLayout() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-morandi-1/20 via-white to-morandi-2/20 flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-in zoom-in-95 duration-500">
                <Outlet />
            </div>
        </div>
    );
}
