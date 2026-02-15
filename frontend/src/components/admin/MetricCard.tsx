import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: number;
    change: number;
    icon: LucideIcon;
    color: 'blue' | 'green' | 'purple' | 'orange';
}

const colorMap = {
    blue: {
        bg: 'bg-blue-600/15',
        icon: 'text-blue-400',
        border: 'border-blue-500/20',
        glow: 'shadow-blue-500/5',
    },
    green: {
        bg: 'bg-emerald-600/15',
        icon: 'text-emerald-400',
        border: 'border-emerald-500/20',
        glow: 'shadow-emerald-500/5',
    },
    purple: {
        bg: 'bg-purple-600/15',
        icon: 'text-purple-400',
        border: 'border-purple-500/20',
        glow: 'shadow-purple-500/5',
    },
    orange: {
        bg: 'bg-orange-600/15',
        icon: 'text-orange-400',
        border: 'border-orange-500/20',
        glow: 'shadow-orange-500/5',
    },
};

export const MetricCard = ({ title, value, change, icon: Icon, color }: MetricCardProps) => {
    const colors = colorMap[color];
    const isPositive = change >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass rounded-2xl p-5 border ${colors.border} shadow-lg ${colors.glow} relative overflow-hidden`}
        >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${colors.bg}`}>
                        <Icon className={`w-6 h-6 ${colors.icon}`} />
                    </div>
                    <div
                        className={`flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-full ${
                            isPositive
                                ? 'text-emerald-400 bg-emerald-500/10'
                                : 'text-red-400 bg-red-500/10'
                        }`}
                    >
                        {isPositive ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        <span>{Math.abs(change)}%</span>
                    </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                    {value.toLocaleString()}
                </p>
                <p className="text-sm text-slate-400">{title}</p>
            </div>
        </motion.div>
    );
};
