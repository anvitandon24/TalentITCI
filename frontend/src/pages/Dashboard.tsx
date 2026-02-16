import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, Calendar, TrendingUp, BrainCircuit } from 'lucide-react';
import { Card } from '../components/Card';
import { PageTransition } from '../components/PageTransition';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useState, useEffect } from 'react';
import { endpoints, Candidate, Job } from '../lib/api';

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export const Dashboard = () => {
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [candidatesRes, jobsRes] = await Promise.all([
                endpoints.getCandidates(),
                endpoints.getJobs()
            ]);
            setCandidates(candidatesRes.data);
            setJobs(jobsRes.data);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate stats from real data
    const stats = [
        {
            label: 'Total Candidates',
            value: candidates.length.toString(),
            change: '+12%',
            icon: Users,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10'
        },
        {
            label: 'Active Jobs',
            value: jobs.filter(j => j.status === 'Open').length.toString(),
            change: `+${jobs.length}`,
            icon: Briefcase,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10'
        },
        {
            label: 'Interviews',
            value: candidates.filter(c => c.status === 'Interview').length.toString(),
            change: '+5 today',
            icon: Calendar,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10'
        }
    ];

    // Calculate funnel data from candidates
    const statusCounts = candidates.reduce((acc, candidate) => {
        acc[candidate.status] = (acc[candidate.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const data = [
        { name: 'Applied', value: statusCounts['Applied'] || 0 },
        { name: 'Screening', value: statusCounts['Screening'] || 0 },
        { name: 'Interview', value: statusCounts['Interview'] || 0 },
        { name: 'Offer', value: statusCounts['Offer'] || 0 },
        { name: 'Hired', value: statusCounts['Hired'] || 0 },
    ];

    if (isLoading) {
        return (
            <PageTransition>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-slate-500 dark:text-slate-400">Loading dashboard...</div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-500 bg-clip-text text-transparent">
                            Welcome back, HR Manager
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Here's what's happening today.</p>
                    </div>

                    <button
                        onClick={() => navigate('/jobs')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
                    >
                        Post New Job
                    </button>
                </div>

                {/* Stats Grid */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    {stats.map((stat, index) => (
                        <motion.div key={index} variants={item}>
                            <Card className="hover:scale-[1.02] transition-transform duration-300">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                                        <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white">{stat.value}</h3>
                                    </div>
                                    <div className={`p-3 rounded-xl ${stat.bg}`}>
                                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-4 text-sm">
                                    <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1 font-medium bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                        <TrendingUp className="w-3 h-3" />
                                        {stat.change}
                                    </span>
                                    <span className="text-slate-500">vs last month</span>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Recent Activity / Charts Placeholder */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="min-h-[350px]">
                        <h3 className="text-lg font-semibold mb-6 text-slate-900 dark:text-white">Recruitment Funnel</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data}>
                                    <XAxis
                                        dataKey="name"
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#94a3b8"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#1e293b' }}
                                        contentStyle={{
                                            backgroundColor: '#0f172a',
                                            borderColor: '#334155',
                                            borderRadius: '8px',
                                            color: '#f8fafc'
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {data.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'][index % 5]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="min-h-[350px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Candidates</h3>
                            <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">View All</button>
                        </div>
                        <div className="space-y-4">
                            {candidates.slice(0, 4).map((candidate) => (
                                <div key={candidate.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-sm text-white shadow-lg shadow-blue-500/20">
                                            {candidate.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-500 transition-colors">
                                                {candidate.name}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{candidate.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {candidate.score != null && (
                                            <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${
                                                candidate.score >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                candidate.score >= 60 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                candidate.score >= 40 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                                <BrainCircuit className="w-3 h-3" /> {candidate.score}
                                            </span>
                                        )}
                                        <span className={`text-xs px-2 py-1 rounded-full border ${candidate.status === 'Screening' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                            candidate.status === 'Interview' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                                candidate.status === 'Offer' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                            }`}>
                                            {candidate.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {candidates.length === 0 && (
                                <p className="text-center text-slate-500 dark:text-slate-400 py-8">No candidates yet</p>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </PageTransition>
    );
};

