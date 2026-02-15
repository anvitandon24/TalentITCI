
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from database.models import Candidate, Job, Application, User
from typing import List, Dict, Any


def get_candidate_status(email: str, db: Session) -> Dict[str, Any]:
    """Retrieve candidate status and latest application info by email."""
    stmt = (
        select(User)
        .where(User.email.ilike(email))
    )
    user = db.execute(stmt).scalars().first()
    if not user or not user.candidate:
        return {}

    candidate = user.candidate
    # Get latest application
    latest_app_stmt = (
        select(Application)
        .where(Application.candidate_id == candidate.id)
        .order_by(desc(Application.created_at))
        .limit(1)
    )
    latest_app = db.execute(latest_app_stmt).scalars().first()

    result = {
        "id": candidate.id,
        "name": candidate.name,
        "email": user.email,
        "status": candidate.status,
    }

    if latest_app:
        result["latest_application"] = {
            "application_id": latest_app.id,
            "job_id": latest_app.job_id,
            "job_title": latest_app.job.title if latest_app.job else "Unknown",
            "stage": latest_app.stage,
            "rag_score": latest_app.rag_score,
            "rag_status": latest_app.rag_status,
        }

    return result


def search_candidates_by_name_sql(name_query: str, db: Session) -> List[Dict[str, Any]]:
    """Search candidates by name (case-insensitive partial match)."""
    stmt = select(Candidate).where(Candidate.name.ilike(f"%{name_query}%"))
    results = db.execute(stmt).scalars().all()

    data = []
    for cand in results:
        cand_data = {
            "id": cand.id,
            "name": cand.name,
            "status": cand.status,
            "email": cand.user.email if cand.user else "N/A",
        }
        # Include application info if available
        if cand.applications:
            cand_data["applications"] = [
                {
                    "job_title": app.job.title if app.job else "Unknown",
                    "stage": app.stage,
                    "rag_score": app.rag_score,
                    "rag_status": app.rag_status,
                }
                for app in cand.applications
            ]
        data.append(cand_data)
    return data


def get_job_postings_sql(status: str = "Open", db: Session = None) -> List[Dict[str, Any]]:
    """Get all job postings with a specific status."""
    if db is None:
        return []

    stmt = select(Job).where(Job.status == status).order_by(desc(Job.created_at))
    results = db.execute(stmt).scalars().all()

    data = []
    for job in results:
        data.append({
            "id": job.id,
            "title": job.title,
            "department": job.department,
            "location": job.location,
            "type": job.type,
            "status": job.status,
            "posted": job.posted,
        })
    return data


def get_application_reasoning_sql(candidate_name: str, db: Session) -> str:
    """
    Get the RAG reasoning for a candidate's application.
    Useful for answering 'Why was X rejected?'
    """
    stmt = (
        select(Application)
        .join(Candidate)
        .where(Candidate.name.ilike(f"%{candidate_name}%"))
        .order_by(desc(Application.created_at))
    )
    application = db.execute(stmt).scalars().first()

    if application and application.rag_reasoning:
        job_title = application.job.title if application.job else "Unknown Job"
        return (
            f"Candidate applied to '{job_title}'. "
            f"AI Evaluation: {application.rag_status} (Score: {application.rag_score}/100). "
            f"Reasoning: {application.rag_reasoning}"
        )
    elif application:
        job_title = application.job.title if application.job else "Unknown Job"
        return (
            f"Application found for '{job_title}' (Stage: {application.stage}), "
            f"but no AI evaluation has been performed yet."
        )
    else:
        return f"No application found for candidate matching '{candidate_name}'."
