import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, CheckCircle, Clock, FileText, Sparkles, ArrowRight, Download, ShieldCheck } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageTransition } from '../components/PageTransition';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { endpoints, Job, Application } from '../lib/api';

const statusColors: Record<string, string> = {
    Applied: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    Screening: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    Interview: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    Offer: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    Rejected: "text-red-400 bg-red-500/10 border-red-500/20",
    Selected: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

export const CandidateDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [applications, setApplications] = useState<Application[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    const candidateId = user?.candidate_id ?? parseInt(user?.id || '0');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [appsRes, jobsRes] = await Promise.all([
                    endpoints.getCandidateApplications(candidateId),
                    endpoints.getJobs(),
                ]);
                setApplications(appsRes.data);
                setJobs(jobsRes.data);
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [candidateId]);

    const totalApps = applications.length;
    const inProgress = applications.filter(a => ['Applied', 'Screening', 'Interview'].includes(a.stage)).length;
    const offers = applications.filter(a => a.stage === 'Offer').length;

    // Jobs the candidate hasn't applied to yet — show as recommendations
    const appliedJobIds = new Set(applications.map(a => a.job_id));
    const recommendedJobs = jobs.filter(j => !appliedJobIds.has(j.id)).slice(0, 3);

    if (loading) {
        return (
            <PageTransition>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-slate-400">Loading dashboard...</div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="space-y-8 p-8 max-w-6xl mx-auto">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            Hello, {user?.name || 'Candidate'}
                        </h1>
                        <p className="text-slate-400 mt-1">Track your applications and find new opportunities.</p>
                    </div>
                    <Button onClick={() => navigate('/jobs')}>Browse Jobs</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Total Applications</p>
                                <p className="text-2xl font-bold text-white">{totalApps}</p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-500/20 rounded-xl text-yellow-400">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">In Progress</p>
                                <p className="text-2xl font-bold text-white">{inProgress}</p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Offers</p>
                                <p className="text-2xl font-bold text-white">{offers}</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* My Documents */}
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-blue-500" /> My Documents
                    </h2>
                    <Card>
                        <div className="flex flex-wrap gap-4">
                            <a
                                href={endpoints.downloadResume(candidateId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-xl text-sm text-slate-300 hover:text-white transition-colors"
                            >
                                <Download className="w-4 h-4 text-blue-400" /> My Resume
                            </a>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Applications */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-500" /> Recent Applications
                        </h2>
                        <div className="space-y-4">
                            {applications.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>No applications yet. Start applying to jobs!</p>
                                </div>
                            ) : (
                                applications.map((app) => (
                                    <motion.div
                                        key={app.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                    >
                                        <div className="bg-slate-800/50 backdrop-blur-sm border border-white/5 rounded-xl p-4 hover:shadow-lg transition-all duration-300 group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                                                        <Briefcase className="w-6 h-6 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-lg text-white group-hover:text-blue-500 transition-colors">
                                                            {app.job?.title || 'Unknown Position'}
                                                        </h3>
                                                        <p className="text-slate-400 text-sm">
                                                            {app.job?.department || 'Unknown'} &bull; {app.job?.posted || 'Recently'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[app.stage] || statusColors.Applied}`}>
                                                    {app.stage}
                                                </span>
                                            </div>

                                            {/* Document links for this application */}
                                            {app.job && (
                                                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/5">
                                                    {app.job.has_jd && (
                                                        <a
                                                            href={endpoints.downloadJobDescription(app.job.id)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" /> View Job Description
                                                        </a>
                                                    )}
                                                    {app.job.has_hr_policy && (
                                                        <a
                                                            href={endpoints.downloadHrPolicy(app.job.id)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                                        >
                                                            <ShieldCheck className="w-3.5 h-3.5" /> View HR Policy
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {/* Timeline / Progress Bar */}
                                            <div className="mt-4 pt-4 border-t border-white/5">
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
                                ))
                            )}
                        </div>
                    </div>

                    {/* Job Recommendations */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-500" /> Recommended Jobs
                        </h2>
                        <div className="space-y-4">
                            {recommendedJobs.length === 0 ? (
                                <p className="text-slate-400 text-sm">No new recommendations right now.</p>
                            ) : (
                                recommendedJobs.map((job) => (
                                    <Card key={job.id} className="group cursor-pointer hover:border-purple-500/30 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">{job.title}</h3>
                                                <p className="text-sm text-slate-400">{job.department}</p>
                                            </div>
                                            <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-lg">
                                                {job.location}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-4">{job.type} &bull; {job.posted}</p>
                                        <button
                                            onClick={() => navigate(`/apply/${job.id}`)}
                                            className="w-full py-2 text-sm font-medium text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-colors flex items-center justify-center gap-2"
                                        >
                                            View Details <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
};
