"""Shared RAG scoring background task. Uses its own DB session."""
import logging
import traceback

from database.models import Application

logger = logging.getLogger(__name__)


def run_rag_scoring(
    application_id: int,
    resume_bytes: bytes,
    jd_bytes: bytes,
    hr_bytes: bytes | None,
) -> None:
    """Run RAG evaluation and update the application record.
    Uses its own session; logs and persists failures."""
    from database.connection import SessionLocal

    db = SessionLocal()
    try:
        application = db.query(Application).filter(Application.id == application_id).first()
        if application:
            application.rag_status = "PROCESSING"
            db.commit()

        from rag.evaluator import evaluate_resume
        result = evaluate_resume(resume_bytes, jd_bytes, hr_bytes)

        application = db.query(Application).filter(Application.id == application_id).first()
        if application:
            application.rag_score = result.get("overall_score", 0)
            application.rag_status = result.get("status", "FAIL")
            reasoning_parts = []
            section_reasoning = result.get("section_reasoning", {})
            for section_name, reasoning in section_reasoning.items():
                reasoning_parts.append(f"{section_name.title()}: {reasoning}")
            if result.get("note"):
                reasoning_parts.append(result["note"])
            application.rag_reasoning = " | ".join(reasoning_parts) if reasoning_parts else None
            application.rag_details = result
            application.score = result.get("overall_score", 0)
            application.stage = "Screening"
            db.commit()
            logger.info(f"RAG scoring complete for application {application_id}: {result.get('overall_score')}")
    except Exception as e:
        logger.error(f"RAG scoring failed for application {application_id}: {e}")
        logger.error(traceback.format_exc())
        try:
            application = db.query(Application).filter(Application.id == application_id).first()
            if application:
                application.rag_status = "ERROR"
                application.rag_reasoning = f"Evaluation failed: {str(e)[:500]}"
                db.commit()
        except Exception as inner_err:
            logger.error(f"Failed to mark application {application_id} as ERROR: {inner_err}")
    finally:
        db.close()
