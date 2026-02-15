import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedCandidateRoute = () => {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-slate-400">
                Loading...
            </div>
        );
    }

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    if (user?.role === 'hr') return <Navigate to="/dashboard" replace />;
    if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user?.role !== 'candidate') return <Navigate to="/login" replace />;

    return <Outlet />;
};
