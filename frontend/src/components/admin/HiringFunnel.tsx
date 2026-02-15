import { motion } from 'framer-motion';

interface FunnelData {
    applied: number;
    shortlisted: number;
    interview: number;
    hired: number;
    shortlist_rate: number;
    interview_rate: number;
    hire_rate: number;
}

interface HiringFunnelProps {
    data: FunnelData;
}

const stages = [
    { key: 'applied' as const, label: 'Applied', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-500', width: '100%' },
    { key: 'shortlisted' as const, label: 'Shortlisted', color: 'from-purple-500 to-purple-600', bg: 'bg-purple-500', width: '75%' },
    { key: 'interview' as const, label: 'Interview', color: 'from-amber-500 to-amber-600', bg: 'bg-amber-500', width: '50%' },
    { key: 'hired' as const, label: 'Hired', color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-500', width: '30%' },
];

const rateKeys: Record<string, string> = {
    shortlisted: 'shortlist_rate',
    interview: 'interview_rate',
    hired: 'hire_rate',
};

export const HiringFunnel = ({ data }: HiringFunnelProps) => {
    const maxCount = Math.max(data.applied, 1);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 border border-slate-700/50"
        >
            <h3 className="text-lg font-semibold text-white mb-1">Hiring Funnel</h3>
            <p className="text-sm text-slate-400 mb-6">Conversion through stages</p>

            <div className="space-y-4">
                {stages.map((stage, idx) => {
                    const count = data[stage.key];
                    const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    const rateKey = rateKeys[stage.key] as keyof FunnelData | undefined;
                    const rate = rateKey ? (data[rateKey] as number) : null;

                    return (
                        <motion.div
                            key={stage.key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${stage.bg}`} />
                                    <span className="text-sm font-medium text-slate-200">
                                        {stage.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-white">
                                        {count.toLocaleString()}
                                    </span>
                                    {rate !== null && (
                                        <span className="text-xs text-slate-400">
                                            {rate}% conv.
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(widthPercent, 2)}%` }}
                                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                                    className={`h-full rounded-full bg-gradient-to-r ${stage.color}`}
                                />
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
};
