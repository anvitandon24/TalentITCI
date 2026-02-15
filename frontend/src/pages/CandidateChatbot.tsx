import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Bot, Loader2, Sparkles, FileText, Building2, Briefcase,
    ArrowRight, MapPin, Clock, BookOpen, Upload, Check, AlertCircle
} from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api, endpoints } from '../lib/api';

// ... (existing imports)

// ... (existing types)

// ... (existing SourceBadge and JobCard components)

// Inside the component ...


// ── Types ────────────────────────────────────────────────────────────────

interface RecommendedJob {
    id: number;
    title: string;
    department: string;
    location: string;
    type: string;
    relevance_score: number;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: string[];
    recommended_jobs?: RecommendedJob[];
}

// ── Suggested Questions ──────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
    "Which jobs should I apply for?",
    "What skills am I missing for top roles?",
    "How can I improve my chances?",
    "What does this company do?",
];

// ── Source Badge Component ───────────────────────────────────────────────

const SourceBadge = ({ source }: { source: string }) => {
    const config: Record<string, { icon: typeof FileText; color: string; label: string }> = {
        resume: { icon: FileText, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', label: 'Resume' },
        company: { icon: Building2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', label: 'Company' },
        job: { icon: Briefcase, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', label: 'Job' },
    };

    const cfg = config[source] || { icon: BookOpen, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30', label: source };
    const Icon = cfg.icon;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    );
};

// ── Job Recommendation Card ──────────────────────────────────────────────

const JobCard = ({ job, onApply }: { job: RecommendedJob; onApply: (id: number) => void }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 hover:border-purple-500/30 transition-all cursor-pointer group"
    >
        <div className="flex justify-between items-start mb-1.5">
            <h4 className="font-semibold text-sm text-white group-hover:text-purple-400 transition-colors">{job.title}</h4>
            <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md whitespace-nowrap ml-2">
                {Math.round(job.relevance_score * 100)}% match
            </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.department}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
            {job.type && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.type}</span>}
        </div>
        <button
            onClick={() => onApply(job.id)}
            className="w-full py-1.5 text-xs font-medium text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-colors flex items-center justify-center gap-1"
        >
            View & Apply <ArrowRight className="w-3 h-3" />
        </button>
    </motion.div>
);

// ── Main Component ───────────────────────────────────────────────────────

export const CandidateChatbot = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const candidateId = user?.candidate_id ?? parseInt(user?.id || '0');

    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: `Hi ${user?.name || 'there'}! 👋 I'm your AI Career Assistant. I can help you:\n\n• Find jobs that match your skills\n• Analyze your fit for specific roles\n• Explain company policies and culture\n• Suggest areas to improve\n\nMake sure your resume is uploaded for personalized advice!`,
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset status
        setUploading(true);
        setUploadStatus('idle');

        try {
            await endpoints.uploadResume(candidateId, file);
            setUploadStatus('success');

            // Add system message
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I've received your updated resume. I can now provide more personalized advice based on your latest experience and skills.",
            }]);
        } catch (error) {
            console.error('Upload error:', error);
            setUploadStatus('error');
        } finally {
            setUploading(false);
            // Clear success message after 3 seconds
            setTimeout(() => {
                if (uploadStatus === 'success') {
                    setUploadStatus('idle');
                }
            }, 5000);
        }
    };

    const handleSend = async (text: string = input) => {
        if (!text.trim() || loading) return;

        const userMessage: Message = { role: 'user', content: text };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Build history from existing messages (exclude current)
            const history = messages.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content,
            }));

            const response = await api.post('/candidate-ai/chat', {
                candidate_id: candidateId,
                message: text,
                history,
            });

            const data = response.data;
            const botMessage: Message = {
                role: 'assistant',
                content: data.answer,
                sources: data.sources,
                recommended_jobs: data.recommended_jobs,
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: "I'm having trouble connecting right now. Please make sure the backend is running and try again.",
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="flex flex-col h-[calc(100vh-2rem)] max-w-4xl mx-auto p-4">
                {/* Header */}
                <div className="mb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-purple-500/20">
                                <Sparkles className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                    Career AI Assistant
                                </h1>
                                <p className="text-xs text-slate-400">Powered by RAG &amp; AI • Personalized career guidance</p>
                            </div>
                        </div>

                        {/* Resume Upload Section */}
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                            />

                            {uploadStatus === 'success' && (
                                <motion.span
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-xs font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20"
                                >
                                    <Check className="w-3 h-3" /> Uploaded
                                </motion.span>
                            )}

                            {uploadStatus === 'error' && (
                                <motion.span
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-xs font-medium text-red-400 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20"
                                >
                                    <AlertCircle className="w-3 h-3" /> Error
                                </motion.span>
                            )}

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500/30 rounded-lg text-xs font-medium text-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {uploading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                                ) : (
                                    <Upload className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300" />
                                )}
                                {uploading ? 'Uploading...' : 'Update Resume'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <AnimatePresence>
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[80%] ${msg.role === 'user' ? '' : 'flex gap-3'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center mt-1">
                                            <Bot className="w-4 h-4 text-purple-400" />
                                        </div>
                                    )}
                                    <div>
                                        <div
                                            className={`p-3.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-sm'
                                                : 'bg-slate-800/70 border border-slate-700/50 text-slate-200 rounded-bl-sm'
                                                }`}
                                        >
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>

                                        {/* Source badges */}
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="flex gap-1.5 mt-2 ml-1">
                                                {msg.sources.map((s, i) => (
                                                    <SourceBadge key={i} source={s} />
                                                ))}
                                            </div>
                                        )}

                                        {/* Recommended jobs */}
                                        {msg.recommended_jobs && msg.recommended_jobs.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                <p className="text-xs font-medium text-slate-400 ml-1 flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3 text-purple-400" />
                                                    Recommended Jobs
                                                </p>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {msg.recommended_jobs.map(job => (
                                                        <JobCard
                                                            key={job.id}
                                                            job={job}
                                                            onApply={(id) => navigate(`/apply/${id}`)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-purple-400" />
                                </div>
                                <div className="bg-slate-800/70 border border-slate-700/50 p-3.5 rounded-2xl rounded-bl-sm">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                        <span className="text-sm text-slate-400">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Suggested Questions (only show initially) */}
                {messages.length === 1 && (
                    <div className="mb-3">
                        <p className="text-xs text-slate-500 mb-2 font-medium">Try asking:</p>
                        <div className="flex flex-wrap gap-2">
                            {SUGGESTED_QUESTIONS.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(q)}
                                    className="text-xs bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white px-3 py-2 rounded-xl transition-all border border-slate-700/50 hover:border-purple-500/30"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-2">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        className="flex items-center gap-2"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about jobs, your fit, company info..."
                            className="flex-1 px-4 py-2.5 bg-transparent border-none focus:outline-none text-sm text-white placeholder-slate-500"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </PageTransition>
    );
};
