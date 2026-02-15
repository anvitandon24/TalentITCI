from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from database.connection import get_db
from database.models import User, Candidate, Application

router = APIRouter(tags=["Candidates"])


@router.post("/candidate")
def add_candidate(name: str, email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(name=name, email=email, role="candidate")
        db.add(user)
        db.flush()

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


@router.get("/candidates")
def get_candidates(
    db: Session = Depends(get_db),
    order_by: Optional[str] = Query(None, description="Sort by 'score' or omit for default"),
    desc: bool = Query(True, description="Descending order when order_by=score"),
):
    candidates = (
        db.query(Candidate)
        .options(
            joinedload(Candidate.user),
            joinedload(Candidate.applications).joinedload(Application.job),
        )
        .all()
    )
    result = []
    for c in candidates:
        apps_info = []
        best_app = None
        for app in c.applications:
            app_info = {
                "application_id": app.id,
                "job_id": app.job_id,
                "job_title": app.job.title if app.job else "Unknown",
                "stage": app.stage,
                "rag_score": app.rag_score,
                "rag_status": app.rag_status,
                "rag_reasoning": app.rag_reasoning,
            }
            apps_info.append(app_info)
            if app.rag_score is not None:
                if best_app is None or app.rag_score > best_app.rag_score:
                    best_app = app

        result.append({
            "id": c.id,
            "name": c.name,
            "email": c.user.email if c.user else None,
            "status": c.status,
            "score": best_app.rag_score if best_app else None,
            "rag_status": best_app.rag_status if best_app else None,
            "rag_reasoning": best_app.rag_reasoning if best_app else None,
            "applications": apps_info,
        })

    if order_by == "score":
        scored = [r for r in result if r["score"] is not None]
        unscored = [r for r in result if r["score"] is None]
        scored.sort(key=lambda x: x["score"], reverse=desc)
        result = scored + unscored

    return result


@router.patch("/candidate/{candidate_id}/status")
def update_status(candidate_id: int, status: str, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    valid_statuses = ["Applied", "Screening", "Interview", "Offer", "Rejected", "Selected"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    candidate.status = status
    # Sync all related application stages so candidate dashboard and HR list stay consistent
    for app in db.query(Application).filter(Application.candidate_id == candidate_id).all():
        app.stage = status
    db.commit()
    db.refresh(candidate)

    return {
        "id": candidate.id,
        "name": candidate.name,
        "email": candidate.user.email if candidate.user else None,
        "status": candidate.status,
    }
