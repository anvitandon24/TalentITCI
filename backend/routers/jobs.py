from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.connection import get_db
from database.models import Job, Application

router = APIRouter(tags=["Jobs"])


def _applicant_count(db: Session, job_id: int):
    return (
        db.query(func.count(Application.id))
        .filter(Application.job_id == job_id)
        .scalar()
    )


@router.post("/job")
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
        "has_jd": job.job_description_pdf is not None,
        "has_hr_policy": job.hr_policy_pdf is not None,
    }


@router.get("/jobs")
def get_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).all()
    return [
        {
            "id": job.id,
            "title": job.title,
            "department": job.department,
            "location": job.location,
            "type": job.type,
            "applicants": _applicant_count(db, job.id),
            "posted": job.posted,
            "status": job.status,
            "has_jd": job.job_description_pdf is not None,
            "has_hr_policy": job.hr_policy_pdf is not None,
            "jd_filename": job.job_description_filename,
            "hr_policy_filename": job.hr_policy_filename,
        }
        for job in jobs
    ]


@router.get("/job/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id": job.id,
        "title": job.title,
        "department": job.department,
        "location": job.location,
        "type": job.type,
        "applicants": _applicant_count(db, job.id),
        "posted": job.posted,
        "status": job.status,
        "has_jd": job.job_description_pdf is not None,
        "has_hr_policy": job.hr_policy_pdf is not None,
        "jd_filename": job.job_description_filename,
        "hr_policy_filename": job.hr_policy_filename,
    }


@router.delete("/job/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job_title = job.title
    db.delete(job)
    db.commit()
    return {"message": f"Job '{job_title}' deleted successfully", "job_id": job_id}


@router.post("/job/{job_id}/upload-jd")
def upload_job_description(
    job_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    file_bytes = file.file.read()
    job.job_description_pdf = file_bytes
    job.job_description_filename = file.filename
    db.commit()
    return {"message": "Job description uploaded successfully", "job_id": job.id, "filename": file.filename}


@router.post("/job/{job_id}/upload-hr-policy")
def upload_hr_policy(
    job_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    file_bytes = file.file.read()
    job.hr_policy_pdf = file_bytes
    job.hr_policy_filename = file.filename
    db.commit()
    return {"message": "HR policy uploaded successfully", "job_id": job.id, "filename": file.filename}


@router.get("/job/{job_id}/download-jd")
def download_job_description(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.job_description_pdf:
        raise HTTPException(status_code=404, detail="No job description uploaded for this job")
    filename = job.job_description_filename or f"job_{job_id}_description.pdf"
    return Response(
        content=job.job_description_pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/job/{job_id}/download-hr-policy")
def download_hr_policy(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.hr_policy_pdf:
        raise HTTPException(status_code=404, detail="No HR policy uploaded for this job")
    filename = job.hr_policy_filename or f"job_{job_id}_hr_policy.pdf"
    return Response(
        content=job.hr_policy_pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
