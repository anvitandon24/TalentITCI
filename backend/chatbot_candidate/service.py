"""
Service layer for the Candidate Career AI Assistant.
Orchestrates data loading, embedding, retrieval, and LLM generation.
"""

import logging
from typing import Optional

from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

from chatbot.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    GOOGLE_API_KEY,
    LLM_MODEL,
)
from database.connection import SessionLocal
from database.models import Resume, Job, Candidate
from rag.pdf_extractor import extract_text_from_bytes
from chatbot_candidate.embeddings import (
    ensure_resume_indexed,
    ensure_company_knowledge_indexed,
    ensure_job_knowledge_indexed,
)
from chatbot_candidate.retriever import (
    classify_intent,
    retrieve_for_candidate_fit,
    retrieve_for_company_info,
    retrieve_for_job_info,
    retrieve_for_job_recommendation,
)
from chatbot_candidate.prompts import (
    CAREER_ASSISTANT_SYSTEM_PROMPT,
    RAG_GENERATION_PROMPT,
    JOB_RECOMMENDATION_PROMPT,
    FALLBACK_PROMPT,
)

logger = logging.getLogger(__name__)

# ── LLM (lazy init) ──────────────────────────────────────────────────────
_llm = None


def _get_llm():
    global _llm
    if _llm is not None:
        return _llm

    if OPENROUTER_API_KEY:
        _llm = ChatOpenAI(
            model=LLM_MODEL,
            api_key=OPENROUTER_API_KEY,
            base_url=OPENROUTER_BASE_URL,
            temperature=0.3,
        )
    elif GOOGLE_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        _llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=GOOGLE_API_KEY,
            temperature=0.3,
        )
    else:
        raise RuntimeError("No LLM configured for candidate chatbot.")
    return _llm


# ── Data loading ──────────────────────────────────────────────────────────


def _load_candidate_resume(candidate_id: int, db) -> Optional[tuple[str, bytes]]:
    """Load and extract text from the candidate's latest resume."""
    resume = (
        db.query(Resume)
        .filter(Resume.candidate_id == candidate_id, Resume.file_data.isnot(None))
        .order_by(Resume.created_at.desc())
        .first()
    )
    if not resume or not resume.file_data:
        return None

    try:
        text = extract_text_from_bytes(resume.file_data)
        return text, resume.file_data
    except Exception as e:
        logger.error(f"Failed to extract resume text for candidate {candidate_id}: {e}")
        return None


def _load_all_jobs(db) -> list[dict]:
    """Load all jobs with their metadata."""
    jobs = db.query(Job).all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "department": j.department,
            "location": j.location,
            "type": j.type,
            "status": j.status,
        }
        for j in jobs
    ]


def _load_hr_policies(db) -> list[tuple[int, str, bytes]]:
    """Load HR policy PDFs from all jobs that have them."""
    jobs = db.query(Job).filter(Job.hr_policy_pdf.isnot(None)).all()
    policies = []
    for job in jobs:
        try:
            text = extract_text_from_bytes(job.hr_policy_pdf)
            policies.append((job.id, text, job.hr_policy_pdf))
        except Exception as e:
            logger.warning(f"Couldn't extract HR policy for job {job.id}: {e}")
    return policies


def _load_job_descriptions(db) -> list[tuple[int, str, str, bytes]]:
    """Load job description PDFs from all jobs that have them."""
    jobs = db.query(Job).filter(Job.job_description_pdf.isnot(None)).all()
    descriptions = []
    for job in jobs:
        try:
            text = extract_text_from_bytes(job.job_description_pdf)
            descriptions.append((job.id, job.title, text, job.job_description_pdf))
        except Exception as e:
            logger.warning(f"Couldn't extract JD for job {job.id}: {e}")
    return descriptions


# ── Build conversation history ────────────────────────────────────────────


def _build_history_section(history: list[dict]) -> str:
    """Build a history section string from conversation history."""
    if not history:
        return ""
    lines = []
    for entry in history[-10:]:  # last 10 turns
        role = "Candidate" if entry.get("role") == "user" else "Assistant"
        lines.append(f"{role}: {entry.get('content', '')}")
    return f"Conversation History:\n" + "\n".join(lines) + "\n"


