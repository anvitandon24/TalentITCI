import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, LogOut, FileText, Compass, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';

const hrNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Candidates', path: '/candidates' },
    { icon: Briefcase, label: 'Jobs', path: '/jobs' },
];

const candidateNavItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/candidate-dashboard' },
    { icon: Compass, label: 'Find Jobs', path: '/jobs' },
    { icon: FileText, label: 'Applications', path: '/applications' },
    { icon: Sparkles, label: 'Career AI', path: '/career-assistant' },
];

export const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const navItems = user?.role === 'hr' ? hrNavItems : candidateNavItems;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-64 h-screen bg-[#0f172a]/90 backdrop-blur-xl border-r border-slate-800 flex flex-col fixed left-0 top-0 z-50"
        >
            <div className="p-6 border-b border-slate-800/50">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Talent AI
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                    {user?.role === 'hr' ? 'HR Intelligence' : 'Candidate Portal'}
                </p>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.path}
                        className={({ isActive }) =>
                            clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                isActive
                                    ? "text-white shadow-lg shadow-blue-500/10 bg-blue-600/10"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNav"
                                        className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/10 border-l-2 border-blue-500"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <item.icon className={clsx("w-5 h-5 relative z-10 transition-colors", isActive ? "text-blue-400" : "group-hover:text-blue-400")} />
                                <span className="relative z-10 font-medium">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800/50 space-y-2">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </motion.aside>
    );
};
