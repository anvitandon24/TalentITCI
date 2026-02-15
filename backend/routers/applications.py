from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from database.connection import get_db
from database.models import Application, Job, Resume
from routers.utils.rag_tasks import run_rag_scoring

router = APIRouter(tags=["Applications"])


@router.post("/apply")
def apply_to_job(
    candidate_id: int,
    job_id: int,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    existing = (
        db.query(Application)
        .filter(Application.candidate_id == candidate_id, Application.job_id == job_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied to this job")

    application = Application(candidate_id=candidate_id, job_id=job_id, stage="Applied")
    db.add(application)
    db.commit()
    db.refresh(application)

    job = db.query(Job).filter(Job.id == job_id).first()
    latest_resume = (
        db.query(Resume)
        .filter(Resume.candidate_id == candidate_id, Resume.file_data.isnot(None))
        .order_by(Resume.created_at.desc())
        .first()
    )
    if job and job.job_description_pdf and latest_resume and latest_resume.file_data:
        background_tasks.add_task(
            run_rag_scoring,
            application.id,
            latest_resume.file_data,
            job.job_description_pdf,
            job.hr_policy_pdf,
        )

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


@router.get("/applications/candidate/{candidate_id}")
def get_candidate_applications(candidate_id: int, db: Session = Depends(get_db)):
    apps = (
        db.query(Application)
        .options(joinedload(Application.job))
        .filter(Application.candidate_id == candidate_id)
        .all()
    )
    result = []
    for a in apps:
        job = a.job
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
                "has_jd": job.job_description_pdf is not None,
                "has_hr_policy": job.hr_policy_pdf is not None,
            }
        result.append({
            "id": a.id,
            "candidate_id": a.candidate_id,
            "job_id": a.job_id,
            "stage": a.stage,
            "score": a.score,
            "rag_score": a.rag_score,
            "rag_status": a.rag_status,
            "rag_reasoning": a.rag_reasoning,
            "job": job_dict,
        })
    return result
