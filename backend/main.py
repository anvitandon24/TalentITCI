from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
import os

from database.connection import get_db
from database.models import User, Candidate, Job, Resume, Application

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Signup ────────────────────────────────────────────────────────────────────

@app.post("/signup")
def signup(name: str, email: str, role: str = "candidate", db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return {"error": "User already exists with this email"}

    # Create user row
    user = User(name=name, email=email, role=role)
    db.add(user)
    db.flush()  # get user.id

    result_user = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }

    # If candidate, also create a candidate row
    if role == "candidate":
        candidate = Candidate(user_id=user.id, name=name, status="Applied")
        db.add(candidate)
        db.flush()
        result_user["candidate_id"] = candidate.id
        result_user["status"] = candidate.status

    db.commit()
    return {"message": "Signup successful", "user": result_user}


# ── Candidates ────────────────────────────────────────────────────────────────

@app.post("/candidate")
def add_candidate(name: str, email: str, db: Session = Depends(get_db)):
    # Create user + candidate
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(name=name, email=email, role="candidate")
        db.add(user)
        db.flush()

    # Check if candidate profile already exists
    existing_candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if existing_candidate:
        return {
            "id": existing_candidate.id,
            "name": existing_candidate.name,
            "email": user.email,
            "status": existing_candidate.status,
        }

    candidate = Candidate(user_id=user.id, name=name, status="Applied")
    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    return {
        "id": candidate.id,
        "name": candidate.name,
        "email": user.email,
        "status": candidate.status,
    }


@app.get("/candidates")
def get_candidates(db: Session = Depends(get_db)):
    candidates = db.query(Candidate).all()
    result = []
    for c in candidates:
        result.append({
            "id": c.id,
            "name": c.name,
            "email": c.user.email if c.user else None,
            "status": c.status,
        })
    return result


@app.patch("/candidate/{candidate_id}/status")
def update_status(candidate_id: int, status: str, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        return {"error": "Candidate not found"}

    candidate.status = status
    db.commit()
    db.refresh(candidate)

    return {
        "id": candidate.id,
        "name": candidate.name,
        "email": candidate.user.email if candidate.user else None,
        "status": candidate.status,
    }


# ── Resumes ───────────────────────────────────────────────────────────────────

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/candidate/{candidate_id}/resume")
def upload_resume(candidate_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Verify candidate exists
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        return {"error": "Candidate not found"}

    file_path = f"{UPLOAD_DIR}/{candidate_id}_{file.filename}"
    with open(file_path, "wb") as f:
        f.write(file.file.read())

    resume = Resume(candidate_id=candidate_id, file_name=file.filename, file_path=file_path)
    db.add(resume)
    db.commit()
    db.refresh(resume)

    return {
        "candidate_id": resume.candidate_id,
        "file_name": resume.file_name,
        "file_path": resume.file_path,
    }


@app.get("/resumes")
def get_resumes(db: Session = Depends(get_db)):
    resumes = db.query(Resume).all()
    return [
        {
            "candidate_id": r.candidate_id,
            "file_name": r.file_name,
            "file_path": r.file_path,
        }
        for r in resumes
    ]


# ── Jobs ──────────────────────────────────────────────────────────────────────

@app.post("/job")
def create_job(
    title: str,
    department: str,
    location: str = "Remote",
    type: str = "Full-time",
    db: Session = Depends(get_db),
):
    job = Job(title=title, department=department, location=location, type=type)
    db.add(job)
    db.commit()
    db.refresh(job)

    return {
        "id": job.id,
        "title": job.title,
        "department": job.department,
        "location": job.location,
        "type": job.type,
        "applicants": 0,
        "posted": job.posted,
        "status": job.status,
    }


@app.get("/jobs")
def get_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).all()
    result = []
    for job in jobs:
        applicant_count = (
            db.query(func.count(Application.id))
            .filter(Application.job_id == job.id)
            .scalar()
        )
        result.append({
            "id": job.id,
            "title": job.title,
            "department": job.department,
            "location": job.location,
            "type": job.type,
            "applicants": applicant_count,
            "posted": job.posted,
            "status": job.status,
        })
    return result


@app.get("/job/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return {"error": "Job not found"}

    applicant_count = (
        db.query(func.count(Application.id))
        .filter(Application.job_id == job.id)
        .scalar()
    )
    return {
        "id": job.id,
        "title": job.title,
        "department": job.department,
        "location": job.location,
        "type": job.type,
        "applicants": applicant_count,
        "posted": job.posted,
        "status": job.status,
    }


# ── Applications ──────────────────────────────────────────────────────────────

@app.post("/apply")
def apply_to_job(candidate_id: int, job_id: int, db: Session = Depends(get_db)):
    # Check if already applied
    existing = (
        db.query(Application)
        .filter(Application.candidate_id == candidate_id, Application.job_id == job_id)
        .first()
    )
    if existing:
        return {"error": "Already applied to this job"}

    application = Application(candidate_id=candidate_id, job_id=job_id, stage="Applied")
    db.add(application)
    db.commit()
    db.refresh(application)

    return {
        "message": "Application submitted successfully",
        "application": {
            "id": application.id,
            "candidate_id": application.candidate_id,
            "job_id": application.job_id,
            "stage": application.stage,
            "score": application.score,
        },
    }


@app.get("/applications/candidate/{candidate_id}")
def get_candidate_applications(candidate_id: int, db: Session = Depends(get_db)):
    apps = (
        db.query(Application)
        .filter(Application.candidate_id == candidate_id)
        .all()
    )
    result = []
    for a in apps:
        job = db.query(Job).filter(Job.id == a.job_id).first()
        job_dict = None
        if job:
            applicant_count = (
                db.query(func.count(Application.id))
                .filter(Application.job_id == job.id)
                .scalar()
            )
            job_dict = {
                "id": job.id,
                "title": job.title,
                "department": job.department,
                "location": job.location,
                "type": job.type,
                "applicants": applicant_count,
                "posted": job.posted,
                "status": job.status,
            }
        result.append({
            "id": a.id,
            "candidate_id": a.candidate_id,
            "job_id": a.job_id,
            "stage": a.stage,
            "score": a.score,
            "job": job_dict,
        })
    return result


# ── Scoring & Rankings ────────────────────────────────────────────────────────

@app.post("/score")
def score_candidate(candidate_id: int, job_id: int, score: int = 75, db: Session = Depends(get_db)):
    # 1. Check if candidate exists
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        return {"error": f"No candidate found with id {candidate_id}"}

    # 2. Check if application exists
    application = (
        db.query(Application)
        .filter(Application.candidate_id == candidate_id, Application.job_id == job_id)
        .first()
    )
    if not application:
        return {"error": "Candidate exists but has not applied for this job"}

    application.score = score
    application.stage = "Screening"
    db.commit()
    db.refresh(application)

    return {
        "message": "Candidate scored successfully",
        "application": {
            "id": application.id,
            "candidate_id": application.candidate_id,
            "job_id": application.job_id,
            "stage": application.stage,
            "score": application.score,
        },
    }


@app.get("/job/{job_id}/rankings")
def job_rankings(job_id: int, db: Session = Depends(get_db)):
    ranked = (
        db.query(Application)
        .filter(Application.job_id == job_id, Application.score.isnot(None))
        .order_by(Application.score.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "candidate_id": a.candidate_id,
            "job_id": a.job_id,
            "stage": a.stage,
            "score": a.score,
        }
        for a in ranked
    ]
