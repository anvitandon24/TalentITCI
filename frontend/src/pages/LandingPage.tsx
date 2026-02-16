import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import {
    BarChart3,
    BrainCircuit,
    Files,
    Globe,
    ShieldCheck,
    Zap,
    ArrowRight,
    TrendingUp
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { endpoints } from '../lib/api';

export const LandingPage = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ candidates: 0, jobs: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [candidatesRes, jobsRes] = await Promise.all([
                    endpoints.getCandidates(),
                    endpoints.getJobs()
                ]);
                setStats({
                    candidates: candidatesRes.data.length || 124,
                    jobs: jobsRes.data.length || 12
                });
            } catch (error) {
                console.error("Failed to fetch stats", error);
                // Fallback mock data if backend not running
                setStats({ candidates: 124, jobs: 8 });
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100 overflow-hidden font-sans selection:bg-blue-500/30">

            {/* Ticker Tape */}
            <div className="w-full bg-slate-900/50 backdrop-blur-md border-b border-white/5 py-2 overflow-hidden flex whitespace-nowrap">
                <motion.div
                    animate={{ x: [0, -1000] }}
                    transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                    className="flex items-center gap-12 text-xs font-mono text-blue-400"
                >
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> SYSTEM OPERATIONAL</span>
                    <span className="flex items-center gap-2">LIVE CANDIDATES: {stats.candidates}</span>
                    <span className="flex items-center gap-2">OPEN POSITIONS: {stats.jobs}</span>
                    <span className="flex items-center gap-2">AI ENGINE: ONLINE</span>
                    <span className="flex items-center gap-2">RESUME PARSING: ACTIVE</span>
                    <span className="flex items-center gap-2 text-emerald-400"><TrendingUp className="w-3 h-3" /> HIRING VELOCITY +24%</span>
                    {/* Duplicate for seamless loop */}
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> SYSTEM OPERATIONAL</span>
                    <span className="flex items-center gap-2">LIVE CANDIDATES: {stats.candidates}</span>
                    <span className="flex items-center gap-2">OPEN POSITIONS: {stats.jobs}</span>
                    <span className="flex items-center gap-2">AI ENGINE: ONLINE</span>
                </motion.div>
            </div>

            {/* Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

            {/* Ambient Glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none" />

            {/* Navbar */}
            <nav className="relative z-50 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-tr from-blue-500 to-purple-600 p-2 rounded-lg">
                        <BrainCircuit className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-3xl md:text-4xl font-extrabold">
                        <span className="text-white">Talent</span>
                        <span className="ml-1 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400">
                            AI
                        </span>
                    </span>
                </div>
                <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
                    <a href="#features" className="hover:text-white transition-colors">Platform</a>
                    <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
                    <a href="#pricing" className="hover:text-white transition-colors">Enterprise</a>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => navigate('/login')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                        Login
                    </button>
                    <Button onClick={() => navigate('/login')} variant="primary" size="sm" className="bg-blue-600 hover:bg-blue-500 border-none shadow-lg shadow-blue-500/20">
                        Get Started
                    </Button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-xs font-medium"
                    >
                        <Zap className="w-3 h-3" />
                        <span>Next Gen Hiring Intelligence</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-7xl font-bold leading-tight"
                    >
                        The Future of <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400">
                            Talent Acquisition
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-slate-400 max-w-lg leading-relaxed"
                    >
                        Automate screening, rank candidates with AI, and make data-driven hiring decisions 10x faster.
                        The intelligent platform for modern HR teams.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-wrap gap-4"
                    >
                        <Button onClick={() => navigate('/login')} size="lg" className="h-12 px-8 text-base bg-white text-slate-900 hover:bg-slate-200">
                            Start Free Trial <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                        <Button onClick={() => navigate('/jobs')} variant="outline" size="lg" className="h-12 px-8 text-base border-slate-700 hover:bg-slate-800">
                            View Jobs
                        </Button>
                    </motion.div>

                    <div className="flex gap-8 pt-8 border-t border-white/5">
                        <div>
                            <p className="text-2xl font-bold text-white">98%</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Placement Rate</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">500+</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Enterprise Clients</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">24/7</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">AI Availability</p>
                        </div>
                    </div>
                </div>

                {/* Visual / Glass Card Stack */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="relative hidden lg:block"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/30 to-purple-600/30 rounded-3xl blur-3xl -z-10" />

                    {/* Speculative UI Mockup */}
                    <div className="relative bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                            </div>
                            <div className="text-xs text-slate-500 font-mono">AI_ANALYSIS_V2.0</div>
                        </div>

                        {/* <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                                        {i * 92}%
                                    </div>
                                    <div className="flex-1">
                                        <div className="h-2 w-24 bg-slate-700 rounded mb-2" />
                                        <div className="h-2 w-16 bg-slate-800 rounded" />
                                    </div>
                                    <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                                        Recommended
                                    </div>
                                </div>
                            ))}
                        </div> */}
                        <div className="space-y-4">
                            {[
                                { score: 92, status: "Recommended" },
                                { score: 64, status: "Under Review" },
                                { score: 38, status: "Rejected" },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5"
                                >
                                    {/* Score */}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                                        {item.score}%
                                    </div>

                                    {/* Placeholder bars */}
                                    <div className="flex-1">
                                        <div className="h-2 w-24 bg-slate-700 rounded mb-2" />
                                        <div className="h-2 w-16 bg-slate-800 rounded" />
                                    </div>

                                    {/* Status badge */}
                                    <div
                                        className={`px-2 py-1 text-xs rounded
                                ${item.status === "Recommended"
                                                ? "bg-emerald-500/20 text-emerald-400"
                                                : item.status === "Under Review"
                                                    ? "bg-yellow-500/20 text-yellow-400"
                                                    : "bg-red-500/20 text-red-400"
                                            }`}
                                    >
                                        {item.status}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 p-4 bg-blue-600/20 border border-blue-500/30 rounded-xl">
                            <div className="flex items-center gap-3 text-blue-400 mb-2">
                                <BrainCircuit className="w-5 h-5" />
                                <span className="text-sm font-semibold">AI Insight</span>
                            </div>
                            <p className="text-xs text-slate-300">
                                Candidate matching algorithm has identified 3 top-tier profiles for "Senior Full Stack Dev" based on skill adjacency and experience.
                            </p>
                        </div>
                    </div>

                    {/* Floating Elements */}
                    <div className="absolute -top-12 -right-8 p-4 bg-slate-800/80 backdrop-blur-lg rounded-xl border border-white/10 shadow-xl animate-float">
                        <Globe className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="absolute -bottom-8 -left-8 p-4 bg-slate-800/80 backdrop-blur-lg rounded-xl border border-white/10 shadow-xl animate-float-delayed">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    </div>
                </motion.div>
            </main>

            {/* Feature Section */}
            <section id="features" className="relative z-10 py-24 border-t border-white/5 bg-slate-900/30">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Intelligence at Scale</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            Powering the world's most innovative hiring teams with enterprise-grade AI.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: Files, title: "Resume Parsing", desc: "Automated extraction of skills, experience, and education from any format." },
                            { icon: BrainCircuit, title: "AI Ranking", desc: "Context-aware candidate scoring based on job descriptions and cultural fit." },
                            { icon: BarChart3, title: "Predictive Analytics", desc: "Forecast hiring needs and optimize your pipeline with real-time data." }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -5 }}
                                className="p-8 bg-slate-800/50 backdrop-blur-sm border border-white/5 rounded-2xl hover:bg-slate-800/80 transition-colors group"
                            >
                                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

        </div>
    );
};
