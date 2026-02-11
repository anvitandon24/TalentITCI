"""initial_schema

Revision ID: 8182e59db549
Revises: 
Create Date: 2026-02-11 10:31:12.164744

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8182e59db549'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- 1. users ---
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("email", sa.String, unique=True, nullable=False),
        sa.Column("password_hash", sa.String, nullable=True),
        sa.Column("role", sa.String, nullable=False),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # --- 2. candidates ---
    op.create_table(
        "candidates",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("status", sa.String, server_default="Applied"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_candidates_user_id", "candidates", ["user_id"])

    # --- 3. jobs ---
    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("title", sa.String, nullable=False),
        sa.Column("department", sa.String, nullable=False),
        sa.Column("location", sa.String, server_default="Remote"),
        sa.Column("type", sa.String, server_default="Full-time"),
        sa.Column("status", sa.String, server_default="Open"),
        sa.Column("posted", sa.String, server_default="Just now"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # --- 4. resumes ---
    op.create_table(
        "resumes",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("candidate_id", sa.Integer, sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_name", sa.String, nullable=False),
        sa.Column("file_path", sa.String, nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_resumes_candidate_id", "resumes", ["candidate_id"])

    # --- 5. applications ---
    op.create_table(
        "applications",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("candidate_id", sa.Integer, sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", sa.Integer, sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stage", sa.String, server_default="Applied"),
        sa.Column("score", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("candidate_id", "job_id", name="uq_application_candidate_job"),
    )
    op.create_index("ix_applications_candidate_id", "applications", ["candidate_id"])
    op.create_index("ix_applications_job_id", "applications", ["job_id"])


def downgrade() -> None:
    op.drop_table("applications")
    op.drop_table("resumes")
    op.drop_table("jobs")
    op.drop_table("candidates")
    op.drop_table("users")
