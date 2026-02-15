"""
Main evaluation pipeline — callable from the FastAPI backend.

Single entry point:
    evaluate_resume(resume_bytes, jd_bytes, hr_policy_bytes=None) -> dict

Takes raw PDF bytes (from LargeBinary columns), runs the full RAG
pipeline, and returns the structured result dictionary.
"""

from __future__ import annotations

import logging

from rag.pdf_extractor import extract_text_from_bytes
from rag.chunker import chunk_document, Chunk
from rag.vector_store import VectorStore
from rag.llm import extract_mandatory_skills, interpret_section_match
from rag.scorer import check_mandatory_skills, build_result

logger = logging.getLogger(__name__)


def _collect_text_for_section(chunks: list[Chunk], sections: list[str]) -> str:
    return "\n\n".join(c.text for c in chunks if c.section in sections)


def _get_similarity_scores(
    jd_store: VectorStore,
    resume_chunks: list[Chunk],
    jd_sections: list[str],
    resume_sections: list[str],
) -> list[float]:
    scores: list[float] = []
    relevant_resume = [c for c in resume_chunks if c.section in resume_sections]
    for rc in relevant_resume:
        results = jd_store.search_by_section(rc.text, section_filter=jd_sections, top_k=3)
        if results:
            best_score = max(s for _, s in results)
            scores.append(best_score)
    return scores


def evaluate_resume(
    resume_pdf_bytes: bytes,
    jd_pdf_bytes: bytes,
    hr_policy_pdf_bytes: bytes | None = None,
) -> dict:
    """
    Run the full RAG evaluation pipeline on in-memory PDF bytes.

    Parameters
    ----------
    resume_pdf_bytes   : raw bytes of the candidate's resume PDF
    jd_pdf_bytes       : raw bytes of the job description PDF
    hr_policy_pdf_bytes: raw bytes of the HR policy PDF (optional)

    Returns
    -------
    dict with keys: overall_score, status, section_scores, mandatory_skills,
    missing_mandatory_skills, risk_flags, note, section_reasoning
    """
    logger.info("RAG evaluation starting...")

    # 3.2 – Proper error handling in RAG pipeline
    try:
        # 1. Extract text
        resume_text = extract_text_from_bytes(resume_pdf_bytes)
    except Exception as e:
        logger.error(f"Failed to extract text from resume PDF: {e}")
        raise ValueError(f"Failed to extract text from resume PDF: {e}") from e

    try:
        jd_text = extract_text_from_bytes(jd_pdf_bytes)
    except Exception as e:
        logger.error(f"Failed to extract text from JD PDF: {e}")
        raise ValueError(f"Failed to extract text from job description PDF: {e}") from e

    hr_text = ""
    if hr_policy_pdf_bytes:
        try:
            hr_text = extract_text_from_bytes(hr_policy_pdf_bytes)
        except Exception as e:
            logger.warning(f"Failed to extract text from HR policy PDF (non-critical): {e}")
            hr_text = ""

    # 2. Chunk documents
    try:
        resume_chunks = chunk_document(resume_text, source="resume")
        jd_chunks = chunk_document(jd_text, source="job_description")
        hr_chunks = chunk_document(hr_text, source="hr_policy") if hr_text else []
    except Exception as e:
        logger.error(f"Chunking failed: {e}")
        raise ValueError(f"Document chunking failed: {e}") from e

    logger.info(f"Chunks — Resume: {len(resume_chunks)}, JD: {len(jd_chunks)}, HR: {len(hr_chunks)}")

    # 3. Build FAISS index for JD
    try:
        jd_store = VectorStore(jd_chunks)
    except Exception as e:
        logger.error(f"Failed to build vector store: {e}")
        raise ValueError(f"Failed to build vector index: {e}") from e

    hr_context = "\n\n".join(c.text for c in hr_chunks[:3]) if hr_chunks else ""

    # 4. Extract mandatory skills from JD
    try:
        mandatory_skills = extract_mandatory_skills(jd_text)
        logger.info(f"Mandatory skills found: {mandatory_skills}")
    except Exception as e:
        logger.warning(f"Failed to extract mandatory skills (continuing without): {e}")
        mandatory_skills = []

    # 5. Check mandatory skills against resume (but DON'T auto-disqualify)
    missing_mandatory = check_mandatory_skills(mandatory_skills, resume_text)
    if missing_mandatory:
        logger.info(f"Missing mandatory skills (penalty will be applied): {missing_mandatory}")

    # 6. Section-by-section evaluation — ALWAYS run, even with missing skills
    section_configs = [
        {
            "name": "skills",
            "jd_sections": ["required_skills", "mandatory_skills", "skills", "other"],
            "resume_sections": ["skills", "other"],
        },
        {
            "name": "experience",
            "jd_sections": ["experience", "other"],
            "resume_sections": ["experience", "other"],
        },
        {
            "name": "education",
            "jd_sections": ["education", "other"],
            "resume_sections": ["education", "other"],
        },
    ]

    section_scores: dict[str, int] = {}
    all_risks: list[str] = []
    section_reasoning: dict[str, str] = {}

    for cfg in section_configs:
        name = cfg["name"]
        logger.info(f"Evaluating section: {name}")

        try:
            sim_scores = _get_similarity_scores(
                jd_store, resume_chunks,
                jd_sections=cfg["jd_sections"],
                resume_sections=cfg["resume_sections"],
            )

            jd_text_section = _collect_text_for_section(jd_chunks, cfg["jd_sections"])
            resume_text_section = _collect_text_for_section(resume_chunks, cfg["resume_sections"])

            llm_result = interpret_section_match(
                section_name=name,
                jd_chunks_text=jd_text_section,
                resume_chunks_text=resume_text_section,
                similarity_scores=sim_scores,
                hr_context=hr_context,
            )

            section_scores[name] = llm_result["score"]
            section_reasoning[name] = llm_result["reasoning"]
            all_risks.extend(llm_result.get("risks", []))
        except Exception as e:
            logger.error(f"Error evaluating section '{name}': {e}")
            section_scores[name] = 0
            section_reasoning[name] = f"Evaluation error for {name} section: {str(e)[:200]}"

    # Add risk flag for missing mandatory skills
    if missing_mandatory:
        all_risks.append(
            f"Missing {len(missing_mandatory)} mandatory skill(s): {', '.join(missing_mandatory)}. "
            "Heavy penalty applied."
        )

    # 7. Assemble final result (penalty is applied inside build_result)
    result = build_result(
        skills_score=section_scores.get("skills", 0),
        experience_score=section_scores.get("experience", 0),
        education_score=section_scores.get("education", 0),
        mandatory_skills=mandatory_skills,
        missing_mandatory=missing_mandatory,
        risks=list(set(all_risks)),
        section_reasoning=section_reasoning,
    )

    logger.info(f"RAG evaluation complete. Score: {result['overall_score']}, Status: {result['status']}")
    return result
