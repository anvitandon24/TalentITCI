import axios from 'axios';
import { config } from '../config';

// TypeScript interfaces for API responses
export interface Candidate {
    id: number;
    name: string;
    email: string;
    status: string;
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
}

export interface Resume {
    candidate_id: number;
    file_name: string;
    file_path: string;
}

export interface Application {
    id?: number;
    candidate_id: number;
    job_id: number;
    stage: string;
    score: number | null;
}

// Create axios instance with base configuration
export const api = axios.create({
    baseURL: config.apiUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

// API endpoints
export const endpoints = {
    // Candidates
    getCandidates: () => api.get<Candidate[]>('/candidates'),
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

    // Jobs
    getJobs: () => api.get<Job[]>('/jobs'),
    getJob: (jobId: number) => api.get<Job>(`/job/${jobId}`),
    createJob: (data: { title: string; department: string; location?: string; type?: string }) =>
        api.post<Job>('/job', null, { params: data }),

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
    getJobRankings: (jobId: number) => api.get<Application[]>(`/job/${jobId}/rankings`),
};

