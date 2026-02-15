from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database.connection import get_db
from database.models import Candidate, Application

router = APIRouter(tags=["Scoring"])


@router.post("/score")
def score_candidate(candidate_id: int, job_id: int, score: int = 75, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail=f"No candidate found with id {candidate_id}")

    application = (
        db.query(Application)
        .filter(Application.candidate_id == candidate_id, Application.job_id == job_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Candidate exists but has not applied for this job")

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


@router.get("/job/{job_id}/rankings")
def job_rankings(job_id: int, db: Session = Depends(get_db)):
    all_apps = (
        db.query(Application)
        .options(joinedload(Application.candidate).joinedload(Candidate.user))
        .filter(Application.job_id == job_id)
        .all()
    )
    scored = [a for a in all_apps if a.rag_score is not None]
    unscored = [a for a in all_apps if a.rag_score is None]
    scored.sort(key=lambda a: a.rag_score, reverse=True)
    ranked = scored + unscored

    return [
        {
            "id": a.id,
            "candidate_id": a.candidate_id,
            "candidate_name": a.candidate.name if a.candidate else "Unknown",
            "candidate_email": a.candidate.user.email if a.candidate and a.candidate.user else None,
            "job_id": a.job_id,
            "stage": a.stage,
            "score": a.score,
            "rag_score": a.rag_score,
            "rag_status": a.rag_status,
            "rag_reasoning": a.rag_reasoning,
            "rag_details": a.rag_details,
        }
        for a in ranked
    ]
