import { motion } from 'framer-motion';
import { Briefcase, MapPin, DollarSign, Clock } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageTransition } from '../components/PageTransition';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { endpoints } from '../lib/api';
import { X } from 'lucide-react';

interface Job {
    id: number;
    title: string;
    department: string;
    location: string;
    type: string;
    applicants: number;
    posted: string;
    status: string;
}

export const Jobs = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newJob, setNewJob] = useState({ title: '', department: '', location: 'Remote', type: 'Full-time' });

    useEffect(() => {
        loadJobs();
    }, []);

    const loadJobs = async () => {
        try {
            const response = await endpoints.getJobs();
            setJobs(response.data);
        } catch (error) {
            console.error('Failed to load jobs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateJob = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await endpoints.createJob(newJob);
            setShowCreateModal(false);
            setNewJob({ title: '', department: '', location: 'Remote', type: 'Full-time' });
            loadJobs();
        } catch (error) {
            console.error("Failed to create job", error);
        }
    }

    return (
        <PageTransition>
            <div className="space-y-6 relative">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Open Positions</h1>
                        <p className="text-slate-500 dark:text-slate-400">Manage job listings and track applications.</p>
                    </div>
                    {user?.role === 'hr' &&
                        <Button onClick={() => setShowCreateModal(true)}>Create Job</Button>
                    }
                </div>

                {isLoading ? (
                    <div className="text-center text-slate-500 py-10">Loading jobs...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {jobs.map((job, index) => (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="hover:border-blue-500/30 transition-colors cursor-pointer group h-full flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-xs font-medium text-blue-500 dark:text-blue-400 mb-1 block">{job.department}</span>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">{job.title}</h3>
                                        </div>
                                        <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20 transition-colors">
                                            <Briefcase className="w-5 h-5 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-6 flex-1">
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                            <MapPin className="w-4 h-4" /> {job.location}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                            <Clock className="w-4 h-4" /> {job.type}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                            <DollarSign className="w-4 h-4" /> Competitive Salary
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                                        {user?.role === 'hr' ? (
                                            <>
                                                <div className="text-sm">
                                                    <span className="text-slate-900 dark:text-white font-medium">{job.applicants}</span>
                                                    <span className="text-slate-500 ml-1">Applicants</span>
                                                </div>
                                                <span className="text-xs text-slate-500">{job.posted}</span>
                                            </>
                                        ) : (
                                            <Button
                                                className="w-full"
                                                onClick={() => navigate(`/apply/${job.id}`)}
                                            >
                                                Apply Now
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

            </div>

                {/* Portal modal — rendered at document.body to escape overflow/transform clipping */}
                {showCreateModal && createPortal(
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">Post New Job</h2>
                                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleCreateJob} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Job Title</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={newJob.title}
                                        onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Department</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={newJob.department}
                                        onChange={e => setNewJob({ ...newJob, department: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Location</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            value={newJob.location}
                                            onChange={e => setNewJob({ ...newJob, location: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Type</label>
                                        <select
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            value={newJob.type}
                                            onChange={e => setNewJob({ ...newJob, type: e.target.value })}
                                        >
                                            <option>Full-time</option>
                                            <option>Contract</option>
                                            <option>Part-time</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <Button type="submit">Create Job</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>,
                    document.body
                )}
        </PageTransition>
    );
};
