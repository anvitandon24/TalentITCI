"""
Central configuration for the RAG resume evaluator.
Reads from environment variables so it works inside the FastAPI process.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── OpenRouter API ────────────────────────────────────────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv(
    "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
)
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "openai/text-embedding-3-small")
LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-4o-mini")
LLM_TEMPERATURE = 0  # deterministic

# ── Chunking ─────────────────────────────────────────────────────────────
CHUNK_MIN_TOKENS = 100
CHUNK_TARGET_TOKENS = 400
CHUNK_MAX_TOKENS = 500
CHUNK_OVERLAP_TOKENS = 50

# ── Scoring weights (must sum to 100) ────────────────────────────────────
WEIGHT_SKILLS = int(os.getenv("RAG_WEIGHT_SKILLS", "50"))
WEIGHT_EXPERIENCE = int(os.getenv("RAG_WEIGHT_EXPERIENCE", "30"))
WEIGHT_EDUCATION = int(os.getenv("RAG_WEIGHT_EDUCATION", "20"))

assert WEIGHT_SKILLS + WEIGHT_EXPERIENCE + WEIGHT_EDUCATION == 100, \
    "Scoring weights must sum to 100"

# ── Pass/Fail threshold ──────────────────────────────────────────────────
PASS_THRESHOLD = int(os.getenv("RAG_PASS_THRESHOLD", "40"))

# ── FAISS ────────────────────────────────────────────────────────────────
EMBEDDING_DIMENSION = 1536  # text-embedding-3-small default

# ── Section labels used for classification ───────────────────────────────
RESUME_SECTIONS = ["skills", "experience", "education", "other"]
JD_SECTIONS = ["required_skills", "mandatory_skills", "experience", "education", "other"]
