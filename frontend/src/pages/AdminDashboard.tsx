import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, FileText, Users, UserCheck, RefreshCw } from 'lucide-react';
import { adminEndpoints, type DashboardStats } from '../lib/api';
import { MetricCard } from '../components/admin/MetricCard';
import { ApplicationsTrendChart } from '../components/admin/ApplicationsTrendChart';
import { DepartmentPieChart } from '../components/admin/DepartmentPieChart';
import { RecentApplicationsTable } from '../components/admin/RecentApplicationsTable';
import { HiringFunnel } from '../components/admin/HiringFunnel';

export const AdminDashboard = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchStats = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await adminEndpoints.getDashboardStats();
            setStats(response.data);
        } catch (err) {
            setError('Failed to load dashboard data. Please try again.');
            console.error('Dashboard stats error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                    <p className="text-slate-400">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error || 'Something went wrong'}</p>
                    <button
                        onClick={fetchStats}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        Admin Dashboard
                    </h1>
                    <p className="text-slate-400 mt-1">Platform overview and analytics</p>
                </div>
                <button
                    onClick={fetchStats}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 hover:text-white hover:border-slate-600 transition-colors self-start sm:self-auto"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </motion.div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Active Jobs"
                    value={stats.active_jobs}
                    change={stats.active_jobs_change}
                    icon={Briefcase}
                    color="blue"
                />
                <MetricCard
                    title="Total Applications"
                    value={stats.total_applications}
                    change={stats.total_applications_change}
                    icon={FileText}
                    color="green"
                />
                <MetricCard
                    title="Candidate Sign-ups"
                    value={stats.candidate_signups}
                    change={stats.candidate_signups_change}
                    icon={Users}
                    color="purple"
                />
                <MetricCard
                    title="HR Managers"
                    value={stats.hr_count}
                    change={stats.hr_count_change}
                    icon={UserCheck}
                    color="orange"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ApplicationsTrendChart data={stats.applications_trend} />
                </div>
                <DepartmentPieChart data={stats.applications_by_department} />
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <RecentApplicationsTable data={stats.recent_applications} />
                </div>
                <HiringFunnel data={stats.hiring_funnel} />
            </div>
        </div>
    );
};
