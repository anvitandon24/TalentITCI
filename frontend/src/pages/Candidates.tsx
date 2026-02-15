import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, MoreHorizontal, Sparkles, BrainCircuit,
    ChevronDown, ChevronUp, CheckCircle, XCircle, RefreshCw,
    FileText, Download, Briefcase, Loader2,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageTransition } from '../components/PageTransition';
import { endpoints, type Candidate, type CandidateApplication } from '../lib/api';

const statusColors: Record<string, string> = {
    Applied: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    Screening: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    Interview: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    Offer: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    Rejected: "bg-red-500/10 text-red-500 border-red-500/20",
    Selected: "bg-green-500/10 text-green-500 border-green-500/20",
};

interface ExtendedCandidate extends Candidate {
    role?: string;
    location?: string;
    applications?: CandidateApplication[];
}

export const Candidates = () => {
    const [candidates, setCandidates] = useState<ExtendedCandidate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState<'default' | 'score'>('default');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

    const loadCandidates = async () => {
        setIsLoading(true);
        try {
            const params = sortBy === 'score' ? { order_by: 'score', desc: true } : undefined;
            const response = await endpoints.getCandidates(params);
            const enrichedCandidates = response.data.map((c: Candidate) => ({
                ...c,
                role: 'Candidate',
                location: 'Remote',
            }));
            setCandidates(enrichedCandidates);
        } catch (error) {
            console.error('Failed to load candidates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCandidates();
    }, [sortBy]);

    const handleStatusUpdate = async (candidateId: number, newStatus: string) => {
        setUpdatingStatus(candidateId);
        try {
            await endpoints.updateCandidateStatus(candidateId, newStatus);
            await loadCandidates();
        } catch (error) {
            console.error('Failed to update status:', error);
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleRetriggerEvaluation = async (applicationId: number) => {
        try {
            await endpoints.triggerEvaluation(applicationId);
            // Reload after a short delay so the PROCESSING status shows
            setTimeout(() => loadCandidates(), 500);
        } catch (error) {
            console.error('Failed to trigger evaluation:', error);
        }
    };

    const filteredCandidates = candidates.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(filter.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(filter.toLowerCase()));
        const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getScoreColor = (score: number | null | undefined) => {
        if (!score && score !== 0) return 'border-slate-600 text-slate-400 bg-slate-500/10';
        if (score >= 80) return 'border-emerald-500 text-emerald-500 bg-emerald-500/10';
        if (score >= 60) return 'border-blue-500 text-blue-500 bg-blue-500/10';
        if (score >= 40) return 'border-yellow-500 text-yellow-500 bg-yellow-500/10';
        return 'border-red-500 text-red-500 bg-red-500/10';
    };

    const getRagStatusBadge = (ragStatus: string | null | undefined) => {
        if (!ragStatus) return null;
        const colorMap: Record<string, string> = {
            PASS: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            FAIL: 'bg-red-500/10 text-red-400 border-red-500/20',
            ERROR: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            PROCESSING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        };
        const colors = colorMap[ragStatus] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        return (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${colors} flex items-center gap-1`}>
                {ragStatus === 'PROCESSING' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                AI: {ragStatus}
            </span>
        );
    };

    if (isLoading) {
        return (
            <PageTransition>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-slate-500 dark:text-slate-400">Loading candidates...</div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Candidates</h1>
                        <p className="text-slate-500 dark:text-slate-400">Manage and track candidate progress. AI scores update automatically.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <div className="relative flex-1 md:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search candidates..."
                                className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full md:w-64 transition-colors"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="appearance-none pl-10 pr-8 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                            >
                                <option value="All">All Status</option>
                                <option value="Applied">Applied</option>
                                <option value="Screening">Screening</option>
                                <option value="Interview">Interview</option>
                                <option value="Offer">Offer</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Selected">Selected</option>
                            </select>
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'default' | 'score')}
                                className="appearance-none pl-10 pr-8 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                            >
                                <option value="default">Sort: Default</option>
                                <option value="score">Sort by Score (High → Low)</option>
                            </select>
                            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {filteredCandidates.length === 0 ? (
                    <Card className="p-8 text-center">
                        <p className="text-slate-500 dark:text-slate-400">No candidates found.</p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {filteredCandidates.map((candidate, index) => (
                            <motion.div
                                key={candidate.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card
                                    className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group border-l-4"
                                    style={{
                                        borderLeftColor: candidate.score != null && candidate.score >= 80 ? '#10b981'
                                            : candidate.score != null && candidate.score >= 60 ? '#3b82f6'
                                            : candidate.score != null && candidate.score >= 40 ? '#eab308'
                                            : candidate.score != null ? '#ef4444'
                                            : '#475569'
                                    }}
                                >
                                    {/* Main Row */}
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-500/20 shrink-0">
                                            {candidate.name.charAt(0)}
                                        </div>

                                        {/* Name + badges */}
                                        <div className="min-w-0 w-40 shrink-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold text-lg text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors truncate">{candidate.name}</h3>
                                                {candidate.score != null && candidate.score >= 80 && (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-100 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                                                        <Sparkles className="w-3 h-3" /> TOP
                                                    </span>
                                                )}
                                                {getRagStatusBadge(candidate.rag_status)}
                                            </div>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm truncate">{candidate.role || 'Candidate'}</p>
                                        </div>

                                        {/* AI Score Badge */}
                                        <div className="flex flex-col items-center shrink-0">
                                            <span className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1">
                                                <BrainCircuit className="w-3 h-3" /> AI Score
                                            </span>
                                            <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 font-bold text-sm ${getScoreColor(candidate.score)}`}>
                                                {candidate.score != null ? candidate.score : '—'}
                                            </div>
                                        </div>

                                        {/* Email - fixed width to prevent misalignment */}
                                        <div className="hidden md:block min-w-0 flex-1 px-4 border-l border-r border-slate-200 dark:border-white/10">
                                            <span className="text-sm text-slate-500 dark:text-slate-400 block truncate" title={candidate.email}>
                                                {candidate.email}
                                            </span>
                                        </div>

                                        {/* Status Badge */}
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${statusColors[candidate.status] || statusColors.Applied}`}>
                                            {candidate.status.toUpperCase()}
                                        </div>

                                        {/* Select / Reject buttons */}
                                        <div className="flex gap-1 shrink-0">
                                            <button
                                                onClick={() => handleStatusUpdate(candidate.id, 'Selected')}
                                                disabled={updatingStatus === candidate.id || candidate.status === 'Selected'}
                                                className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Select candidate"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate(candidate.id, 'Rejected')}
                                                disabled={updatingStatus === candidate.id || candidate.status === 'Rejected'}
                                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Reject candidate"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Expand/collapse button */}
                                        <button
                                            onClick={() => setExpandedId(expandedId === candidate.id ? null : candidate.id)}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-blue-500 transition-colors shrink-0"
                                            title="View details"
                                        >
                                            {expandedId === candidate.id ? (
                                                <ChevronUp className="w-5 h-5" />
                                            ) : (
                                                <MoreHorizontal className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Mobile email (shown only on small screens) */}
                                    <div className="md:hidden mt-2 text-sm text-slate-500 dark:text-slate-400 truncate">
                                        {candidate.email}
                                    </div>

                                    {/* Expanded Details Panel */}
                                    <AnimatePresence>
                                        {expandedId === candidate.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 space-y-4">
                                                    {/* Candidate Email */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</label>
                                                            <p className="text-sm text-white mt-1">{candidate.email}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Resume</label>
                                                            <div className="mt-1">
                                                                <a
                                                                    href={endpoints.downloadResume(candidate.id)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" /> Download Resume
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* RAG Reasoning */}
                                                    {candidate.rag_reasoning && (
                                                        <div>
                                                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">AI Evaluation Summary</label>
                                                            <p className="text-sm text-slate-300 mt-1 leading-relaxed bg-slate-800/50 rounded-lg p-3">
                                                                {candidate.rag_reasoning}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Applications */}
                                                    {candidate.applications && candidate.applications.length > 0 && (
                                                        <div>
                                                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                                                                Applications ({candidate.applications.length})
                                                            </label>
                                                            <div className="space-y-2">
                                                                {candidate.applications.map((app) => (
                                                                    <div key={app.application_id} className="flex items-center justify-between bg-slate-800/30 rounded-lg p-3 border border-white/5">
                                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                            <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                                                                            <div className="min-w-0">
                                                                                <p className="text-sm font-medium text-white truncate">{app.job_title}</p>
                                                                                <p className="text-xs text-slate-400">Stage: {app.stage}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 shrink-0">
                                                                            {/* App-level RAG score */}
                                                                            <div className="text-right">
                                                                                {app.rag_score != null ? (
                                                                                    <span className={`text-sm font-bold ${
                                                                                        app.rag_score >= 80 ? 'text-emerald-400' :
                                                                                        app.rag_score >= 60 ? 'text-blue-400' :
                                                                                        app.rag_score >= 40 ? 'text-yellow-400' : 'text-red-400'
                                                                                    }`}>
                                                                                        {app.rag_score}/100
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-xs text-slate-500">
                                                                                        {app.rag_status === 'PROCESSING' ? (
                                                                                            <span className="flex items-center gap-1 text-blue-400">
                                                                                                <Loader2 className="w-3 h-3 animate-spin" /> Scoring...
                                                                                            </span>
                                                                                        ) : app.rag_status === 'ERROR' ? (
                                                                                            'Error'
                                                                                        ) : (
                                                                                            'Not scored'
                                                                                        )}
                                                                                    </span>
                                                                                )}
                                                                                {app.rag_status && (
                                                                                    <span className={`text-[9px] font-bold block ${
                                                                                        app.rag_status === 'PASS' ? 'text-emerald-400' :
                                                                                        app.rag_status === 'PROCESSING' ? 'text-blue-400' :
                                                                                        app.rag_status === 'ERROR' ? 'text-orange-400' : 'text-red-400'
                                                                                    }`}>
                                                                                        {app.rag_status}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {/* Re-trigger button for failed/null evaluations */}
                                                                            {(app.rag_status === 'ERROR' || app.rag_status === null) && (
                                                                                <button
                                                                                    onClick={() => handleRetriggerEvaluation(app.application_id)}
                                                                                    className="p-1 rounded hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 transition-colors"
                                                                                    title="Re-trigger AI evaluation"
                                                                                >
                                                                                    <RefreshCw className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* App-level RAG reasoning */}
                                                    {candidate.applications && candidate.applications.some(a => a.rag_reasoning) && (
                                                        <div>
                                                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                                                                Detailed AI Reasoning
                                                            </label>
                                                            {candidate.applications.filter(a => a.rag_reasoning).map((app) => (
                                                                <div key={`reasoning-${app.application_id}`} className="bg-slate-800/30 rounded-lg p-3 border border-white/5 mb-2">
                                                                    <p className="text-xs font-medium text-blue-400 mb-1">{app.job_title}</p>
                                                                    <p className="text-xs text-slate-400 leading-relaxed">{app.rag_reasoning}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Status Update Actions */}
                                                    <div className="flex flex-wrap gap-2 pt-2">
                                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider w-full">Update Status</label>
                                                        {['Applied', 'Screening', 'Interview', 'Offer', 'Selected', 'Rejected'].map((s) => (
                                                            <button
                                                                key={s}
                                                                onClick={() => handleStatusUpdate(candidate.id, s)}
                                                                disabled={updatingStatus === candidate.id || candidate.status === s}
                                                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                                                    candidate.status === s
                                                                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 cursor-default'
                                                                        : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700/50 hover:text-white'
                                                                } disabled:opacity-50`}
                                                            >
                                                                {s}
                                                            </button>
                                                        ))}
                                                    </div>
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
        </PageTransition>
    );
};
