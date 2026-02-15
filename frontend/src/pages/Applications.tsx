import { motion } from 'framer-motion';
import { Briefcase, Clock, Search, Filter, FileText, ShieldCheck, Download } from 'lucide-react';
import { Card } from '../components/Card';
import { PageTransition } from '../components/PageTransition';
import { useEffect, useState } from 'react';
import { endpoints, Application } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const statusColors: Record<string, string> = {
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
    const [searchFilter, setSearchFilter] = useState('');

    const candidateId = user?.candidate_id ?? parseInt(user?.id || '0');

    useEffect(() => {
        const fetchApplications = async () => {
            if (!user) return;
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
    }, [user, candidateId]);

    const filteredApps = applications.filter(app => {
        if (!searchFilter) return true;
        const title = app.job?.title || '';
        const dept = app.job?.department || '';
        return title.toLowerCase().includes(searchFilter.toLowerCase()) ||
               dept.toLowerCase().includes(searchFilter.toLowerCase());
    });

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
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full md:w-64 text-slate-200"
                            />
                        </div>
                    </div>
                </div>

                {/* My Resume download link */}
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Your Resume</span>
                        <a
                            href={endpoints.downloadResume(candidateId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            <Download className="w-4 h-4" /> Download My Resume
                        </a>
                    </div>
                </Card>

                {filteredApps.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>No applications yet. Start applying to jobs!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredApps.map((app) => (
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
                                            {app.rag_score != null && (
                                                <div className="text-right">
                                                    <span className="text-xs text-slate-500 block">AI Score</span>
                                                    <span className={`text-lg font-bold ${
                                                        app.rag_score >= 80 ? 'text-emerald-400' :
                                                        app.rag_score >= 60 ? 'text-blue-400' :
                                                        app.rag_score >= 40 ? 'text-yellow-400' : 'text-red-400'
                                                    }`}>
                                                        {app.rag_score}
                                                    </span>
                                                </div>
                                            )}
                                            <span className={`px-4 py-2 rounded-full text-sm font-medium border ${statusColors[app.stage as keyof typeof statusColors] || statusColors.Applied}`}>
                                                {app.stage}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Document Links */}
                                    {app.job && (
                                        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-white/5">
                                            {app.job.has_jd && (
                                                <a
                                                    href={endpoints.downloadJobDescription(app.job.id)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 text-xs px-3 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-colors"
                                                >
                                                    <FileText className="w-3.5 h-3.5" /> Job Description
                                                </a>
                                            )}
                                            {app.job.has_hr_policy && (
                                                <a
                                                    href={endpoints.downloadHrPolicy(app.job.id)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 text-xs px-3 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 transition-colors"
                                                >
                                                    <ShieldCheck className="w-3.5 h-3.5" /> HR Policy
                                                </a>
                                            )}
                                        </div>
                                    )}

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