# ── Main handler ──────────────────────────────────────────────────────────


async def handle_candidate_chat(
    candidate_id: int,
    message: str,
    history: list[dict] = None,
) -> dict:
    """
    Main entry point for candidate chat.
    Returns {answer, sources, recommended_jobs}.
    """
    if history is None:
        history = []

    db = SessionLocal()
    try:
        # STEP 1 — Load candidate resume
        resume_data = _load_candidate_resume(candidate_id, db)
        has_resume = resume_data is not None

        # STEP 2 — Load company knowledge (HR policies)
        hr_policies = _load_hr_policies(db)

        # STEP 3 — Load job descriptions
        job_descriptions = _load_job_descriptions(db)
        all_jobs = _load_all_jobs(db)

        # STEP 4 — Create embeddings (with caching)
        if has_resume:
            resume_text, resume_bytes = resume_data
            ensure_resume_indexed(candidate_id, resume_text, resume_bytes)

        if hr_policies:
            ensure_company_knowledge_indexed(hr_policies)

        if job_descriptions:
            ensure_job_knowledge_indexed(job_descriptions)

        # Build history section
        history_section = _build_history_section(history)

        # STEP 5 — Classify intent
        intent = classify_intent(message)

        # STEP 6 — Retrieve context based on intent
        context = ""
        sources = []
        recommended_jobs = []

        if intent == "candidate_fit":
            if not has_resume:
                return {
                    "answer": "I don't have your resume on file yet. Please upload your resume first so I can provide personalized career advice and evaluate your fit for jobs.",
                    "sources": [],
                    "recommended_jobs": [],
                }
            context, sources = retrieve_for_candidate_fit(message, candidate_id)

        elif intent == "company_info":
            context, sources = retrieve_for_company_info(message)

        elif intent == "job_info":
            context, sources = retrieve_for_job_info(message)

        elif intent == "job_recommendation":
            if not has_resume:
                return {
                    "answer": "I'd love to recommend jobs for you, but I need your resume first. Please upload it so I can match you with the most suitable positions.",
                    "sources": [],
                    "recommended_jobs": [],
                }
            resume_context, jobs_context, recommended_jobs = retrieve_for_job_recommendation(
                candidate_id, all_jobs
            )
            # Use special recommendation prompt
            prompt = PromptTemplate(
                template=JOB_RECOMMENDATION_PROMPT,
                input_variables=["history_section", "resume_context", "jobs_context", "question"],
            )
            chain = prompt | _get_llm()
            response = chain.invoke({
                "history_section": history_section,
                "resume_context": resume_context,
                "jobs_context": jobs_context,
                "question": message,
            })
            return {
                "answer": response.content,
                "sources": ["resume", "job"],
                "recommended_jobs": recommended_jobs,
            }

        else:  # general_chat
            prompt = PromptTemplate(
                template=FALLBACK_PROMPT,
                input_variables=["history_section", "question"],
            )
            chain = prompt | _get_llm()
            response = chain.invoke({
                "history_section": history_section,
                "question": message,
            })
            return {
                "answer": response.content,
                "sources": [],
                "recommended_jobs": [],
            }

        # STEP 7 — Generate response with context
        if not context:
            context = "No relevant information found in the knowledge base for this query."

        prompt = PromptTemplate(
            template=RAG_GENERATION_PROMPT,
            input_variables=["history_section", "context", "question"],
        )
        chain = prompt | _get_llm()
        response = chain.invoke({
            "history_section": history_section,
            "context": context,
            "question": message,
        })

        return {
            "answer": response.content,
            "sources": sources,
            "recommended_jobs": recommended_jobs,
        }

    except Exception as e:
        logger.error(f"Candidate chat error: {e}", exc_info=True)
        return {
            "answer": "I'm sorry, I encountered an error processing your request. Please try again.",
            "sources": [],
            "recommended_jobs": [],
        }
    finally:
        db.close()
