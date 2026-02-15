import axios from 'axios';
import { config } from '../config';

// ── TypeScript interfaces ────────────────────────────────────────────────

export interface CandidateApplication {
    application_id: number;
    job_id: number;
    job_title: string;
    stage: string;
    rag_score: number | null;
    rag_status: string | null;
    rag_reasoning: string | null;
}

export interface Candidate {
    id: number;
    name: string;
    email: string;
    status: string;
    score?: number | null;
    rag_status?: string | null;
    rag_reasoning?: string | null;
    applications?: CandidateApplication[];
}

export interface Job {
    id: number;
    title: string;
    department: string;
    location: string;
    type: string;
    applicants: number;
    posted: string;
    status: string;
    has_jd?: boolean;
    has_hr_policy?: boolean;
    jd_filename?: string | null;
    hr_policy_filename?: string | null;
}

export interface Resume {
    id: number;
    candidate_id: number;
    file_name: string;
}

export interface Application {
    id?: number;
    candidate_id: number;
    job_id: number;
    stage: string;
    score: number | null;
    rag_score?: number | null;
    rag_status?: string | null;
    rag_reasoning?: string | null;
    job?: {
        id: number;
        title: string;
        department: string;
        location: string;
        type?: string;
        applicants?: number;
        posted: string;
        status: string;
        has_jd?: boolean;
        has_hr_policy?: boolean;
    };
}

export interface RankedApplication {
    id: number;
    candidate_id: number;
    candidate_name: string;
    candidate_email: string | null;
    job_id: number;
    stage: string;
    score: number | null;
    rag_score: number | null;
    rag_status: string | null;
    rag_reasoning: string | null;
    rag_details: Record<string, unknown> | null;
}

export interface AuthUser {
    id: number;
    email: string;
    name: string;
    role: string;
    candidate_id?: number | null;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user: AuthUser;
}

// ── Axios instance ───────────────────────────────────────────────────────

export const api = axios.create({
    baseURL: config.apiUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Request interceptor – attach JWT to every request ────────────────────

api.interceptors.request.use(
    (requestConfig) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            requestConfig.headers.Authorization = `Bearer ${token}`;
        }
        return requestConfig;
    },
    (error) => Promise.reject(error),
);

