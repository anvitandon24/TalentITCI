"""
Deterministic scoring engine.

Weights: skills 50%, experience 30%, education 20%.
Rule:    If mandatory skills are missing -> heavy penalty (not auto-fail).
         3.3 – Threshold is configurable via PASS_THRESHOLD env var.
"""

from __future__ import annotations
import os

from rag.config import WEIGHT_SKILLS, WEIGHT_EXPERIENCE, WEIGHT_EDUCATION

# 3.3 – Configurable scoring threshold (default: 40)
PASS_THRESHOLD = int(os.getenv("RAG_PASS_THRESHOLD", "40"))


def check_mandatory_skills(mandatory_skills: list[str], resume_text: str) -> list[str]:
    """
    Return the list of mandatory skills NOT found in the resume text.
    Uses case-insensitive substring matching.
    """
    resume_lower = resume_text.lower()
    missing: list[str] = []
    for skill in mandatory_skills:
        if skill.strip().lower() not in resume_lower:
            missing.append(skill.strip())
    return missing


def compute_overall_score(
    skills_score: int,
    experience_score: int,
    education_score: int,
) -> int:
    raw = (
        skills_score * (WEIGHT_SKILLS / 100)
        + experience_score * (WEIGHT_EXPERIENCE / 100)
        + education_score * (WEIGHT_EDUCATION / 100)
    )
    return max(0, min(100, round(raw)))


def compute_penalty_for_missing_skills(
    total_mandatory: int,
    missing_count: int,
) -> float:
    """
    Return a multiplier (0.0 to 1.0) to apply to the skills score.
    Heavy penalty per missing skill, but NOT automatic zero.
    - Missing 1 of 5 skills -> 30% penalty on skills
    - Missing 2 of 5 skills -> 55% penalty on skills
    - Missing all -> 85% penalty (still get 15% base from other partial matches)
    """
    if total_mandatory == 0 or missing_count == 0:
        return 1.0
    ratio = missing_count / total_mandatory
    # Quadratic penalty: harsh but not absolute zero
    penalty = 1.0 - (0.85 * (ratio ** 0.7))
    return max(0.15, min(1.0, penalty))


def build_result(
    skills_score: int,
    experience_score: int,
    education_score: int,
    mandatory_skills: list[str],
    missing_mandatory: list[str],
    risks: list[str],
    section_reasoning: dict[str, str],
) -> dict:
    has_missing = len(missing_mandatory) > 0

    if has_missing and mandatory_skills:
        # Apply heavy penalty instead of auto-failing
        penalty_multiplier = compute_penalty_for_missing_skills(
            len(mandatory_skills), len(missing_mandatory)
        )
        penalized_skills_score = max(0, round(skills_score * penalty_multiplier))
        overall = compute_overall_score(penalized_skills_score, experience_score, education_score)
    else:
        overall = compute_overall_score(skills_score, experience_score, education_score)

    status = "PASS" if overall >= PASS_THRESHOLD else "FAIL"

    result: dict = {
        "overall_score": overall,
        "status": status,
        "section_scores": {
            "skills": {"score": skills_score, "weight": f"{WEIGHT_SKILLS}%"},
            "experience": {"score": experience_score, "weight": f"{WEIGHT_EXPERIENCE}%"},
            "education": {"score": education_score, "weight": f"{WEIGHT_EDUCATION}%"},
        },
        "mandatory_skills": mandatory_skills,
        "missing_mandatory_skills": missing_mandatory,
    }

    if risks:
        result["risk_flags"] = risks

    if has_missing:
        result["note"] = (
            f"PENALTY: Candidate is missing {len(missing_mandatory)} of "
            f"{len(mandatory_skills)} mandatory skill(s): "
            f"{', '.join(missing_mandatory)}. "
            f"Heavy penalty applied to skills score. Final score: {overall}/100."
        )
    elif overall < 50:
        result["note"] = (
            f"Low score ({overall}/100). The candidate does not meet the threshold "
            "for this position based on JD requirements."
        )

    if section_reasoning:
        result["section_reasoning"] = section_reasoning

    return result
