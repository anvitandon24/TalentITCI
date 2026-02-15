"""
Deterministic scoring engine.

Weights: skills 50%, experience 30%, education 20%.
Rule:    If ANY mandatory skill is missing → FAIL, overall_score = 0.
"""

from __future__ import annotations

from src.config import WEIGHT_SKILLS, WEIGHT_EXPERIENCE, WEIGHT_EDUCATION


def check_mandatory_skills(mandatory_skills: list[str], resume_text: str) -> list[str]:
    """
    Return the list of mandatory skills NOT found in the resume text.
    Uses case-insensitive substring matching.
    """
    resume_lower = resume_text.lower()
    missing: list[str] = []
    for skill in mandatory_skills:
        # check for the skill as a whole phrase
        if skill.strip().lower() not in resume_lower:
            missing.append(skill.strip())
    return missing


def compute_overall_score(
    skills_score: int,
    experience_score: int,
    education_score: int,
) -> int:
    """
    Compute the weighted overall score (0-100).
    Strictly deterministic — pure arithmetic, no randomness.
    """
    raw = (
        skills_score * (WEIGHT_SKILLS / 100)
        + experience_score * (WEIGHT_EXPERIENCE / 100)
        + education_score * (WEIGHT_EDUCATION / 100)
    )
    return max(0, min(100, round(raw)))


def build_result(
    skills_score: int,
    experience_score: int,
    education_score: int,
    mandatory_skills: list[str],
    missing_mandatory: list[str],
    risks: list[str],
    section_reasoning: dict[str, str],
) -> dict:
    """
    Assemble the final evaluation result dictionary.

    If any mandatory skill is missing → FAIL with overall_score = 0.
    """
    is_fail = len(missing_mandatory) > 0
    overall = 0 if is_fail else compute_overall_score(
        skills_score, experience_score, education_score
    )
    status = "FAIL" if is_fail else ("PASS" if overall >= 40 else "FAIL")

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

    # short note only if score is low or failed
    if is_fail:
        result["note"] = (
            f"FAIL: Candidate is missing {len(missing_mandatory)} mandatory skill(s): "
            f"{', '.join(missing_mandatory)}. Overall score forced to 0."
        )
    elif overall < 50:
        result["note"] = (
            f"Low score ({overall}/100). The candidate does not meet the threshold "
            "for this position based on JD requirements."
        )

    # include per-section reasoning for transparency
    if section_reasoning:
        result["section_reasoning"] = section_reasoning

    return result
