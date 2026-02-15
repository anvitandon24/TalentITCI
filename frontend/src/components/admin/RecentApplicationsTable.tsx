import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown } from 'lucide-react';

interface RecentApplication {
    id: number;
    candidate_name: string;
    job_title: string;
    applied_date: string | null;
    status: string;
}

interface RecentApplicationsTableProps {
    data: RecentApplication[];
}

const statusColors: Record<string, string> = {
    Applied: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    Screening: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    Shortlisted: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    Interview: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    Offer: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Hired: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
};

type SortKey = 'candidate_name' | 'job_title' | 'applied_date' | 'status';

export const RecentApplicationsTable = ({ data }: RecentApplicationsTableProps) => {
    const [sortKey, setSortKey] = useState<SortKey>('applied_date');
    const [sortAsc, setSortAsc] = useState(false);

    const handleSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortAsc(!sortAsc);
        } else {
            setSortKey(key);
            setSortAsc(true);
        }
    };

    const sorted = [...data].sort((a, b) => {
        const aVal = a[sortKey] ?? '';
        const bVal = b[sortKey] ?? '';
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortAsc ? cmp : -cmp;
    });

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl border border-slate-700/50 overflow-hidden"
        >
            <div className="p-6 pb-4">
                <h3 className="text-lg font-semibold text-white mb-1">Recent Applications</h3>
                <p className="text-sm text-slate-400">Latest 10 applications across all jobs</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-t border-b border-slate-700/50">
                            {[
                                { key: 'candidate_name' as SortKey, label: 'Candidate' },
                                { key: 'job_title' as SortKey, label: 'Job Title' },
                                { key: 'applied_date' as SortKey, label: 'Date Applied' },
                                { key: 'status' as SortKey, label: 'Status' },
                            ].map((col) => (
                                <th
                                    key={col.key}
                                    onClick={() => handleSort(col.key)}
                                    className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3 cursor-pointer hover:text-slate-200 transition-colors select-none"
                                >
                                    <div className="flex items-center gap-1.5">
                                        {col.label}
                                        <ArrowUpDown className="w-3 h-3" />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center text-slate-500 py-12">
                                    No applications found
                                </td>
                            </tr>
                        ) : (
                            sorted.map((app, idx) => (
                                <tr
                                    key={app.id}
                                    className={`border-b border-slate-800/30 hover:bg-white/[0.02] transition-colors ${
                                        idx === sorted.length - 1 ? 'border-b-0' : ''
                                    }`}
                                >
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-medium text-slate-200">
                                            {app.candidate_name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-300">{app.job_title}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-400">
                                            {formatDate(app.applied_date)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                                statusColors[app.status] ||
                                                'bg-slate-500/15 text-slate-400 border-slate-500/30'
                                            }`}
                                        >
                                            {app.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};
