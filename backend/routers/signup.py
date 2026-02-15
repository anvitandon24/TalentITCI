from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models import User, Candidate

router = APIRouter(tags=["Signup"])


@router.post("/signup")
def signup(name: str, email: str, role: str = "candidate", db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="User already exists with this email")

    user = User(name=name, email=email, role=role)
    db.add(user)
    db.flush()

    result_user = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }

    if role == "candidate":
        candidate = Candidate(user_id=user.id, name=name, status="Applied")
        db.add(candidate)
        db.flush()
        result_user["candidate_id"] = candidate.id
        result_user["status"] = candidate.status

    db.commit()
    return {"message": "Signup successful", "user": result_user}
