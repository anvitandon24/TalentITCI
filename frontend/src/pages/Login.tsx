import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { User, Briefcase } from 'lucide-react';
import { endpoints } from '../lib/api';

export const Login = () => {
    const [role, setRole] = useState<'candidate' | 'hr'>('candidate');
    const [isSignup, setIsSignup] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isSignup) {
                // Signup flow — create user in backend
                const response = await endpoints.signup({ name, email, role });
                if (response.data.error) {
                    setError(response.data.error);
                    setLoading(false);
                    return;
                }

                const u = response.data.user;
                login(role, {
                    id: String(u.id),
                    name: u.name,
                    email: u.email,
                    candidate_id: u.candidate_id,
                });
                setLoading(false);
                navigate(role === 'hr' ? '/dashboard' : '/candidate-dashboard');
            } else {
                // Login flow — try signup endpoint to find existing user,
                // or just authenticate with provided email
                const response = await endpoints.signup({ name: name || 'User', email, role });
                if (response.data.error) {
                    // User already exists — that's expected for login
                    // Fetch candidates to find the user's candidate_id
                    if (role === 'candidate') {
                        const candidatesRes = await endpoints.getCandidates();
                        const candidate = candidatesRes.data.find(
                            (c: { email: string }) => c.email === email
                        );
                        if (candidate) {
                            login(role, {
                                id: String(candidate.id),
                                name: candidate.name,
                                email: candidate.email,
                                candidate_id: candidate.id,
                            });
                        } else {
                            setError('No candidate account found with this email.');
                            setLoading(false);
                            return;
                        }
                    } else {
                        // HR login — just use the email
                        login(role, {
                            id: '0',
                            name: name || 'HR Manager',
                            email: email,
                        });
                    }
                } else {
                    // New user was created (shouldn't happen on login, but handle gracefully)
                    const u = response.data.user;
                    login(role, {
                        id: String(u.id),
                        name: u.name,
                        email: u.email,
                        candidate_id: u.candidate_id,
                    });
                }
                setLoading(false);
                navigate(role === 'hr' ? '/dashboard' : '/candidate-dashboard');
            }
        } catch (err) {
            console.error('Auth error:', err);
            setError('An error occurred. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full bg-slate-950 -z-20" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] -z-10" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="border-t-4 border-t-blue-500">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                            {isSignup ? 'Create Account' : 'Welcome Back'}
                        </h1>
                        <p className="text-slate-400">
                            {isSignup ? 'Sign up to get started' : 'Sign in to your account'}
                        </p>
                    </div>

                    <div className="flex gap-4 mb-8 p-1 bg-slate-800/50 rounded-xl relative">
                        <button
                            onClick={() => setRole('candidate')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all relative z-10 ${role === 'candidate' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <User className="w-4 h-4" /> Candidate
                        </button>
                        <button
                            onClick={() => setRole('hr')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all relative z-10 ${role === 'hr' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <Briefcase className="w-4 h-4" /> HR Manager
                        </button>

                        {/* Sliding Background */}
                        <motion.div
                            layout
                            className="absolute top-1 bottom-1 bg-blue-600 rounded-lg shadow-lg"
                            initial={false}
                            animate={{
                                left: role === 'candidate' ? '4px' : '50%',
                                width: 'calc(50% - 6px)'
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignup && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white"
                                    placeholder="John Doe"
                                />
                            </div>
                        )}

                        {!isSignup && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white"
                                    placeholder="Your name (optional)"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white"
                                placeholder={role === 'hr' ? 'hr@company.com' : 'you@example.com'}
                            />
                        </div>

                        {error && (
                            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full" isLoading={loading}>
                            {isSignup ? 'Sign Up' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        {isSignup ? 'Already have an account? ' : "Don't have an account? "}
                        <span
                            onClick={() => { setIsSignup(!isSignup); setError(''); }}
                            className="text-blue-400 hover:underline cursor-pointer"
                        >
                            {isSignup ? 'Sign in' : 'Sign up'}
                        </span>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
};
