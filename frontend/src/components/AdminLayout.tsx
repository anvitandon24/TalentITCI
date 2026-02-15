import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';

export const AdminLayout = () => {
    return (
        <div className="flex min-h-screen bg-[#0f172a] text-slate-100">
            <AdminSidebar />
            <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 relative overflow-y-auto min-h-screen">
                {/* Background ambient glow */}
                <div className="absolute top-0 left-0 w-full h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-full h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none translate-y-1/2" />

                <div className="relative z-10 max-w-7xl mx-auto pt-12 lg:pt-0">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
