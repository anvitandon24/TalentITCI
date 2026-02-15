from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, UniqueConstraint, Index,
    LargeBinary, Text, JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.connection import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=True)
    role = Column(String, nullable=False)          # 'candidate', 'hr', or 'admin'
    name = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # one-to-one with candidate (only if role == 'candidate')
    candidate = relationship("Candidate", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = Column(String, nullable=False)
    status = Column(String, default="Applied")     # Applied, Screening, Interview, Offer, Rejected
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="candidate")
    resumes = relationship("Resume", back_populates="candidate", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="candidate", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_candidates_user_id", "user_id"),
    )


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    department = Column(String, nullable=False)
    location = Column(String, default="Remote")
    type = Column(String, default="Full-time")
    status = Column(String, default="Open")
    posted = Column(String, default="Just now")
    created_at = Column(DateTime, server_default=func.now())

    # ── PDF documents uploaded by HR ──────────────────────────────────────
    job_description_pdf = Column(LargeBinary, nullable=True)
    job_description_filename = Column(String, nullable=True)
    hr_policy_pdf = Column(LargeBinary, nullable=True)
    hr_policy_filename = Column(String, nullable=True)

    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=True)      # kept for backwards compat, can be null now
    file_data = Column(LargeBinary, nullable=True)  # actual PDF binary
    created_at = Column(DateTime, server_default=func.now())

    candidate = relationship("Candidate", back_populates="resumes")

    __table_args__ = (
        Index("ix_resumes_candidate_id", "candidate_id"),
    )


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    stage = Column(String, default="Applied")
    score = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # ── RAG evaluation results ────────────────────────────────────────────
    rag_score = Column(Integer, nullable=True)         # overall AI score 0-100
    rag_status = Column(String, nullable=True)         # PASS / FAIL
    rag_reasoning = Column(Text, nullable=True)        # human-readable summary
    rag_details = Column(JSON, nullable=True)          # full JSON from the pipeline

    candidate = relationship("Candidate", back_populates="applications")
    job = relationship("Job", back_populates="applications")

    __table_args__ = (
        UniqueConstraint("candidate_id", "job_id", name="uq_application_candidate_job"),
        Index("ix_applications_candidate_id", "candidate_id"),
        Index("ix_applications_job_id", "job_id"),
    )
