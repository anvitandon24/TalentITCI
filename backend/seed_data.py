"""
Database seed script.
Run directly:  python seed_data.py
Or import and call seed_data(session).
"""

import os
import sys

# Ensure the backend directory is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

from database.connection import SessionLocal
from database.models import User, Candidate, Job, Resume, Application


def seed_data(db=None):
    """Insert seed rows if the DB is empty. Accepts an optional session."""
    close_after = False
    if db is None:
        db = SessionLocal()
        close_after = True

    try:
        # Prevent re-seeding
        if db.query(User).first() is not None:
            print("Database already seeded — skipping.")
            return

        # ── Users (3 candidates) ──────────────────────────────────────────
        user1 = User(name="Joe", email="joe@test.com", role="candidate")
        user2 = User(name="Glenn", email="glenn@test.com", role="candidate")
        user3 = User(name="Sasha", email="sasha@test.com", role="candidate")
        db.add_all([user1, user2, user3])
        db.flush()

        # ── Candidates ────────────────────────────────────────────────────
        cand1 = Candidate(user_id=user1.id, name="Joe", status="Applied")
        cand2 = Candidate(user_id=user2.id, name="Glenn", status="Screening")
        cand3 = Candidate(user_id=user3.id, name="Sasha", status="Interview")
        db.add_all([cand1, cand2, cand3])
        db.flush()

        # ── Jobs (4) ─────────────────────────────────────────────────────
        job1 = Job(
            title="Senior Frontend Developer",
            department="Engineering",
            location="New York (Hybrid)",
            type="Full-time",
            posted="2 days ago",
            status="Open",
        )
        job2 = Job(
            title="Backend Engineer",
            department="Engineering",
            location="Remote",
            type="Full-time",
            posted="5 days ago",
            status="Open",
        )
        job3 = Job(
            title="Product Manager",
            department="Product",
            location="London, UK",
            type="Contract",
            posted="1 week ago",
            status="Open",
        )
        job4 = Job(
            title="Sales Manager",
            department="Sales",
            location="Bangalore, India",
            type="Full-time",
            posted="1 week ago",
            status="Open",
        )
        db.add_all([job1, job2, job3, job4])
        db.flush()

        # ── Resumes (2) ──────────────────────────────────────────────────
        resume1 = Resume(
            candidate_id=cand1.id,
            file_name="joe_resume.pdf",
            file_path="uploads/1_joe_resume.pdf",
        )
        resume2 = Resume(
            candidate_id=cand2.id,
            file_name="glenn_resume.pdf",
            file_path="uploads/2_glenn_resume.pdf",
        )
        db.add_all([resume1, resume2])
        db.flush()

        # ── Applications (3) ─────────────────────────────────────────────
        app1 = Application(candidate_id=cand1.id, job_id=job1.id, stage="Applied", score=70)
        app2 = Application(candidate_id=cand2.id, job_id=job1.id, stage="Screening", score=85)
        app3 = Application(candidate_id=cand3.id, job_id=job2.id, stage="Applied", score=None)
        db.add_all([app1, app2, app3])

        db.commit()
        print("Database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        if close_after:
            db.close()


if __name__ == "__main__":
    seed_data()
