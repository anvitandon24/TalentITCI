import { useState, ChangeEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ChevronRight, Check } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageTransition } from '../components/PageTransition';
import { useParams, useNavigate } from 'react-router-dom';
import { endpoints, Job } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export const ApplyJob = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: '',
        location: '',
        linkedin: ''
    });

    useEffect(() => {
        const fetchJob = async () => {
            if (!jobId) return;
            try {
                const response = await endpoints.getJob(parseInt(jobId));
                setJob(response.data);
            } catch (error) {
                console.error('Failed to load job:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [jobId]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const nextStep = () => setStep(step + 1);

    const handleSubmit = async () => {
        if (!user || !jobId) return;

        const candidateId = user.candidate_id ?? parseInt(user.id);
        setSubmitting(true);
        try {
            // Submit application
            const response = await endpoints.applyToJob(candidateId, parseInt(jobId));

            // Upload resume if provided
            if (file) {
                await endpoints.uploadResume(candidateId, file);
            }

            // Show confirmation
            setShowConfirmation(true);

            // Redirect after 3 seconds
            setTimeout(() => {
                navigate('/applications');
            }, 3000);
        } catch (error: unknown) {
            console.error('Failed to submit application:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosErr = error as { response?: { status?: number; data?: { detail?: string } } };
                if (axiosErr.response?.status === 409) {
                    alert('You have already applied to this job.');
                } else {
                    alert(axiosErr.response?.data?.detail || 'Failed to submit application. Please try again.');
                }
            } else {
                alert('Failed to submit application. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <PageTransition className="min-h-screen flex items-center justify-center">
                <div className="text-slate-400">Loading job details...</div>
            </PageTransition>
        );
    }

    if (!job) {
        return (
            <PageTransition className="min-h-screen flex items-center justify-center">
                <div className="text-slate-400">Job not found</div>
            </PageTransition>
        );
    }

    if (showConfirmation) {
        return (
            <PageTransition className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center py-12">
                    <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
                    <p className="text-slate-400 mb-4">
                        Your application for <span className="text-white font-semibold">{job.title}</span> has been successfully submitted.
                    </p>
                    <p className="text-sm text-slate-500">Redirecting to your applications...</p>
                </Card>
            </PageTransition>
        );
    }

    return (
        <PageTransition className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold">Apply for {job.title}</h1>
                        <span className="text-slate-400 text-sm">Step {step} of 3</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(step / 3) * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>

                <AnimatePresence mode='wait'>
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-white"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-white"
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-white"
                                        placeholder="+1 234 567 890"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Location</label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 text-white"
                                        placeholder="City, Country"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end mt-6">
                                <Button onClick={nextStep} rightIcon={<ChevronRight className="w-4 h-4" />}>Next Step</Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <h2 className="text-xl font-semibold">Resume & Experience</h2>

                            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors bg-slate-800/20">
                                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-4" />
                                <p className="text-lg font-medium mb-1">Upload your Resume</p>
                                <p className="text-slate-400 text-sm mb-4">PDF, DOCX up to 10MB</p>
                                <input
                                    type="file"
                                    id="resume"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleFileChange}
                                />
                                <Button variant="outline" onClick={() => document.getElementById('resume')?.click()}>
                                    {file ? file.name : "Select File"}
                                </Button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">LinkedIn URL</label>
                                <input
                                    type="url"
                                    name="linkedin"
                                    value={formData.linkedin}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    placeholder="https://linkedin.com/in/..."
                                />
                            </div>

                            <div className="flex justify-between mt-6">
                                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                                <Button onClick={nextStep} rightIcon={<ChevronRight className="w-4 h-4" />}>Review Application</Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="text-center py-8"
                        >
                            <div className="w-20 h-20 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Check className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Application Ready</h2>
                            <p className="text-slate-400 mb-8">Please review your details before submitting.</p>

                            <div className="flex justify-center gap-4">
                                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                                <Button
                                    onClick={handleSubmit}
                                    isLoading={submitting}
                                    className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                                >
                                    Submit Application
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </PageTransition>
    );
};
