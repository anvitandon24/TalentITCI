import { motion } from 'framer-motion';
import { Briefcase, Clock, Search, Filter } from 'lucide-react';
import { Card } from '../components/Card';
import { PageTransition } from '../components/PageTransition';
import { useEffect, useState } from 'react';
import { endpoints } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Application {
    id: number;
    candidate_id: number;
    job_id: number;
    stage: string;
    score: number | null;
    job?: {
        id: number;
        title: string;
        department: string;
        location: string;
        posted: string;
    };
}

const statusColors = {
    Applied: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    Screening: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    Interview: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    Offer: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    Rejected: "text-red-400 bg-red-500/10 border-red-500/20",
};

export const Applications = () => {
    const { user } = useAuth();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApplications = async () => {
            if (!user) return;
            const candidateId = user.candidate_id ?? parseInt(user.id);
            try {
                const response = await endpoints.getCandidateApplications(candidateId);
                setApplications(response.data);
            } catch (error) {
                console.error('Failed to load applications:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchApplications();
    }, [user]);

    if (loading) {
        return (
            <PageTransition>
                <div className="p-8 text-center text-slate-400">Loading applications...</div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="space-y-8 p-8 max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white">My Applications</h1>
                        <p className="text-slate-400 mt-1">Track the status of your job applications.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search applications..."
                                className="pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full md:w-64 text-slate-200"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                            <Filter className="w-4 h-4" /> Filter
                        </button>
                    </div>
                </div>

                {applications.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>No applications yet. Start applying to jobs!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {applications.map((app) => (
                            <motion.div
                                key={app.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                            >
                                <div className="bg-slate-800/50 backdrop-blur-sm border border-white/5 rounded-xl p-6 hover:shadow-lg transition-all duration-300 group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                                                <Briefcase className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg text-white group-hover:text-blue-400 transition-colors">
                                                    {app.job?.title || 'Unknown Position'}
                                                </h3>
                                                <p className="text-slate-400 text-sm">
                                                    {app.job?.department || 'Unknown'} • {app.job?.posted || 'Recently'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="hidden md:flex flex-col items-end text-sm text-slate-500">
                                                <span>Last Activity</span>
                                                <span>{app.job?.posted || 'Recently'}</span>
                                            </div>
                                            <span className={`px-4 py-2 rounded-full text-sm font-medium border ${statusColors[app.stage as keyof typeof statusColors] || statusColors.Applied}`}>
                                                {app.stage}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Timeline / Progress Bar */}
                                    <div className="mt-6 pt-6 border-t border-white/5">
                                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                                            <span>Application Sent</span>
                                            <span>Screening</span>
                                            <span>Interview</span>
                                            <span>Offer</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${app.stage === 'Rejected' ? 'bg-red-500' : 'bg-blue-500'}`}
                                                style={{
                                                    width: app.stage === 'Screening' ? '50%' :
                                                        app.stage === 'Interview' ? '75%' :
                                                            app.stage === 'Offer' ? '100%' : '25%'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </PageTransition>
    );
};
