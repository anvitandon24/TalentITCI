"""
Database seed script.
Run directly:  python seed_data.py
Or import and call seed_data(session).

10.1 – Fixed: seed data now creates complete records with password hashes
       so seeded users can actually log in.
"""

import os
import sys

# Ensure the backend directory is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

from database.connection import SessionLocal
from database.models import User, Candidate, Job, Resume, Application
from auth.utils import hash_password


# Default password for all seeded accounts
SEED_PASSWORD = os.getenv("SEED_PASSWORD", "Test1234")


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

        hashed = hash_password(SEED_PASSWORD)

        # ── Admin user ────────────────────────────────────────────────────
        admin_user = User(
            name="Admin",
            email="admin@talentai.com",
            password_hash=hashed,
            role="admin",
        )
        db.add(admin_user)
        db.flush()

        # ── HR user ───────────────────────────────────────────────────────
        hr_user = User(
            name="HR Manager",
            email="hr@talentai.com",
            password_hash=hashed,
            role="hr",
        )
        db.add(hr_user)
        db.flush()

        # ── Candidate Users (3) ──────────────────────────────────────────
        user1 = User(name="Joe", email="joe@test.com", password_hash=hashed, role="candidate")
        user2 = User(name="Glenn", email="glenn@test.com", password_hash=hashed, role="candidate")
        user3 = User(name="Sasha", email="sasha@test.com", password_hash=hashed, role="candidate")
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
        job5 = Job(
            title=".NET Full Stack Engineer",
            department="Engineering",
            location="Remote",
            type="Contract",
            posted="1 day ago",
            status="Open",
        )
        db.add_all([job1, job2, job3, job4, job5])
        db.flush()

        # ── Applications (3) — no fake scores, let RAG handle scoring ────
        app1 = Application(candidate_id=cand1.id, job_id=job1.id, stage="Applied")
        app2 = Application(candidate_id=cand2.id, job_id=job1.id, stage="Applied")
        app3 = Application(candidate_id=cand3.id, job_id=job2.id, stage="Applied")
        db.add_all([app1, app2, app3])

        db.commit()
        print("Database seeded successfully!")
        print(f"  Admin:     admin@talentai.com / {SEED_PASSWORD}")
        print(f"  HR:        hr@talentai.com / {SEED_PASSWORD}")
        print(f"  Candidate: joe@test.com / {SEED_PASSWORD}")
        print(f"  Candidate: glenn@test.com / {SEED_PASSWORD}")
        print(f"  Candidate: sasha@test.com / {SEED_PASSWORD}")

    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        if close_after:
            db.close()


if __name__ == "__main__":
    seed_data()
