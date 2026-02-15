"""
Central configuration for the RAG resume evaluator.
All tunables live here — weights, model names, paths, chunking params.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Paths ────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"

# Expected filenames inside data/
RESUME_FILENAME = "resume.pdf"
JD_FILENAME = "job_description.pdf"
HR_POLICY_FILENAME = "hr_policy.pdf"

# ── OpenRouter API ────────────────────────────────────────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv(
    "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
)
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "openai/text-embedding-3-small")
LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-4o-mini")
LLM_TEMPERATURE = 0  # deterministic — never change

# ── Chunking ─────────────────────────────────────────────────────────────
CHUNK_MIN_TOKENS = 100
CHUNK_TARGET_TOKENS = 400
CHUNK_MAX_TOKENS = 500
CHUNK_OVERLAP_TOKENS = 50

# ── Scoring weights (must sum to 100) ────────────────────────────────────
WEIGHT_SKILLS = 50
WEIGHT_EXPERIENCE = 30
WEIGHT_EDUCATION = 20

assert WEIGHT_SKILLS + WEIGHT_EXPERIENCE + WEIGHT_EDUCATION == 100, \
    "Scoring weights must sum to 100"

# ── FAISS ────────────────────────────────────────────────────────────────
EMBEDDING_DIMENSION = 1536  # text-embedding-3-small default

# ── Section labels used for classification ───────────────────────────────
RESUME_SECTIONS = ["skills", "experience", "education", "other"]
JD_SECTIONS = ["required_skills", "mandatory_skills", "experience", "education", "other"]
