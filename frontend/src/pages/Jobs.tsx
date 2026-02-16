import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, MapPin, DollarSign, Clock, Upload, FileText, ShieldCheck, BrainCircuit, Trophy, X, Check, Download, RefreshCw, Loader2, Trash2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageTransition } from '../components/PageTransition';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { endpoints, RankedApplication } from '../lib/api';

interface Job {
    id: number;
    title: string;
    department: string;
    location: string;
    type: string;
    applicants: number;
    posted: string;
    status: string;
    has_jd?: boolean;
    has_hr_policy?: boolean;
    jd_filename?: string | null;
    hr_policy_filename?: string | null;
}

export const Jobs = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newJob, setNewJob] = useState({ title: '', department: '', location: 'Remote', type: 'Full-time' });

    // Upload state
    const [uploadingJobId, setUploadingJobId] = useState<number | null>(null);
    const [uploadType, setUploadType] = useState<'jd' | 'hr' | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // Rankings state
    const [rankingsJobId, setRankingsJobId] = useState<number | null>(null);
    const [rankings, setRankings] = useState<RankedApplication[]>([]);
    const [loadingRankings, setLoadingRankings] = useState(false);
    const [triggeringAll, setTriggeringAll] = useState(false);

    // Applied job IDs for candidate (so we show "Applied" instead of "Apply Now")
    const [appliedJobIds, setAppliedJobIds] = useState<Set<number>>(new Set());

    // Delete confirmation state
    const [deleteConfirmJobId, setDeleteConfirmJobId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadJobs();
    }, []);

    const loadAppliedJobIds = async () => {
        if (user?.role !== 'candidate') return;
        const cid = user?.candidate_id ?? (user?.id ? parseInt(String(user.id)) : null);
        if (!cid) return;
        try {
            const res = await endpoints.getCandidateApplications(cid);
            setAppliedJobIds(new Set((res.data || []).map((a: { job_id: number }) => a.job_id)));
        } catch (e) {
            console.error('Failed to load applications', e);
        }
    };

    useEffect(() => {
        loadAppliedJobIds();
    }, [user?.role, user?.candidate_id, user?.id]);

    useEffect(() => {
        const onFocus = () => loadAppliedJobIds();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [user?.role, user?.candidate_id, user?.id]);

    const loadJobs = async () => {
        try {
            const response = await endpoints.getJobs();
            setJobs(response.data);
        } catch (error) {
            console.error('Failed to load jobs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateJob = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await endpoints.createJob(newJob);
            setShowCreateModal(false);
            setNewJob({ title: '', department: '', location: 'Remote', type: 'Full-time' });
            loadJobs();
        } catch (error) {
            console.error("Failed to create job", error);
        }
    };

    const openUploadModal = (jobId: number, type: 'jd' | 'hr') => {
        setUploadingJobId(jobId);
        setUploadType(type);
        setUploadFile(null);
        setUploadSuccess(false);
    };

    const handleUpload = async () => {
        if (!uploadingJobId || !uploadType || !uploadFile) return;
        setUploading(true);
        try {
            if (uploadType === 'jd') {
                await endpoints.uploadJobDescription(uploadingJobId, uploadFile);
            } else {
                await endpoints.uploadHrPolicy(uploadingJobId, uploadFile);
            }
            setUploadSuccess(true);
            loadJobs();
            setTimeout(() => {
                setUploadingJobId(null);
                setUploadType(null);
                setUploadFile(null);
                setUploadSuccess(false);
            }, 1500);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadFile(e.target.files[0]);
        }
    };

    const loadRankings = async (jobId: number) => {
        if (rankingsJobId === jobId) {
            setRankingsJobId(null);
            return;
        }
        setRankingsJobId(jobId);
        setLoadingRankings(true);
        try {
            const response = await endpoints.getJobRankings(jobId);
            setRankings(response.data);
        } catch (error) {
            console.error('Failed to load rankings:', error);
        } finally {
            setLoadingRankings(false);
        }
    };

    const handleTriggerAll = async (jobId: number) => {
        setTriggeringAll(true);
        try {
            await endpoints.triggerAllEvaluations(jobId);
            // Reload rankings after a short delay
            setTimeout(() => loadRankings(jobId), 1000);
        } catch (error) {
            console.error('Failed to trigger evaluations:', error);
        } finally {
            setTriggeringAll(false);
        }
    };

    const handleRetriggerSingle = async (applicationId: number, jobId: number) => {
        try {
            await endpoints.triggerEvaluation(applicationId);
            setTimeout(() => {
                if (rankingsJobId === jobId) {
                    loadRankings(jobId);
                }
            }, 1000);
        } catch (error) {
            console.error('Failed to trigger evaluation:', error);
        }
    };

    const handleDeleteJob = async (jobId: number) => {
        setDeleting(true);
        try {
            await endpoints.deleteJob(jobId);
            setDeleteConfirmJobId(null);
            loadJobs();
        } catch (error) {
            console.error('Failed to delete job:', error);
            alert('Failed to delete job. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    const getScoreColor = (score: number | null) => {
        if (score === null) return 'text-slate-400';
        if (score >= 80) return 'text-emerald-400';
        if (score >= 60) return 'text-blue-400';
        if (score >= 40) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getScoreBg = (score: number | null) => {
        if (score === null) return 'bg-slate-500/10 border-slate-500/20';
        if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/20';
        if (score >= 60) return 'bg-blue-500/10 border-blue-500/20';
        if (score >= 40) return 'bg-yellow-500/10 border-yellow-500/20';
        return 'bg-red-500/10 border-red-500/20';
    };

    const isHR = user?.role === 'hr';
    const isCandidate = user?.role === 'candidate';

    return (
        <PageTransition>
            <div className="space-y-6 relative">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Open Positions</h1>
                        <p className="text-slate-500 dark:text-slate-400">Manage job listings and track applications.</p>
                    </div>
                    {isHR &&
                        <Button onClick={() => setShowCreateModal(true)}>Create Job</Button>
                    }
                </div>

                {isLoading ? (
                    <div className="text-center text-slate-500 py-10">Loading jobs...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {jobs.map((job, index) => (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="hover:border-blue-500/30 transition-colors group h-full flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <span className="text-xs font-medium text-blue-500 dark:text-blue-400 mb-1 block">{job.department}</span>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">{job.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20 transition-colors">
                                                <Briefcase className="w-5 h-5 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                                            </div>
                                            {isHR && (
                                                <button
                                                    onClick={() => setDeleteConfirmJobId(job.id)}
                                                    className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Delete job"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4 flex-1">
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                            <MapPin className="w-4 h-4" /> {job.location}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                            <Clock className="w-4 h-4" /> {job.type}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                            <DollarSign className="w-4 h-4" /> Competitive Salary
                                        </div>
                                    </div>

                                    {/* Document status indicators (HR view) */}
                                    {isHR && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <button
                                                onClick={() => openUploadModal(job.id, 'jd')}
                                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                                                    job.has_jd
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                        : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700/50 hover:text-white'
                                                }`}
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                {job.has_jd ? (job.jd_filename || 'JD Uploaded') : 'Upload JD'}
                                            </button>
                                            {job.has_jd && (
                                                <a
                                                    href={endpoints.downloadJobDescription(job.id)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                                                    title="Download JD"
                                                >
                                                    <Download className="w-3 h-3" />
                                                </a>
                                            )}
                                            <button
                                                onClick={() => openUploadModal(job.id, 'hr')}
                                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                                                    job.has_hr_policy
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                        : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700/50 hover:text-white'
                                                }`}
                                            >
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                {job.has_hr_policy ? (job.hr_policy_filename || 'Policy Uploaded') : 'Upload HR Policy'}
                                            </button>
                                            {job.has_hr_policy && (
                                                <a
                                                    href={endpoints.downloadHrPolicy(job.id)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                                                    title="Download HR Policy"
                                                >
                                                    <Download className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* Candidate view: document links */}
                                    {isCandidate && (job.has_jd || job.has_hr_policy) && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {job.has_jd && (
                                                <a
                                                    href={endpoints.downloadJobDescription(job.id)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                                                >
                                                    <FileText className="w-3.5 h-3.5" /> View Job Description
                                                </a>
                                            )}
                                            {job.has_hr_policy && (
                                                <a
                                                    href={endpoints.downloadHrPolicy(job.id)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                                                >
                                                    <ShieldCheck className="w-3.5 h-3.5" /> View HR Policy
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                                        {isHR ? (
                                            <>
                                                <div className="text-sm">
                                                    <span className="text-slate-900 dark:text-white font-medium">{job.applicants}</span>
                                                    <span className="text-slate-500 ml-1">Applicants</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {job.applicants > 0 && (
                                                        <button
                                                            onClick={() => loadRankings(job.id)}
                                                            className="flex items-center gap-1 text-xs font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg border border-purple-500/20 transition-colors"
                                                        >
                                                            <Trophy className="w-3.5 h-3.5" />
                                                            {rankingsJobId === job.id ? 'Hide' : 'Rankings'}
                                                        </button>
                                                    )}
                                                    <span className="text-xs text-slate-500 py-1.5">{job.posted}</span>
                                                </div>
                                            </>
                                        ) : (
                                            appliedJobIds.has(job.id) ? (
                                                <Button className="w-full" disabled>
                                                    Applied
                                                </Button>
                                            ) : (
                                                <Button
                                                    className="w-full"
                                                    onClick={() => navigate(`/apply/${job.id}`)}
                                                >
                                                    Apply Now
                                                </Button>
                                            )
                                        )}
                                    </div>

                                    {/* Rankings Panel */}
                                    <AnimatePresence>
                                        {rankingsJobId === job.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                                            <BrainCircuit className="w-4 h-4 text-purple-400" />
                                                            AI-Ranked Candidates
                                                        </div>
                                                        {job.has_jd && (
                                                            <button
                                                                onClick={() => handleTriggerAll(job.id)}
                                                                disabled={triggeringAll}
                                                                className="flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded border border-blue-500/20 transition-colors disabled:opacity-50"
                                                            >
                                                                {triggeringAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                                Evaluate All
                                                            </button>
                                                        )}
                                                    </div>
                                                    {loadingRankings ? (
                                                        <div className="text-sm text-slate-400 py-4 text-center">Loading rankings...</div>
                                                    ) : rankings.length === 0 ? (
                                                        <div className="text-sm text-slate-500 py-4 text-center">No candidates have applied yet.</div>
                                                    ) : (
                                                        rankings.map((r, idx) => (
                                                            <div key={r.id} className={`p-3 rounded-lg border ${getScoreBg(r.rag_score)} transition-colors`}>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${idx === 0 && r.rag_score ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                                                                            #{idx + 1}
                                                                        </span>
                                                                        <span className="text-sm font-medium text-white truncate">{r.candidate_name}</span>
                                                                        {r.candidate_email && (
                                                                            <span className="text-xs text-slate-500 truncate hidden md:inline">({r.candidate_email})</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        <span className={`text-lg font-bold ${getScoreColor(r.rag_score)}`}>
                                                                            {r.rag_score ?? '—'}
                                                                        </span>
                                                                        {r.rag_status && (
                                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                                                r.rag_status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                                r.rag_status === 'PROCESSING' ? 'bg-blue-500/20 text-blue-400' :
                                                                                r.rag_status === 'ERROR' ? 'bg-orange-500/20 text-orange-400' :
                                                                                'bg-red-500/20 text-red-400'
                                                                            }`}>
                                                                                {r.rag_status === 'PROCESSING' && <Loader2 className="w-2.5 h-2.5 animate-spin inline mr-0.5" />}
                                                                                {r.rag_status}
                                                                            </span>
                                                                        )}
                                                                        {/* Resume download for HR */}
                                                                        <a
                                                                            href={endpoints.downloadResume(r.candidate_id)}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="p-1 rounded hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 transition-colors"
                                                                            title="Download resume"
                                                                        >
                                                                            <Download className="w-3.5 h-3.5" />
                                                                        </a>
                                                                        {/* Re-trigger for failed / null */}
                                                                        {(r.rag_status === 'ERROR' || r.rag_status === null) && (
                                                                            <button
                                                                                onClick={() => handleRetriggerSingle(r.id, job.id)}
                                                                                className="p-1 rounded hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 transition-colors"
                                                                                title="Re-trigger evaluation"
                                                                            >
                                                                                <RefreshCw className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {r.rag_reasoning && (
                                                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{r.rag_reasoning}</p>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Job Modal */}
            {showCreateModal && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">Post New Job</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateJob} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Job Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    value={newJob.title}
                                    onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Department</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    value={newJob.department}
                                    onChange={e => setNewJob({ ...newJob, department: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Location</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={newJob.location}
                                        onChange={e => setNewJob({ ...newJob, location: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Type</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={newJob.type}
                                        onChange={e => setNewJob({ ...newJob, type: e.target.value })}
                                    >
                                        <option>Full-time</option>
                                        <option>Contract</option>
                                        <option>Part-time</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <Button type="submit">Create Job</Button>
                            </div>
                        </form>
                    </motion.div>
                </div>,
                document.body
            )}

            {/* Upload Modal */}
            {uploadingJobId !== null && uploadType && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {uploadType === 'jd' ? (
                                    <><FileText className="w-5 h-5 text-blue-400" /> Upload Job Description</>
                                ) : (
                                    <><ShieldCheck className="w-5 h-5 text-emerald-400" /> Upload HR Policy</>
                                )}
                            </h2>
                            <button onClick={() => { setUploadingJobId(null); setUploadType(null); }} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {uploadSuccess ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-8 h-8" />
                                </div>
                                <p className="text-lg font-semibold text-white">Uploaded successfully!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-400">
                                    {uploadType === 'jd'
                                        ? 'Upload the job description PDF. This is used by the AI to evaluate candidate resumes.'
                                        : 'Upload the HR policy PDF (optional). This provides additional context for the AI evaluation.'
                                    }
                                </p>
                                <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-blue-500/50 transition-colors bg-slate-800/20">
                                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                                    <p className="text-sm text-slate-300 mb-2">
                                        {uploadFile ? uploadFile.name : 'Select a PDF file'}
                                    </p>
                                    <input
                                        type="file"
                                        id="upload-pdf"
                                        className="hidden"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => document.getElementById('upload-pdf')?.click()}
                                    >
                                        {uploadFile ? 'Change File' : 'Select File'}
                                    </Button>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => { setUploadingJobId(null); setUploadType(null); }}
                                        className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <Button
                                        onClick={handleUpload}
                                        disabled={!uploadFile}
                                        isLoading={uploading}
                                    >
                                        Upload
                                    </Button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmJobId !== null && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 border border-red-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                    >
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 bg-red-500/10 rounded-full">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-white mb-2">Delete Job?</h2>
                                <p className="text-sm text-slate-400">
                                    Are you sure you want to delete this job posting? This will also delete all associated applications and cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setDeleteConfirmJobId(null)}
                                disabled={deleting}
                                className="px-4 py-2 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <Button
                                onClick={() => handleDeleteJob(deleteConfirmJobId)}
                                isLoading={deleting}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                Delete Job
                            </Button>
                        </div>
                    </motion.div>
                </div>,
                document.body
            )}
        </PageTransition>
    );
};