// ── 5.1 Response interceptor – handle 401 & auto-refresh (race-condition fixed) ──

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    const queue = [...failedQueue];
    failedQueue = [];
    queue.forEach((prom) => {
        if (token) {
            prom.resolve(token);
        } else {
            prom.reject(error);
        }
    });
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only attempt refresh on 401 and if we haven't already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
            // If another request is already refreshing, queue this one
            if (isRefreshing) {
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                processQueue(error, null);
                isRefreshing = false;
                // No refresh token available – clear auth and redirect
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                // Use a fresh axios instance to avoid interceptor loops
                const response = await axios.post<TokenResponse>(
                    `${config.apiUrl}/auth/refresh`,
                    { refresh_token: refreshToken },
                );

                const { access_token, refresh_token: newRefreshToken, user } = response.data;

                // 5.2 – Update ALL stored data atomically after refresh
                localStorage.setItem('access_token', access_token);
                localStorage.setItem('refresh_token', newRefreshToken);
                localStorage.setItem('user', JSON.stringify(user));

                // Dispatch a custom event so AuthContext can pick up the fresh user
                window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: { user } }));

                processQueue(null, access_token);

                originalRequest.headers.Authorization = `Bearer ${access_token}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                // Refresh failed – clear everything and redirect
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    },
);

// ── Auth API endpoints ───────────────────────────────────────────────────

export const authEndpoints = {
    register: (data: { email: string; password: string; name: string; role?: string }) =>
        api.post<TokenResponse>('/auth/register', data),

    login: (data: { email: string; password: string }) =>
        api.post<TokenResponse>('/auth/login', data),

    googleAuth: (credential: string) =>
        api.post<TokenResponse>('/auth/google', { credential }),

    refresh: (refreshToken: string) =>
        api.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken }),

    getMe: () => api.get<AuthUser>('/auth/me'),
};

// ── Admin API endpoints ──────────────────────────────────────────────────

export interface HRUser {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string | null;
}

export interface HRListResponse {
    items: HRUser[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}

export interface DashboardStats {
    active_jobs: number;
    active_jobs_change: number;
    total_applications: number;
    total_applications_change: number;
    candidate_signups: number;
    candidate_signups_change: number;
    hr_count: number;
    hr_count_change: number;
    applications_trend: Array<{ date: string; count: number }>;
    applications_by_department: Array<{ department: string; count: number; percentage: number }>;
    recent_applications: Array<{
        id: number;
        candidate_name: string;
        job_title: string;
        applied_date: string | null;
        status: string;
    }>;
    hiring_funnel: {
        applied: number;
        shortlisted: number;
        interview: number;
        hired: number;
        shortlist_rate: number;
        interview_rate: number;
        hire_rate: number;
    };
}

export const adminEndpoints = {
    // HR Management
    listHR: (params?: { search?: string; page?: number; per_page?: number }) =>
        api.get<HRListResponse>('/api/admin/hr', { params }),

    createHR: (data: { name: string; email: string; password: string }) =>
        api.post<HRUser>('/api/admin/hr/create', data),

    updateHR: (id: number, data: { name?: string; email?: string; password?: string }) =>
        api.put<HRUser>(`/api/admin/hr/${id}`, data),

    deleteHR: (id: number) =>
        api.delete(`/api/admin/hr/${id}`),

    resetHRPassword: (id: number, password: string) =>
        api.post(`/api/admin/hr/${id}/reset-password`, { password }),

    checkEmail: (email: string, excludeId?: number) =>
        api.get<{ exists: boolean }>('/api/admin/check-email', { params: { email, exclude_id: excludeId } }),

    // Dashboard
    getDashboardStats: () =>
        api.get<DashboardStats>('/api/admin/dashboard/stats'),
};

// ── Existing API endpoints ───────────────────────────────────────────────

export const endpoints = {
    // Candidates
    getCandidates: (params?: { order_by?: string; desc?: boolean }) =>
        api.get<Candidate[]>('/candidates', { params }),
    addCandidate: (data: { name: string; email: string }) =>
        api.post<Candidate>('/candidate', null, { params: data }),
    signup: (data: { name: string; email: string; role?: string }) =>
        api.post('/signup', null, { params: data }),
    updateCandidateStatus: (id: number, status: string) =>
        api.patch<Candidate>(`/candidate/${id}/status`, null, { params: { status } }),

    // Resumes
    uploadResume: (id: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<Resume>(`/candidate/${id}/resume`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    getResumes: () => api.get<Resume[]>('/resumes'),

    // Download endpoints
    downloadResume: (candidateId: number) =>
        `${config.apiUrl}/candidate/${candidateId}/resume/download`,
    downloadJobDescription: (jobId: number) =>
        `${config.apiUrl}/job/${jobId}/download-jd`,
    downloadHrPolicy: (jobId: number) =>
        `${config.apiUrl}/job/${jobId}/download-hr-policy`,

    // Jobs
    getJobs: () => api.get<Job[]>('/jobs'),
    getJob: (jobId: number) => api.get<Job>(`/job/${jobId}`),
    createJob: (data: { title: string; department: string; location?: string; type?: string }) =>
        api.post<Job>('/job', null, { params: data }),
    deleteJob: (jobId: number) => api.delete(`/job/${jobId}`),

    // Job document uploads (HR)
    uploadJobDescription: (jobId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/job/${jobId}/upload-jd`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    uploadHrPolicy: (jobId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/job/${jobId}/upload-hr-policy`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    // Applications
    applyToJob: (candidateId: number, jobId: number) =>
        api.post<Application>('/apply', null, {
            params: { candidate_id: candidateId, job_id: jobId }
        }),
    getCandidateApplications: (candidateId: number) =>
        api.get<Application[]>(`/applications/candidate/${candidateId}`),
    scoreCandidate: (candidateId: number, jobId: number, score: number) =>
        api.post('/score', null, {
            params: { candidate_id: candidateId, job_id: jobId, score }
        }),
    getJobRankings: (jobId: number) => api.get<RankedApplication[]>(`/job/${jobId}/rankings`),

    // RAG evaluation
    triggerEvaluation: (applicationId: number) =>
        api.post(`/application/${applicationId}/evaluate`),
    triggerAllEvaluations: (jobId: number) =>
        api.post(`/job/${jobId}/evaluate-all`),

    // Candidate Career AI Chatbot
    candidateChat: (data: { candidate_id: number; message: string; history?: Array<{ role: string; content: string }> }) =>
        api.post('/candidate-ai/chat', data),
};
