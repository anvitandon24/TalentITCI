"""
API router for the Candidate Career AI Assistant.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict

from chatbot_candidate.service import handle_candidate_chat

router = APIRouter(prefix="/candidate-ai", tags=["Candidate Chatbot"])


class CandidateChatRequest(BaseModel):
    candidate_id: int
    message: str
    history: List[Dict[str, str]] = []  # [{"role": "user", "content": "..."}, ...]


class RecommendedJob(BaseModel):
    id: int
    title: str
    department: str = ""
    location: str = ""
    type: str = ""
    relevance_score: float = 0.0


class CandidateChatResponse(BaseModel):
    answer: str
    sources: List[str] = []
    recommended_jobs: List[RecommendedJob] = []


@router.post("/chat", response_model=CandidateChatResponse)
async def candidate_chat(request: CandidateChatRequest):
    """
    Chat endpoint for candidate career assistant.
    Combines resume, job description, and company knowledge RAG
    with LLM reasoning to answer career questions.
    """
    try:
        result = await handle_candidate_chat(
            candidate_id=request.candidate_id,
            message=request.message,
            history=request.history,
        )

        return CandidateChatResponse(
            answer=result["answer"],
            sources=result.get("sources", []),
            recommended_jobs=[
                RecommendedJob(**job)
                for job in result.get("recommended_jobs", [])
            ],
        )
    except Exception as e:
        print(f"Candidate Chatbot Error: {e}")
        raise HTTPException(status_code=500, detail=f"Chatbot error: {str(e)}")
