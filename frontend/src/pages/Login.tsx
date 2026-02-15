import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { User, Briefcase, Eye, EyeOff, UserPlus } from 'lucide-react';
import { authEndpoints } from '../lib/api';
import { getDashboardPath } from '../lib/redirects';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';

export const Login = () => {
    const [role, setRole] = useState<'candidate' | 'hr'>('candidate');
    const { login } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [showSignupPrompt, setShowSignupPrompt] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setShowSignupPrompt(false);

        try {
            const response = await authEndpoints.login({ email, password });
            login(response.data);
            navigate(getDashboardPath(response.data.user.role));
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
                const detail = axiosErr.response?.data?.detail || '';
                const status = axiosErr.response?.status;

                // Show signup prompt for 401 errors (user not found or wrong password)
                if (status === 401) {
                    if (detail.toLowerCase().includes('google sign-in')) {
                        setError(detail);
                    } else {
                        // For "Invalid email or password" - show helpful message for candidates
                        setError('Invalid email or password. If you don\'t have an account yet, please sign up below.');
                        if (role === 'candidate') {
                            setShowSignupPrompt(true);
                        }
                    }
                } else {
                    setError(detail || 'An error occurred. Please try again.');
                }
            } else {
                setError('An error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        if (!credentialResponse.credential) {
            setError('Google sign-in failed – no credential received');
            return;
        }

        setLoading(true);
        setError('');
        setShowSignupPrompt(false);

        try {
            const response = await authEndpoints.googleAuth(credentialResponse.credential);
            login(response.data);
            navigate(getDashboardPath(response.data.user.role));
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { detail?: string } } };
                setError(axiosErr.response?.data?.detail || 'Google sign-in failed');
            } else {
                setError('An error occurred during Google sign-in.');
            }
        } finally {
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
                            Welcome Back
                        </h1>
                        <p className="text-slate-400">Sign in to your account</p>
                    </div>

                    {/* Role Selector */}
                    <div className="flex gap-4 mb-8 p-1 bg-slate-800/50 rounded-xl relative">
                        <button
                            onClick={() => { setRole('candidate'); setError(''); setShowSignupPrompt(false); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all relative z-10 ${
                                role === 'candidate' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <User className="w-4 h-4" /> Candidate
                        </button>
                        <button
                            onClick={() => { setRole('hr'); setError(''); setShowSignupPrompt(false); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all relative z-10 ${
                                role === 'hr' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
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
                                width: 'calc(50% - 6px)',
                            }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white"
                                placeholder={role === 'hr' ? 'hr@company.com' : 'you@example.com'}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white pr-12"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                {error}
                            </div>
                        )}

                        {/* Signup prompt when user is not found */}
                        {showSignupPrompt && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-500/30 rounded-xl p-5 text-center shadow-lg"
                            >
                                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <UserPlus className="w-6 h-6 text-blue-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">
                                    New to TalentAI?
                                </h3>
                                <p className="text-sm text-slate-300 mb-4">
                                    Create a free account to start applying for jobs and get AI-powered career matching.
                                </p>
                                <Link
                                    to="/register"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                    <UserPlus className="w-4 h-4" /> Create Account
                                </Link>
                            </motion.div>
                        )}

                        <Button type="submit" className="w-full" isLoading={loading}>
                            Sign In
                        </Button>
                    </form>

                    {/* Google Sign-In & Signup – only for candidates */}
                    {role === 'candidate' && (
                        <>
                            <div className="flex items-center gap-4 my-6">
                                <div className="flex-1 h-px bg-slate-700" />
                                <span className="text-sm text-slate-500">or</span>
                                <div className="flex-1 h-px bg-slate-700" />
                            </div>

                            <div className="flex justify-center">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setError('Google sign-in failed')}
                                    theme="filled_black"
                                    shape="pill"
                                    size="large"
                                    width="360"
                                    text="signin_with"
                                />
                            </div>

                            <div className="mt-6 text-center text-sm text-slate-500">
                                Don't have an account?{' '}
                                <Link to="/register" className="text-blue-400 hover:underline">
                                    Sign up
                                </Link>
                            </div>
                        </>
                    )}
                </Card>
            </motion.div>
        </div>
    );
};
