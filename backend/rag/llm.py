"""
LLM integration — interpretation only, never invention.

The LLM is used at temperature=0 to:
1. Interpret FAISS similarity scores into normalised section scores (0-100).
2. Flag risks (e.g. short tenure, gaps, over-qualification).
3. Identify mandatory skills from the JD.
"""

from __future__ import annotations

import json
from openai import OpenAI

from rag.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    LLM_MODEL,
    LLM_TEMPERATURE,
)


def _get_client() -> OpenAI:
    return OpenAI(
        api_key=OPENROUTER_API_KEY,
        base_url=OPENROUTER_BASE_URL,
    )


def _call_llm(system_prompt: str, user_prompt: str) -> str:
    client = _get_client()
    response = client.chat.completions.create(
        model=LLM_MODEL,
        temperature=LLM_TEMPERATURE,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    return response.choices[0].message.content.strip()


def extract_mandatory_skills(jd_text: str) -> list[str]:
    """
    Ask the LLM to extract mandatory / required skills from the JD text.
    Returns a list of skill strings.
    """
    system = (
        "You are a precise HR assistant. Extract ONLY the mandatory/required skills "
        "explicitly stated in the job description. Do NOT infer or add any skills that "
        "are not explicitly mentioned. Return a JSON array of strings.\n"
        "Example: [\"Python\", \"AWS\", \"SQL\"]\n"
        "If there are no explicitly mandatory skills, return an empty array []."
    )
    raw = _call_llm(system, f"Job Description:\n\n{jd_text}")
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        skills = json.loads(raw)
        if isinstance(skills, list):
            return [str(s).strip() for s in skills if str(s).strip()]
    except json.JSONDecodeError:
        pass
    return []


def interpret_section_match(
    section_name: str,
    jd_chunks_text: str,
    resume_chunks_text: str,
    similarity_scores: list[float],
    hr_context: str = "",
) -> dict:
    """
    Ask the LLM to interpret the FAISS similarity between JD requirements
    and resume content for a specific section, and return a normalised score.
    """
    avg_sim = sum(similarity_scores) / len(similarity_scores) if similarity_scores else 0.0

    system = (
        "You are a strict resume evaluator. You will be given:\n"
        "1. A section name (skills, experience, or education)\n"
        "2. Job description requirements for that section\n"
        "3. Resume content for that section\n"
        "4. FAISS cosine similarity scores between them\n"
        "5. Optional HR policy context (for reference only)\n\n"
        "Your task:\n"
        "- Evaluate how well the resume section matches the JD requirements.\n"
        "- Produce a normalised score from 0 to 100.\n"
        "- Use the similarity scores as a strong signal but apply judgement.\n"
        "- List any risk flags (gaps, short tenures, over-qualification, etc.).\n"
        "- NEVER invent or infer skills, experience, or education not explicitly "
        "present in the resume text.\n"
        "- If the resume section is empty or missing, score it 0.\n\n"
        "Respond with ONLY a valid JSON object:\n"
        '{"score": <int 0-100>, "reasoning": "<brief explanation>", '
        '"risks": ["<risk1>", ...]}'
    )

    user = (
        f"Section: {section_name}\n\n"
        f"--- JD Requirements ---\n{jd_chunks_text}\n\n"
        f"--- Resume Content ---\n{resume_chunks_text}\n\n"
        f"--- Similarity Scores ---\n"
        f"Individual scores: {similarity_scores}\n"
        f"Average similarity: {avg_sim:.4f}\n"
    )
    if hr_context:
        user += f"\n--- HR Policy Context (reference only) ---\n{hr_context}\n"

    raw = _call_llm(system, user)
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        result = json.loads(raw)
        return {
            "score": max(0, min(100, int(result.get("score", 0)))),
            "reasoning": str(result.get("reasoning", "")),
            "risks": list(result.get("risks", [])),
        }
    except (json.JSONDecodeError, ValueError):
        return {"score": 0, "reasoning": "Failed to parse LLM response.", "risks": []}
