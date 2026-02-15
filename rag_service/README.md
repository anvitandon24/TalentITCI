# RAG Resume Evaluator

A Python-based RAG service that evaluates a single text-based PDF resume against a text-based PDF job description, using an HR policy PDF for contextual grounding.

## How It Works

1. **PDF Extraction** — Extracts raw text from all three PDFs (no OCR).
2. **Chunking** — Splits documents into section-aware chunks (~300–500 tokens).
3. **Embedding** — Embeds JD and resume chunks via OpenAI-compatible embedding API.
4. **FAISS Indexing** — Builds vector indexes for fast similarity search.
5. **Mandatory Skill Check** — LLM identifies mandatory skills from JD; if any are missing from the resume, the candidate immediately FAILs (score = 0).
6. **Section Matching** — FAISS similarity compares resume sections (skills, experience, education) against JD requirements.
7. **LLM Interpretation** — LLM (temperature=0) interprets similarity into normalised section scores and flags risks. It never invents or infers information not in the resume.
8. **Deterministic Scoring** — Weighted score: skills 50%, experience 30%, education 20%.

## Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure API key
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Place your PDFs in the data/ folder
#    - data/resume.pdf
#    - data/job_description.pdf
#    - data/hr_policy.pdf

# 4. Run
python main.py
```

## Output

Console JSON with:

| Field | Description |
|-------|-------------|
| `overall_score` | 0–100, weighted composite |
| `status` | `PASS` or `FAIL` |
| `section_scores` | Per-section scores with weights |
| `mandatory_skills` | Skills identified as mandatory from JD |
| `missing_mandatory_skills` | Mandatory skills not found in resume |
| `risk_flags` | Optional risk indicators |
| `note` | Short explanation (only if score is low or FAIL) |
| `section_reasoning` | Per-section LLM reasoning |

## Project Structure

```
capcom/
├── main.py                 # Entry point
├── requirements.txt        # Dependencies
├── .env.example            # API key template
├── data/                   # Place PDFs here
│   ├── resume.pdf
│   ├── job_description.pdf
│   └── hr_policy.pdf
└── src/
    ├── __init__.py
    ├── config.py           # All settings and tunables
    ├── pdf_extractor.py    # PDF → text extraction
    ├── chunker.py          # Section-aware chunking
    ├── vector_store.py     # Embeddings + FAISS
    ├── llm.py              # LLM calls (interpretation only)
    ├── scorer.py           # Deterministic scoring engine
    └── pipeline.py         # Orchestrates the full evaluation
```

## Configuration

All tunables are in `src/config.py`:

- **Scoring weights**: `WEIGHT_SKILLS`, `WEIGHT_EXPERIENCE`, `WEIGHT_EDUCATION`
- **Chunk sizes**: `CHUNK_TARGET_TOKENS`, `CHUNK_MAX_TOKENS`
- **Models**: `EMBEDDING_MODEL`, `LLM_MODEL` (overridable via `.env`)
- **API base URL**: `OPENAI_BASE_URL` (for OpenAI-compatible APIs)

## Non-Goals

This tool intentionally excludes: UI, authentication, batch processing, resume rewriting, and model training.
