from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import Application, Job, Resume
from routers.utils.rag_tasks import run_rag_scoring

router = APIRouter(tags=["Evaluation"])


@router.post("/application/{application_id}/evaluate")
def trigger_evaluation(
    application_id: int,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job or not job.job_description_pdf:
        raise HTTPException(status_code=400, detail="Job description PDF not uploaded for this job")

    latest_resume = (
        db.query(Resume)
        .filter(Resume.candidate_id == application.candidate_id, Resume.file_data.isnot(None))
        .order_by(Resume.created_at.desc())
        .first()
    )
    if not latest_resume or not latest_resume.file_data:
        raise HTTPException(status_code=400, detail="Candidate has no resume uploaded")

    application.rag_status = "PROCESSING"
    application.rag_reasoning = None
    db.commit()

    background_tasks.add_task(
        run_rag_scoring,
        application.id,
        latest_resume.file_data,
        job.job_description_pdf,
        job.hr_policy_pdf,
    )

    return {"message": "Evaluation started", "application_id": application_id}


@router.post("/job/{job_id}/evaluate-all")
def trigger_all_evaluations(
    job_id: int,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.job_description_pdf:
        raise HTTPException(status_code=400, detail="Job description PDF not uploaded for this job")

    applications = (
        db.query(Application)
        .filter(
            Application.job_id == job_id,
            (Application.rag_status.is_(None)) | (Application.rag_status.in_(["ERROR", "PROCESSING"])),
        )
        .all()
    )

    triggered = 0
    for app_record in applications:
        latest_resume = (
            db.query(Resume)
            .filter(Resume.candidate_id == app_record.candidate_id, Resume.file_data.isnot(None))
            .order_by(Resume.created_at.desc())
            .first()
        )
        if latest_resume and latest_resume.file_data:
            app_record.rag_status = "PROCESSING"
            db.commit()
            background_tasks.add_task(
                run_rag_scoring,
                app_record.id,
                latest_resume.file_data,
                job.job_description_pdf,
                job.hr_policy_pdf,
            )
            triggered += 1

    return {"message": f"Triggered evaluation for {triggered} application(s)", "triggered": triggered}
