"""
RAG-based resume evaluation module.

Usage from backend:
    from rag.evaluator import evaluate_resume
    result = evaluate_resume(resume_pdf_bytes, jd_pdf_bytes, hr_policy_pdf_bytes)
"""
from rag.evaluator import evaluate_resume  # noqa: F401
