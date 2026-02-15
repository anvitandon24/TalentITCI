"""
Retrieval logic for the Candidate Career AI Assistant.
Routes queries to appropriate Chroma collections based on intent.
"""

import json
import logging
from typing import Optional

from langchain_core.documents import Document
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

from chatbot.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    GOOGLE_API_KEY,
    LLM_MODEL,
)
from chatbot_candidate.prompts import INTENT_CLASSIFICATION_PROMPT
from chatbot_candidate.embeddings import similarity_search, similarity_search_with_score

logger = logging.getLogger(__name__)

# ── LLM (lazy init, same provider as HR chatbot) ─────────────────────────
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
            temperature=0,
        )
    elif GOOGLE_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        _llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=GOOGLE_API_KEY,
            temperature=0,
        )
    else:
        raise RuntimeError("No LLM configured for candidate chatbot.")
    return _llm


# ── Intent classification ─────────────────────────────────────────────────


def classify_intent(query: str) -> str:
    """Classify user query intent using LLM."""
    try:
        prompt = PromptTemplate(
            template=INTENT_CLASSIFICATION_PROMPT,
            input_variables=["query"],
        )
        chain = prompt | _get_llm() | JsonOutputParser()
        result = chain.invoke({"query": query})
        intent = result.get("intent", "general_chat")
        logger.info(f"Classified intent: {intent}")
        return intent
    except Exception as e:
        logger.error(f"Intent classification failed: {e}")
        return "general_chat"


# ── Retrieval functions ───────────────────────────────────────────────────


def retrieve_for_candidate_fit(
    query: str,
    candidate_id: int,
) -> tuple[str, list[str]]:
    """
    Retrieve context for candidate fit questions.
    Searches resume + job descriptions.
    """
    sources = []
    context_parts = []

    # Search candidate resume
    resume_collection = f"candidate_{candidate_id}_resume"
    resume_docs = similarity_search(resume_collection, query, k=3)
    if resume_docs:
        context_parts.append("=== Candidate Resume ===")
        context_parts.extend([doc.page_content for doc in resume_docs])
        sources.append("resume")

    # Search job descriptions
    job_docs = similarity_search("job_knowledge", query, k=3)
    if job_docs:
        context_parts.append("\n=== Relevant Job Descriptions ===")
        for doc in job_docs:
            title = doc.metadata.get("job_title", "Unknown")
            context_parts.append(f"[Job: {title}]\n{doc.page_content}")
        sources.append("job")

    return "\n\n".join(context_parts), sources


def retrieve_for_company_info(query: str) -> tuple[str, list[str]]:
    """
    Retrieve context for company/policy questions.
    Searches HR policy documents.
    """
    sources = []
    context_parts = []

    docs = similarity_search("company_knowledge", query, k=4)
    if docs:
        context_parts.append("=== Company Knowledge (HR Policies) ===")
        context_parts.extend([doc.page_content for doc in docs])
        sources.append("company")

    return "\n\n".join(context_parts), sources


def retrieve_for_job_info(query: str) -> tuple[str, list[str]]:
    """
    Retrieve context for specific job role questions.
    Searches job descriptions.
    """
    sources = []
    context_parts = []

    docs = similarity_search("job_knowledge", query, k=4)
    if docs:
        context_parts.append("=== Job Descriptions ===")
        for doc in docs:
            title = doc.metadata.get("job_title", "Unknown")
            context_parts.append(f"[Job: {title}]\n{doc.page_content}")
        sources.append("job")

    # Also check company knowledge for supplementary info
    company_docs = similarity_search("company_knowledge", query, k=2)
    if company_docs:
        context_parts.append("\n=== Company Context ===")
        context_parts.extend([doc.page_content for doc in company_docs])
        sources.append("company")

    return "\n\n".join(context_parts), sources


def retrieve_for_job_recommendation(
    candidate_id: int,
    all_jobs: list[dict],
) -> tuple[str, str, list[dict]]:
    """
    Compute similarity between resume and all job descriptions.
    Returns (resume_context, jobs_context, ranked_jobs).
    """
    resume_collection = f"candidate_{candidate_id}_resume"

    # Get the candidate's resume summary
    resume_docs = similarity_search(
        resume_collection,
        "candidate skills experience qualifications education",
        k=5,
    )
    resume_context = "\n".join([doc.page_content for doc in resume_docs]) if resume_docs else "No resume data available."

    # For each job, compute relevance by searching job_knowledge with resume text
    ranked_jobs = []
    if resume_context and resume_context != "No resume data available.":
        # Use the resume as the query against job knowledge
        scored_results = similarity_search_with_score(
            "job_knowledge",
            resume_context[:2000],  # Use first 2000 chars of resume as query
            k=20,
        )

        # Group by job_id and pick best score per job
        job_scores: dict[int, tuple[float, str]] = {}
        for doc, score in scored_results:
            job_id = doc.metadata.get("job_id")
            title = doc.metadata.get("job_title", "Unknown")
            if job_id is not None:
                if job_id not in job_scores or score < job_scores[job_id][0]:
                    job_scores[job_id] = (score, title)

        # Sort by score (lower = more similar in Chroma)
        sorted_jobs = sorted(job_scores.items(), key=lambda x: x[1][0])

        for job_id, (score, title) in sorted_jobs[:5]:
            job_info = next((j for j in all_jobs if j["id"] == job_id), None)
            if job_info:
                ranked_jobs.append({
                    "id": job_info["id"],
                    "title": job_info["title"],
                    "department": job_info.get("department", ""),
                    "location": job_info.get("location", ""),
                    "type": job_info.get("type", ""),
                    "relevance_score": round(1.0 / (1.0 + score), 2),  # Convert distance to similarity
                })

    # Build jobs context string
    jobs_context_parts = []
    for i, job in enumerate(ranked_jobs, 1):
        # Get the job description text
        job_docs = similarity_search(
            "job_knowledge",
            f"job requirements qualifications",
            k=2,
            filter={"job_id": job["id"]},
        )
        desc = "\n".join([d.page_content for d in job_docs]) if job_docs else "No description available."
        jobs_context_parts.append(
            f"{i}. {job['title']} ({job['department']}, {job['location']})\n"
            f"   Relevance: {job['relevance_score']}\n"
            f"   Details: {desc[:500]}"
        )

    jobs_context = "\n\n".join(jobs_context_parts) if jobs_context_parts else "No job listings available."

    return resume_context, jobs_context, ranked_jobs
