"""
Embedding management for the Candidate Career AI Assistant.
Reuses the same embedding provider as the HR chatbot.
Uses hash-based caching to avoid recomputing embeddings.
"""

import hashlib
import logging
from typing import Optional

from langchain_chroma import Chroma
from langchain_core.documents import Document

from chatbot.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    GOOGLE_API_KEY,
    CHROMA_PERSIST_DIRECTORY,
    EMBEDDING_MODEL,
)

logger = logging.getLogger(__name__)

# ── Reuse the same embedding provider as HR chatbot ──────────────────────
_embeddings = None


def _get_embeddings():
    """Lazy-init the embedding model (same provider as HR chatbot)."""
    global _embeddings
    if _embeddings is not None:
        return _embeddings

    if OPENROUTER_API_KEY:
        from langchain_openai import OpenAIEmbeddings
        _embeddings = OpenAIEmbeddings(
            model=EMBEDDING_MODEL,
            openai_api_key=OPENROUTER_API_KEY,
            openai_api_base=OPENROUTER_BASE_URL,
        )
    elif GOOGLE_API_KEY:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        _embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=GOOGLE_API_KEY,
        )
    else:
        raise RuntimeError(
            "No embedding model configured. "
            "Set OPENROUTER_API_KEY_CHAT or GOOGLE_API_KEY in .env"
        )
    return _embeddings


def _compute_hash(data: bytes) -> str:
    """Compute MD5 hash of binary data for cache invalidation."""
    return hashlib.md5(data).hexdigest()


def _get_collection(collection_name: str) -> Chroma:
    """Get or create a Chroma collection."""
    return Chroma(
        collection_name=collection_name,
        embedding_function=_get_embeddings(),
        persist_directory=CHROMA_PERSIST_DIRECTORY,
    )


def _collection_has_hash(collection_name: str, data_hash: str) -> bool:
    """Check if the collection already contains documents with this hash."""
    try:
        store = _get_collection(collection_name)
        results = store._collection.get(where={"data_hash": data_hash})
        return len(results["ids"]) > 0
    except Exception:
        return False


def _clear_collection(collection_name: str):
    """Remove all documents from a collection."""
    try:
        store = _get_collection(collection_name)
        existing = store._collection.get()
        if existing["ids"]:
            store._collection.delete(ids=existing["ids"])
            logger.info(f"Cleared {len(existing['ids'])} docs from '{collection_name}'")
    except Exception as e:
        logger.warning(f"Could not clear collection '{collection_name}': {e}")


def _chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks


# ── Public API ────────────────────────────────────────────────────────────


def ensure_resume_indexed(
    candidate_id: int,
    resume_text: str,
    resume_bytes: bytes,
) -> str:
    """
    Index the candidate's resume in Chroma. Skip if already cached (same hash).
    Returns the collection name used.
    """
    collection_name = f"candidate_{candidate_id}_resume"
    data_hash = _compute_hash(resume_bytes)

    if _collection_has_hash(collection_name, data_hash):
        logger.info(f"Resume already indexed for candidate {candidate_id} (hash match)")
        return collection_name

    # Clear old resume data and re-index
    _clear_collection(collection_name)

    chunks = _chunk_text(resume_text)
    documents = [
        Document(
            page_content=chunk,
            metadata={
                "source": "resume",
                "candidate_id": candidate_id,
                "data_hash": data_hash,
                "chunk_index": i,
            },
        )
        for i, chunk in enumerate(chunks)
    ]

    store = _get_collection(collection_name)
    store.add_documents(documents)
    logger.info(f"Indexed {len(documents)} resume chunks for candidate {candidate_id}")
    return collection_name


def ensure_company_knowledge_indexed(
    hr_policies: list[tuple[int, str, bytes]],
) -> str:
    """
    Index all HR policy documents into a shared company_knowledge collection.
    hr_policies: list of (job_id, extracted_text, raw_bytes)
    Skips documents whose hash is already present.
    Returns the collection name.
    """
    collection_name = "company_knowledge"

    new_documents = []
    for job_id, text, raw_bytes in hr_policies:
        data_hash = _compute_hash(raw_bytes)
        if _collection_has_hash(collection_name, data_hash):
            continue

        chunks = _chunk_text(text)
        for i, chunk in enumerate(chunks):
            new_documents.append(
                Document(
                    page_content=chunk,
                    metadata={
                        "source": "hr_policy",
                        "job_id": job_id,
                        "data_hash": data_hash,
                        "chunk_index": i,
                    },
                )
            )

    if new_documents:
        store = _get_collection(collection_name)
        store.add_documents(new_documents)
        logger.info(f"Indexed {len(new_documents)} new company knowledge chunks")

    return collection_name


def ensure_job_knowledge_indexed(
    job_descriptions: list[tuple[int, str, str, bytes]],
) -> str:
    """
    Index all job description documents into a shared job_knowledge collection.
    job_descriptions: list of (job_id, job_title, extracted_text, raw_bytes)
    Skips documents whose hash is already present.
    Returns the collection name.
    """
    collection_name = "job_knowledge"

    new_documents = []
    for job_id, title, text, raw_bytes in job_descriptions:
        data_hash = _compute_hash(raw_bytes)
        if _collection_has_hash(collection_name, data_hash):
            continue

        chunks = _chunk_text(text)
        for i, chunk in enumerate(chunks):
            new_documents.append(
                Document(
                    page_content=chunk,
                    metadata={
                        "source": "job_description",
                        "job_id": job_id,
                        "job_title": title,
                        "data_hash": data_hash,
                        "chunk_index": i,
                    },
                )
            )

    if new_documents:
        store = _get_collection(collection_name)
        store.add_documents(new_documents)
        logger.info(f"Indexed {len(new_documents)} new job knowledge chunks")

    return collection_name


def similarity_search(
    collection_name: str,
    query: str,
    k: int = 4,
    filter: Optional[dict] = None,
) -> list[Document]:
    """Run similarity search on a specific collection."""
    try:
        store = _get_collection(collection_name)
        return store.similarity_search(query, k=k, filter=filter)
    except Exception as e:
        logger.error(f"Similarity search failed on '{collection_name}': {e}")
        return []


def similarity_search_with_score(
    collection_name: str,
    query: str,
    k: int = 10,
) -> list[tuple[Document, float]]:
    """Run similarity search with relevance scores for ranking."""
    try:
        store = _get_collection(collection_name)
        return store.similarity_search_with_score(query, k=k)
    except Exception as e:
        logger.error(f"Scored similarity search failed on '{collection_name}': {e}")
        return []
