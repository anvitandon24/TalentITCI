from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import Candidate, Job, Resume, Application
from routers.utils.rag_tasks import run_rag_scoring

router = APIRouter(tags=["Resumes"])


@router.post("/candidate/{candidate_id}/resume")
def upload_resume(
    candidate_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    file_bytes = file.file.read()

    resume = Resume(
        candidate_id=candidate_id,
        file_name=file.filename,
        file_data=file_bytes,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    applications = (
        db.query(Application)
        .filter(Application.candidate_id == candidate_id)
        .all()
    )
    triggered = 0
    for app_record in applications:
        job = db.query(Job).filter(Job.id == app_record.job_id).first()
        if job and job.job_description_pdf:
            background_tasks.add_task(
                run_rag_scoring,
                app_record.id,
                file_bytes,
                job.job_description_pdf,
                job.hr_policy_pdf,
            )
            triggered += 1

    return {
        "id": resume.id,
        "candidate_id": resume.candidate_id,
        "file_name": resume.file_name,
        "evaluations_triggered": triggered,
    }


@router.get("/resumes")
def get_resumes(db: Session = Depends(get_db)):
    resumes = db.query(Resume).all()
    return [
        {"id": r.id, "candidate_id": r.candidate_id, "file_name": r.file_name}
        for r in resumes
    ]


@router.get("/candidate/{candidate_id}/resume/download")
def download_resume(candidate_id: int, db: Session = Depends(get_db)):
    resume = (
        db.query(Resume)
        .filter(Resume.candidate_id == candidate_id, Resume.file_data.isnot(None))
        .order_by(Resume.created_at.desc())
        .first()
    )
    if not resume or not resume.file_data:
        raise HTTPException(status_code=404, detail="No resume found for this candidate")

    return Response(
        content=resume.file_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{resume.file_name}"'},
    )
