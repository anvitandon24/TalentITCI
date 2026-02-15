"""
Main evaluation pipeline.

Orchestrates:
1. PDF text extraction
2. Chunking
3. Embedding + FAISS indexing
4. Mandatory skill check
5. Section-by-section similarity + LLM interpretation
6. Deterministic scoring
7. Result assembly
"""

from __future__ import annotations

from src.pdf_extractor import extract_text
from src.chunker import chunk_document, Chunk
from src.vector_store import VectorStore
from src.llm import extract_mandatory_skills, interpret_section_match
from src.scorer import check_mandatory_skills, build_result
from src.config import DATA_DIR, RESUME_FILENAME, JD_FILENAME, HR_POLICY_FILENAME


def _collect_text_for_section(chunks: list[Chunk], sections: list[str]) -> str:
    """Join text of all chunks matching any of the given section labels."""
    return "\n\n".join(c.text for c in chunks if c.section in sections)


def _get_similarity_scores(
    jd_store: VectorStore,
    resume_chunks: list[Chunk],
    jd_sections: list[str],
    resume_sections: list[str],
) -> list[float]:
    """
    For each resume chunk in the given sections, find its best match
    among the JD chunks in the given sections and collect similarity scores.
    """
    scores: list[float] = []
    relevant_resume = [c for c in resume_chunks if c.section in resume_sections]

    for rc in relevant_resume:
        results = jd_store.search_by_section(rc.text, section_filter=jd_sections, top_k=3)
        if results:
            best_score = max(s for _, s in results)
            scores.append(best_score)

    return scores


def run() -> dict:
    """Execute the full evaluation pipeline and return the result dict."""
    # ── 1. Extract text ──────────────────────────────────────────────────
    print("[1/7] Extracting text from PDFs...")
    resume_text = extract_text(DATA_DIR / RESUME_FILENAME)
    jd_text = extract_text(DATA_DIR / JD_FILENAME)
    hr_text = extract_text(DATA_DIR / HR_POLICY_FILENAME)

    # ── 2. Chunk documents ───────────────────────────────────────────────
    print("[2/7] Chunking documents...")
    resume_chunks = chunk_document(resume_text, source="resume")
    jd_chunks = chunk_document(jd_text, source="job_description")
    hr_chunks = chunk_document(hr_text, source="hr_policy")

    print(f"       Resume: {len(resume_chunks)} chunks")
    print(f"       JD:     {len(jd_chunks)} chunks")
    print(f"       HR:     {len(hr_chunks)} chunks")

    # ── 3. Build FAISS indexes ───────────────────────────────────────────
    print("[3/7] Building vector stores...")
    jd_store = VectorStore(jd_chunks)
    # No need to build a resume vector store — we search the JD store
    # using resume chunk text directly via search_text / search_by_section.

    # HR policy is embedded only for LLM context, not for scoring
    hr_context = "\n\n".join(c.text for c in hr_chunks[:3])  # first few chunks

    # ── 4. Extract mandatory skills from JD ──────────────────────────────
    print("[4/7] Identifying mandatory skills from JD...")
    mandatory_skills = extract_mandatory_skills(jd_text)
    print(f"       Found {len(mandatory_skills)} mandatory skill(s): {mandatory_skills}")

    # ── 5. Check mandatory skills in resume ──────────────────────────────
    print("[5/7] Checking mandatory skills against resume...")
    missing_mandatory = check_mandatory_skills(mandatory_skills, resume_text)
    if missing_mandatory:
        print(f"       MISSING: {missing_mandatory}")
        # Build immediate FAIL result
        return build_result(
            skills_score=0,
            experience_score=0,
            education_score=0,
            mandatory_skills=mandatory_skills,
            missing_mandatory=missing_mandatory,
            risks=["Mandatory skill(s) missing — automatic disqualification."],
            section_reasoning={},
        )

    print("       All mandatory skills found.")

    # ── 6. Section-by-section similarity + LLM interpretation ────────────
    print("[6/7] Evaluating sections via FAISS similarity + LLM...")

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
        print(f"       Evaluating: {name}...")

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

    # ── 7. Compute final score + assemble result ─────────────────────────
    print("[7/7] Computing final score...")

    result = build_result(
        skills_score=section_scores.get("skills", 0),
        experience_score=section_scores.get("experience", 0),
        education_score=section_scores.get("education", 0),
        mandatory_skills=mandatory_skills,
        missing_mandatory=missing_mandatory,
        risks=list(set(all_risks)),  # deduplicate
        section_reasoning=section_reasoning,
    )

    return result
