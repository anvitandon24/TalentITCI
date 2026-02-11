import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, MoreHorizontal, Mail, MapPin, Sparkles } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageTransition } from '../components/PageTransition';
import { endpoints, Candidate } from '../lib/api';

const statusColors = {
    Applied: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    Screening: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    Interview: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    Offer: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    Rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

// Extended candidate interface with additional UI fields
interface ExtendedCandidate extends Candidate {
    role?: string;
    location?: string;
    score?: number;
}

export const Candidates = () => {
    const [candidates, setCandidates] = useState<ExtendedCandidate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => {
        loadCandidates();
    }, []);

    const loadCandidates = async () => {
        try {
            const response = await endpoints.getCandidates();
            const enrichedCandidates = response.data.map(c => ({
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

    const filteredCandidates = candidates.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(filter.toLowerCase()) ||
            (c.role && c.role.toLowerCase().includes(filter.toLowerCase()));
        const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

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
                        <p className="text-slate-500 dark:text-slate-400">Manage and track candidate progress.</p>
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
                            </select>
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <Button leftIcon={<Mail className="w-4 h-4" />}>
                            Invite
                        </Button>
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
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="flex flex-col md:flex-row items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group border-l-4" style={{ borderLeftColor: candidate.score && candidate.score >= 90 ? '#10b981' : candidate.score && candidate.score >= 80 ? '#3b82f6' : '#64748b' }}>
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-500/20">
                                        {candidate.name.charAt(0)}
                                    </div>

                                    <div className="flex-1 text-center md:text-left">
                                        <div className="flex items-center justify-center md:justify-start gap-2">
                                            <h3 className="font-semibold text-lg text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">{candidate.name}</h3>
                                            {candidate.score && candidate.score >= 90 && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-100 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                    <Sparkles className="w-3 h-3" /> TOP RATED
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">{candidate.role || 'Candidate'}</p>
                                    </div>

                                    {/* AI Score Badge */}
                                    {candidate.score && (
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs text-slate-400 font-medium mb-1">AI Score</span>
                                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold text-sm ${candidate.score >= 90 ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' :
                                                candidate.score >= 80 ? 'border-blue-500 text-blue-500 bg-blue-500/10' :
                                                    'border-slate-500 text-slate-500 bg-slate-500/10'
                                                }`}>
                                                {candidate.score}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500 dark:text-slate-400 md:px-4 md:border-l md:border-r border-slate-200 dark:border-white/10">
                                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {candidate.email}</span>
                                        {candidate.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {candidate.location}</span>}
                                    </div>

                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[candidate.status as keyof typeof statusColors] || statusColors.Applied}`}>
                                        {candidate.status.toUpperCase()}
                                    </div>

                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="w-5 h-5 text-slate-400 hover:text-blue-500" />
                                    </Button>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </PageTransition>
    );
};

