import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    X,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Shuffle,
    AlertTriangle,
} from 'lucide-react';
import { Button } from '../components/Button';
import { adminEndpoints, type HRUser } from '../lib/api';
import toast, { Toaster } from 'react-hot-toast';

// ─── Password Generator ──────────────────────────────────────────────────

function generatePassword(): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*';
    const all = upper + lower + digits + special;

    let pw = '';
    pw += upper[Math.floor(Math.random() * upper.length)];
    pw += lower[Math.floor(Math.random() * lower.length)];
    pw += digits[Math.floor(Math.random() * digits.length)];
    pw += special[Math.floor(Math.random() * special.length)];
    for (let i = 4; i < 12; i++) {
        pw += all[Math.floor(Math.random() * all.length)];
    }
    return pw
        .split('')
        .sort(() => Math.random() - 0.5)
        .join('');
}

// ─── Validation ──────────────────────────────────────────────────────────

function validatePassword(pw: string): string | null {
    if (pw.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pw)) return 'Must contain an uppercase letter';
    if (!/\d/.test(pw)) return 'Must contain a number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return 'Must contain a special character';
    return null;
}

function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Main Component ─────────────────────────────────────────────────────

export const ManageHR = () => {
    const [hrUsers, setHrUsers] = useState<HRUser[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState<HRUser | null>(null);

    // ─── Fetch HR List ───────────────────────────────────────────────────

    const fetchHR = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, per_page: 10 };
            if (search) params.search = search;

            const response = await adminEndpoints.listHR(params as any);
            setHrUsers(response.data.items);
            setTotal(response.data.total);
            setTotalPages(response.data.total_pages);
        } catch (err) {
            toast.error('Failed to load HR managers');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        fetchHR();
    }, [fetchHR]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setPage(1);
    }, [search]);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    // ─── Delete Handler ─────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!selectedUser) return;
        try {
            await adminEndpoints.deleteHR(selectedUser.id);
            toast.success('HR Manager deleted successfully');
            setShowDeleteDialog(false);
            setSelectedUser(null);
            fetchHR();
        } catch {
            toast.error('Failed to delete HR manager');
        }
    };

    return (
        <div className="space-y-6">
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#1e293b',
                        color: '#f8fafc',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                    },
                }}
            />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        Manage HR Managers
                    </h1>
                    <p className="text-slate-400 mt-1">{total} HR manager{total !== 1 ? 's' : ''} total</p>
                </div>
                <Button
                    onClick={() => setShowAddModal(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="self-start sm:self-auto"
                >
                    Add HR Manager
                </Button>
            </motion.div>

            {/* Search */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-4 border border-slate-700/50"
            >
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                </div>
            </motion.div>

            {/* Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl border border-slate-700/50 overflow-hidden"
            >
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
                    </div>
                ) : hrUsers.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-slate-400 mb-2">No HR managers found.</p>
                        <p className="text-sm text-slate-500">
                            Click "Add HR Manager" to get started.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    {['ID', 'Name', 'Email', 'Created', 'Actions'].map(
                                        (h) => (
                                            <th
                                                key={h}
                                                className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-3"
                                            >
                                                {h}
                                            </th>
                                        )
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {hrUsers.map((user, idx) => (
                                    <tr
                                        key={user.id}
                                        className={`border-b border-slate-800/30 hover:bg-white/[0.02] transition-colors ${
                                            idx === hrUsers.length - 1 ? 'border-b-0' : ''
                                        }`}
                                    >
                                        <td className="px-6 py-4 text-sm text-slate-500">#{user.id}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-200">
                                            {user.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-300">{user.email}</td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {formatDate(user.created_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowEditModal(true);
                                                    }}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowDeleteDialog(true);
                                                    }}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50">
                        <p className="text-sm text-slate-400">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* ─── Add HR Modal ──────────────────────────────────────────────── */}
            <AnimatePresence>
                {showAddModal && (
                    <AddHRModal
                        onClose={() => setShowAddModal(false)}
                        onSuccess={() => {
                            setShowAddModal(false);
                            fetchHR();
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ─── Edit HR Modal ─────────────────────────────────────────────── */}
            <AnimatePresence>
                {showEditModal && selectedUser && (
                    <EditHRModal
                        user={selectedUser}
                        onClose={() => {
                            setShowEditModal(false);
                            setSelectedUser(null);
                        }}
                        onSuccess={() => {
                            setShowEditModal(false);
                            setSelectedUser(null);
                            fetchHR();
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ─── Delete Confirmation ───────────────────────────────────────── */}
            <AnimatePresence>
                {showDeleteDialog && selectedUser && (
                    <DeleteConfirmDialog
                        userName={selectedUser.name}
                        onCancel={() => {
                            setShowDeleteDialog(false);
                            setSelectedUser(null);
                        }}
                        onConfirm={handleDelete}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// Add HR Modal
// ═══════════════════════════════════════════════════════════════════════════

function AddHRModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = 'Name is required';
        if (!email.trim()) e.email = 'Email is required';
        else if (!validateEmail(email)) e.email = 'Invalid email format';
        if (!password) e.password = 'Password is required';
        else {
            const pwErr = validatePassword(password);
            if (pwErr) e.password = pwErr;
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSaving(true);
        try {
            await adminEndpoints.createHR({
                name: name.trim(),
                email: email.trim(),
                password,
            });
            toast.success('HR Manager created successfully');
            onSuccess();
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            if (detail && typeof detail === 'string' && detail.includes('email')) {
                setErrors({ email: 'This email is already in use' });
            } else {
                toast.error(detail || 'Failed to create HR manager');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass rounded-2xl p-6 w-full max-w-md border border-slate-700/50 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Add HR Manager</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormField label="Full Name" error={errors.name}>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="form-input"
                            placeholder="John Doe"
                        />
                    </FormField>

                    <FormField label="Email" error={errors.email}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="form-input"
                            placeholder="hr@company.com"
                        />
                    </FormField>

                    <FormField label="Password" error={errors.password}>
                        <div className="relative">
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="form-input pr-24"
                                placeholder="Min 8 characters"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                                >
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPassword(generatePassword())}
                                    className="p-1.5 text-slate-400 hover:text-purple-400 transition-colors"
                                    title="Generate Password"
                                >
                                    <Shuffle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={saving} className="flex-1">
                            Create HR Manager
                        </Button>
                    </div>
                </form>
            </motion.div>
        </ModalOverlay>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Edit HR Modal
// ═══════════════════════════════════════════════════════════════════════════

function EditHRModal({
    user,
    onClose,
    onSuccess,
}: {
    user: HRUser;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [resetPw, setResetPw] = useState(false);
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = 'Name is required';
        if (!email.trim()) e.email = 'Email is required';
        else if (!validateEmail(email)) e.email = 'Invalid email format';
        if (resetPw && password) {
            const pwErr = validatePassword(password);
            if (pwErr) e.password = pwErr;
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSaving(true);
        try {
            const payload: Record<string, string | undefined> = {
                name: name.trim(),
                email: email.trim(),
            };
            if (resetPw && password) {
                payload.password = password;
            }
            await adminEndpoints.updateHR(user.id, payload);
            toast.success('HR Manager updated successfully');
            onSuccess();
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            if (detail && typeof detail === 'string' && detail.includes('email')) {
                setErrors({ email: 'This email is already in use' });
            } else {
                toast.error(detail || 'Failed to update HR manager');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass rounded-2xl p-6 w-full max-w-md border border-slate-700/50 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Edit HR Manager</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormField label="Full Name" error={errors.name}>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="form-input"
                        />
                    </FormField>

                    <FormField label="Email" error={errors.email}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="form-input"
                        />
                    </FormField>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="resetPw"
                            checked={resetPw}
                            onChange={(e) => setResetPw(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-600 focus:ring-purple-500/50"
                        />
                        <label htmlFor="resetPw" className="text-sm text-slate-300">
                            Reset Password
                        </label>
                    </div>

                    {resetPw && (
                        <FormField label="New Password" error={errors.password}>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="form-input pr-24"
                                    placeholder="New password"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(!showPw)}
                                        className="p-1.5 text-slate-400 hover:text-white transition-colors"
                                    >
                                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPassword(generatePassword())}
                                        className="p-1.5 text-slate-400 hover:text-purple-400 transition-colors"
                                        title="Generate Password"
                                    >
                                        <Shuffle className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </FormField>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={saving} className="flex-1">
                            Update HR Manager
                        </Button>
                    </div>
                </form>
            </motion.div>
        </ModalOverlay>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Delete Confirmation Dialog
// ═══════════════════════════════════════════════════════════════════════════

function DeleteConfirmDialog({
    userName,
    onCancel,
    onConfirm,
}: {
    userName: string;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const [deleting, setDeleting] = useState(false);

    const handleConfirm = async () => {
        setDeleting(true);
        await onConfirm();
        setDeleting(false);
    };

    return (
        <ModalOverlay onClose={onCancel}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass rounded-2xl p-6 w-full max-w-sm border border-slate-700/50 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-red-500/15">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Delete HR Manager?</h2>
                </div>

                <p className="text-sm text-slate-400 mb-6">
                    Are you sure you want to delete <span className="text-white font-medium">{userName}</span>?
                    This action cannot be undone.
                </p>

                <div className="flex gap-3">
                    <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
                        Cancel
                    </Button>
                    <Button type="button" variant="danger" onClick={handleConfirm} isLoading={deleting} className="flex-1">
                        Delete
                    </Button>
                </div>
            </motion.div>
        </ModalOverlay>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════════════════════════════════

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            {children}
        </motion.div>
    );
}

function FormField({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
                {label}
            </label>
            {children}
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
    );
}
