"""
Embedding + FAISS vector store.

Responsibilities:
- Embed chunks via an OpenAI-compatible embedding API.
- Build a FAISS index for fast similarity search.
- Retrieve top-k most similar chunks for a given query.
"""

from __future__ import annotations

import numpy as np
import faiss
from openai import OpenAI

from src.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSION,
)
from src.chunker import Chunk


def _get_client() -> OpenAI:
    return OpenAI(
        api_key=OPENROUTER_API_KEY,
        base_url=OPENROUTER_BASE_URL,
    )


def embed_texts(texts: list[str], batch_size: int = 64) -> np.ndarray:
    """
    Embed a list of texts and return an (N, D) float32 numpy array.
    Processes in batches to respect API limits.
    """
    client = _get_client()
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = client.embeddings.create(model=EMBEDDING_MODEL, input=batch)
        # sort by index to preserve order
        sorted_data = sorted(response.data, key=lambda d: d.index)
        all_embeddings.extend([d.embedding for d in sorted_data])

    arr = np.array(all_embeddings, dtype=np.float32)
    # normalise for cosine similarity via inner-product index
    faiss.normalize_L2(arr)
    return arr


class VectorStore:
    """Thin wrapper around a FAISS inner-product index."""

    def __init__(self, chunks: list[Chunk]):
        self.chunks = chunks
        texts = [c.text for c in chunks]
        self.embeddings = embed_texts(texts)
        self.index = faiss.IndexFlatIP(EMBEDDING_DIMENSION)
        self.index.add(self.embeddings)

    def search(self, query_embedding: np.ndarray, top_k: int = 5) -> list[tuple[Chunk, float]]:
        """
        Return the top_k most similar chunks with their similarity scores.
        query_embedding must be (1, D) normalised float32.
        """
        scores, indices = self.index.search(query_embedding, top_k)
        results: list[tuple[Chunk, float]] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue
            results.append((self.chunks[idx], float(score)))
        return results

    def search_text(self, text: str, top_k: int = 5) -> list[tuple[Chunk, float]]:
        """Convenience: embed a single text string and search."""
        vec = embed_texts([text])
        return self.search(vec, top_k=top_k)

    def search_by_section(self, query_text: str, section_filter: str | list[str],
                          top_k: int = 5) -> list[tuple[Chunk, float]]:
        """Search but only return chunks that match the given section label(s)."""
        if isinstance(section_filter, str):
            section_filter = [section_filter]
        all_results = self.search_text(query_text, top_k=top_k * 3)
        filtered = [(c, s) for c, s in all_results if c.section in section_filter]
        return filtered[:top_k]
