CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('hr', 'candidate')) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE candidates (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT,
    status TEXT DEFAULT 'Applied'
);

CREATE INDEX ix_candidates_user_id ON candidates(user_id);

CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    department TEXT,
    status TEXT DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE resumes (
    id SERIAL PRIMARY KEY,
    candidate_id INT REFERENCES candidates(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_resumes_candidate_id ON resumes(candidate_id);

CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    candidate_id INT REFERENCES candidates(id) ON DELETE CASCADE,
    job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
    stage TEXT DEFAULT 'Applied',
    score INT,
    applied_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (candidate_id, job_id)
);

CREATE INDEX ix_applications_candidate_job
ON applications(candidate_id, job_id);