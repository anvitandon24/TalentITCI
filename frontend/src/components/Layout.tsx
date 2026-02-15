import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import Chatbot from './Chatbot';
import { useAuth } from '../context/AuthContext';

export const Layout = () => {
    const { user } = useAuth();

    return (
        <div className="flex min-h-screen bg-[#0f172a] text-slate-100 relative">
            <Sidebar />
            <main className="flex-1 ml-64 p-8 relative overflow-y-auto">
                {/* Background ambient glow */}
                <div className="absolute top-0 left-0 w-full h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-full h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none translate-y-1/2" />

                <div className="relative z-10 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
            {user?.role === 'hr' && <Chatbot />}
        </div>
    );
};
