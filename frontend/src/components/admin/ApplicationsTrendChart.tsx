import { motion } from 'framer-motion';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface TrendData {
    date: string;
    count: number;
}

interface ApplicationsTrendChartProps {
    data: TrendData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-sm font-semibold text-white">
                    {payload[0].value} applications
                </p>
            </div>
        );
    }
    return null;
};

export const ApplicationsTrendChart = ({ data }: ApplicationsTrendChartProps) => {
    const formatted = data.map((d) => ({
        ...d,
        label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 border border-slate-700/50"
        >
            <h3 className="text-lg font-semibold text-white mb-1">Applications Trend</h3>
            <p className="text-sm text-slate-400 mb-6">Last 30 days</p>

            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                            dataKey="label"
                            stroke="#475569"
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            interval={4}
                        />
                        <YAxis
                            stroke="#475569"
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorApps)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};
