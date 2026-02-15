import os
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from database.connection import get_db
from database.models import User, Candidate
from auth.schemas import (
    RegisterRequest,
    LoginRequest,
    GoogleAuthRequest,
    RefreshRequest,
    TokenResponse,
    UserResponse,
)
from auth.utils import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from auth.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")


# ── Helpers ───────────────────────────────────────────────────────────────

def _build_token_response(user: User, db: Session) -> TokenResponse:
    """Create a full TokenResponse with access + refresh tokens for a user."""
    candidate_id = None
    if user.role == "candidate" and user.candidate:
        candidate_id = user.candidate.id

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        candidate_id=candidate_id,
    )

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_resp,
    )


# ── POST /auth/register ──────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user with email + password."""

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        role=payload.role,
    )
    db.add(user)
    db.flush()

    # If registering as a candidate, also create a Candidate record
    if payload.role == "candidate":
        candidate = Candidate(user_id=user.id, name=payload.name, status="Applied")
        db.add(candidate)
        db.flush()

    db.commit()
    db.refresh(user)

    logger.info(f"New user registered: {user.email} (role={user.role})")
    return _build_token_response(user, db)


# ── POST /auth/login ─────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email + password and return JWT tokens."""

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account uses Google sign-in. Please log in with Google.",
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    logger.info(f"User logged in: {user.email}")
    return _build_token_response(user, db)


# ── POST /auth/google ────────────────────────────────────────────────────

@router.post("/google", response_model=TokenResponse)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Verify a Google OAuth ID token and create/update the user."""

    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured on the server",
        )

    # Verify the Google ID token
    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        logger.error(f"Google token verification failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )

    email: str | None = idinfo.get("email")
    name: str = idinfo.get("name", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account does not have an email",
        )

    user = db.query(User).filter(User.email == email).first()

    if user:
        # Existing user – update name if Google provides a better one
        if name and user.name != name:
            user.name = name
            db.commit()
            db.refresh(user)
        logger.info(f"Existing user signed in via Google: {email}")
    else:
        # New user via Google – password_hash stays NULL
        user = User(
            email=email,
            password_hash=None,
            name=name or email.split("@")[0],
            role="candidate",
        )
        db.add(user)
        db.flush()

        # Also create a candidate record
        candidate = Candidate(user_id=user.id, name=user.name, status="Applied")
        db.add(candidate)
        db.flush()

        db.commit()
        db.refresh(user)
        logger.info(f"New user created via Google: {email}")

    return _build_token_response(user, db)


# ── POST /auth/refresh ───────────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new access + refresh token pair."""

    token_data = decode_token(payload.refresh_token)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if token_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type – expected refresh token",
        )

    user_id: str | None = token_data.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return _build_token_response(user, db)


# ── GET /auth/me ──────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the currently authenticated user's info."""
    candidate_id = None
    if current_user.role == "candidate" and current_user.candidate:
        candidate_id = current_user.candidate.id

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        candidate_id=candidate_id,
    )
