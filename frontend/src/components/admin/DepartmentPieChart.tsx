import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DepartmentData {
    department: string;
    count: number;
    percentage: number;
}

interface DepartmentPieChartProps {
    data: DepartmentData[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316'];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                <p className="text-sm font-semibold text-white">{payload[0].name}</p>
                <p className="text-xs text-slate-400">
                    {payload[0].value} applications ({payload[0].payload.percentage}%)
                </p>
            </div>
        );
    }
    return null;
};

export const DepartmentPieChart = ({ data }: DepartmentPieChartProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 border border-slate-700/50"
        >
            <h3 className="text-lg font-semibold text-white mb-1">By Department</h3>
            <p className="text-sm text-slate-400 mb-6">Application distribution</p>

            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="count"
                            nameKey="department"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            stroke="none"
                        >
                            {data.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="space-y-2 mt-4">
                {data.map((item, index) => (
                    <div key={item.department} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-slate-300">{item.department}</span>
                        </div>
                        <span className="text-slate-400">{item.percentage}%</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};
