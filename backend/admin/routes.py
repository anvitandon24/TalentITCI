import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session
import re

from database.connection import get_db
from database.models import User, Candidate, Job, Application
from admin.dependencies import require_role
from auth.utils import hash_password

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Admin"])


# ── Pydantic schemas ─────────────────────────────────────────────────────

class CreateHRRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v


class UpdateHRRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v


class ResetPasswordRequest(BaseModel):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v


# ── HR Management Endpoints ──────────────────────────────────────────────

@router.get("/hr")
def list_hr_users(
    search: Optional[str] = Query(None, description="Search by name or email"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """List all HR users with pagination and search."""
    query = db.query(User).filter(User.role == "hr")

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.name.ilike(search_term)) | (User.email.ilike(search_term))
        )

    total = query.count()
    hr_users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {
        "items": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in hr_users
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, (total + per_page - 1) // per_page),
    }


@router.post("/hr/create", status_code=status.HTTP_201_CREATED)
def create_hr_user(
    payload: CreateHRRequest,
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Create a new HR manager account."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="hr",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info(f"Admin {admin_user.email} created HR user: {user.email}")

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.put("/hr/{user_id}")
def update_hr_user(
    user_id: int,
    payload: UpdateHRRequest,
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Update an existing HR manager's details."""
    user = db.query(User).filter(User.id == user_id, User.role == "hr").first()
    if not user:
        raise HTTPException(status_code=404, detail="HR user not found")

    if payload.name is not None:
        user.name = payload.name

    if payload.email is not None and payload.email != user.email:
        email_taken = db.query(User).filter(User.email == payload.email, User.id != user_id).first()
        if email_taken:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )
        user.email = payload.email

    if payload.password is not None:
        user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(user)

    logger.info(f"Admin {admin_user.email} updated HR user: {user.email}")

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.delete("/hr/{user_id}")
def delete_hr_user(
    user_id: int,
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Delete an HR manager permanently."""
    user = db.query(User).filter(User.id == user_id, User.role == "hr").first()
    if not user:
        raise HTTPException(status_code=404, detail="HR user not found")

    db.delete(user)
    db.commit()

    logger.info(f"Admin {admin_user.email} deleted HR user: {user.email}")

    return {"message": "HR Manager deleted successfully"}


@router.post("/hr/{user_id}/reset-password")
def reset_hr_password(
    user_id: int,
    payload: ResetPasswordRequest,
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Reset an HR manager's password."""
    user = db.query(User).filter(User.id == user_id, User.role == "hr").first()
    if not user:
        raise HTTPException(status_code=404, detail="HR user not found")

    user.password_hash = hash_password(payload.password)
    db.commit()

    logger.info(f"Admin {admin_user.email} reset password for HR user: {user.email}")

    return {"message": "Password reset successfully"}


@router.get("/check-email")
def check_email_unique(
    email: str = Query(..., description="Email to check"),
    exclude_id: Optional[int] = Query(None, description="User ID to exclude"),
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Check if an email is already taken."""
    query = db.query(User).filter(User.email == email)
    if exclude_id:
        query = query.filter(User.id != exclude_id)
    exists = query.first() is not None
    return {"exists": exists}


# ── Dashboard Analytics Endpoint ─────────────────────────────────────────

@router.get("/dashboard/stats")
def get_dashboard_stats(
    admin_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Return all admin dashboard statistics."""
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)

    # ── Metric Cards ─────────────────────────────────────────────────────

    # Active Jobs
    active_jobs = db.query(func.count(Job.id)).filter(
        Job.status.in_(["Open", "active"])
    ).scalar() or 0
    active_jobs_prev = db.query(func.count(Job.id)).filter(
        Job.status.in_(["Open", "active"]),
        Job.created_at < thirty_days_ago,
        Job.created_at >= sixty_days_ago,
    ).scalar() or 0

    # Total Applications
    total_applications = db.query(func.count(Application.id)).scalar() or 0
    applications_current = db.query(func.count(Application.id)).filter(
        Application.created_at >= thirty_days_ago
    ).scalar() or 0
    applications_prev = db.query(func.count(Application.id)).filter(
        Application.created_at < thirty_days_ago,
        Application.created_at >= sixty_days_ago,
    ).scalar() or 0

    # Candidate Signups
    candidate_signups = db.query(func.count(User.id)).filter(
        User.role == "candidate"
    ).scalar() or 0
    signups_current = db.query(func.count(User.id)).filter(
        User.role == "candidate",
        User.created_at >= thirty_days_ago,
    ).scalar() or 0
    signups_prev = db.query(func.count(User.id)).filter(
        User.role == "candidate",
        User.created_at < thirty_days_ago,
        User.created_at >= sixty_days_ago,
    ).scalar() or 0

    # HR Managers
    hr_count = db.query(func.count(User.id)).filter(
        User.role == "hr"
    ).scalar() or 0
    hr_current = db.query(func.count(User.id)).filter(
        User.role == "hr",
        User.created_at >= thirty_days_ago,
    ).scalar() or 0
    hr_prev = db.query(func.count(User.id)).filter(
        User.role == "hr",
        User.created_at < thirty_days_ago,
        User.created_at >= sixty_days_ago,
    ).scalar() or 0

    def calc_change(current: int, previous: int) -> float:
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)

    # ── Applications Trend (last 30 days) ────────────────────────────────

    trend_data = []
    for i in range(30):
        day = now - timedelta(days=29 - i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = db.query(func.count(Application.id)).filter(
            Application.created_at >= day_start,
            Application.created_at < day_end,
        ).scalar() or 0
        trend_data.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": count,
        })

    # ── Applications by Department (from Job.department) ─────────────────

    dept_results = (
        db.query(Job.department, func.count(Application.id))
        .join(Application, Application.job_id == Job.id)
        .group_by(Job.department)
        .all()
    )
    dept_total = sum(count for _, count in dept_results) or 1
    applications_by_department = [
        {
            "department": dept or "Other",
            "count": count,
            "percentage": round((count / dept_total) * 100, 1),
        }
        for dept, count in dept_results
    ]

    if not applications_by_department:
        applications_by_department = [
            {"department": "No Data", "count": 0, "percentage": 0}
        ]

    # ── Recent Applications ──────────────────────────────────────────────

    recent_apps = (
        db.query(Application)
        .order_by(Application.created_at.desc())
        .limit(10)
        .all()
    )
    recent_applications = []
    for app in recent_apps:
        candidate = db.query(Candidate).filter(Candidate.id == app.candidate_id).first()
        job = db.query(Job).filter(Job.id == app.job_id).first()
        recent_applications.append({
            "id": app.id,
            "candidate_name": candidate.name if candidate else "Unknown",
            "job_title": job.title if job else "Unknown",
            "applied_date": app.created_at.isoformat() if app.created_at else None,
            "status": app.stage or "Applied",
        })

    # ── Hiring Funnel ────────────────────────────────────────────────────

    applied_count = db.query(func.count(Application.id)).scalar() or 0
    shortlisted_count = db.query(func.count(Application.id)).filter(
        Application.stage.in_(["Screening", "Shortlisted", "Interview", "Offer", "Hired"])
    ).scalar() or 0
    interview_count = db.query(func.count(Application.id)).filter(
        Application.stage.in_(["Interview", "Offer", "Hired"])
    ).scalar() or 0
    hired_count = db.query(func.count(Application.id)).filter(
        Application.stage.in_(["Offer", "Hired"])
    ).scalar() or 0

    return {
        "active_jobs": active_jobs,
        "active_jobs_change": calc_change(active_jobs, active_jobs_prev) if active_jobs_prev else 0,
        "total_applications": total_applications,
        "total_applications_change": calc_change(applications_current, applications_prev),
        "candidate_signups": candidate_signups,
        "candidate_signups_change": calc_change(signups_current, signups_prev),
        "hr_count": hr_count,
        "hr_count_change": calc_change(hr_current, hr_prev),
        "applications_trend": trend_data,
        "applications_by_department": applications_by_department,
        "recent_applications": recent_applications,
        "hiring_funnel": {
            "applied": applied_count,
            "shortlisted": shortlisted_count,
            "interview": interview_count,
            "hired": hired_count,
            "shortlist_rate": round((shortlisted_count / applied_count) * 100, 1) if applied_count else 0,
            "interview_rate": round((interview_count / shortlisted_count) * 100, 1) if shortlisted_count else 0,
            "hire_rate": round((hired_count / interview_count) * 100, 1) if interview_count else 0,
        },
    }
