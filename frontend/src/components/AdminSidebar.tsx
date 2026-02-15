import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Briefcase,
    UserCheck,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: UserCheck, label: 'Manage HR', path: '/admin/hr' },
    { icon: Briefcase, label: 'Jobs', path: '/admin/jobs' },
    { icon: Users, label: 'Candidates', path: '/admin/candidates' },
    { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export const AdminSidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    const sidebarContent = (
        <>
            <div className="p-6 border-b border-slate-800/50">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                    Talent AI
                </h1>
                <p className="text-xs text-slate-400 mt-1">Admin Console</p>
            </div>

            {/* User info */}
            <div className="px-4 py-3 border-b border-slate-800/30">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-600/30 flex items-center justify-center">
                        <span className="text-sm font-semibold text-purple-300">
                            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden',
                                isActive
                                    ? 'text-white shadow-lg shadow-purple-500/10 bg-purple-600/10'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.div
                                        layoutId="adminActiveNav"
                                        className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/10 border-l-2 border-purple-500"
                                        initial={false}
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <item.icon
                                    className={clsx(
                                        'w-5 h-5 relative z-10 transition-colors',
                                        isActive ? 'text-purple-400' : 'group-hover:text-purple-400'
                                    )}
                                />
                                <span className="relative z-10 font-medium">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800/50">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="fixed top-4 left-4 z-[60] lg:hidden p-2 rounded-lg bg-slate-800/80 backdrop-blur-md border border-slate-700 text-slate-300"
            >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop sidebar */}
            <motion.aside
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="hidden lg:flex w-64 h-screen bg-[#0f172a]/90 backdrop-blur-xl border-r border-slate-800 flex-col fixed left-0 top-0 z-50"
            >
                {sidebarContent}
            </motion.aside>

            {/* Mobile sidebar overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-50 lg:hidden"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="fixed left-0 top-0 w-64 h-screen bg-[#0f172a] border-r border-slate-800 flex flex-col z-[55] lg:hidden"
                        >
                            {sidebarContent}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
