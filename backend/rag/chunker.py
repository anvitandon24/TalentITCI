"""
Section-aware text chunker.

Strategy:
1. Try to split on recognisable section headings first.
2. Within each section, split into chunks of ~300-500 tokens.
3. Each chunk carries a `section_label` so downstream code knows
   whether it belongs to skills / experience / education / other.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

import tiktoken

from rag.config import (
    CHUNK_MAX_TOKENS,
    CHUNK_OVERLAP_TOKENS,
    CHUNK_TARGET_TOKENS,
)

_ENC = tiktoken.get_encoding("cl100k_base")

# ── Section heading patterns (case-insensitive) ─────────────────────────
_SECTION_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("skills",      re.compile(r"(?i)^[\s#*\-]*(?:technical\s+)?skills|competenc|proficienc|tech\s*stack")),
    ("experience",  re.compile(r"(?i)^[\s#*\-]*(?:work\s+)?experience|employment|career|professional\s+background")),
    ("education",   re.compile(r"(?i)^[\s#*\-]*education|academic|qualif|degree|certif")),
    ("mandatory_skills", re.compile(r"(?i)^[\s#*\-]*(?:mandatory|required|must[\s-]?have)\s+(?:skills|qualif|requirement)")),
    ("required_skills",  re.compile(r"(?i)^[\s#*\-]*(?:required|key|essential|desired)\s+(?:skills|qualif|requirement)")),
]


@dataclass
class Chunk:
    text: str
    section: str  # e.g. "skills", "experience", "education", "other"
    source: str   # e.g. "resume", "job_description", "hr_policy"
    index: int = 0
    token_count: int = 0
    metadata: dict = field(default_factory=dict)


def _count_tokens(text: str) -> int:
    return len(_ENC.encode(text))


def _detect_section(line: str) -> str | None:
    for label, pattern in _SECTION_PATTERNS:
        if pattern.search(line):
            return label
    return None


def _split_into_sections(text: str) -> list[tuple[str, str]]:
    """Split text into (section_label, section_text) pairs."""
    lines = text.split("\n")
    sections: list[tuple[str, list[str]]] = []
    current_label = "other"
    current_lines: list[str] = []

    for line in lines:
        detected = _detect_section(line)
        if detected and detected != current_label:
            if current_lines:
                sections.append((current_label, current_lines))
            current_label = detected
            current_lines = [line]
        else:
            current_lines.append(line)

    if current_lines:
        sections.append((current_label, current_lines))

    return [(label, "\n".join(lns).strip()) for label, lns in sections if "\n".join(lns).strip()]


def _split_text_into_chunks(text: str, target: int = CHUNK_TARGET_TOKENS,
                            maximum: int = CHUNK_MAX_TOKENS,
                            overlap: int = CHUNK_OVERLAP_TOKENS) -> list[str]:
    """Split a block of text into token-sized chunks with overlap."""
    paragraphs = re.split(r"\n{2,}", text)
    chunks: list[str] = []
    current: list[str] = []
    current_tokens = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        pt = _count_tokens(para)

        if current_tokens + pt > maximum and current:
            chunks.append("\n\n".join(current))
            # keep last paragraph for overlap
            overlap_text = current[-1] if current else ""
            current = [overlap_text] if _count_tokens(overlap_text) <= overlap else []
            current_tokens = _count_tokens("\n\n".join(current)) if current else 0

        current.append(para)
        current_tokens += pt

    if current:
        chunks.append("\n\n".join(current))

    return [c.strip() for c in chunks if c.strip()]


def chunk_document(text: str, source: str) -> list[Chunk]:
    """
    Chunk a document into labelled pieces.

    Parameters
    ----------
    text : str    – full extracted text
    source : str  – "resume" | "job_description" | "hr_policy"
    """
    sections = _split_into_sections(text)
    chunks: list[Chunk] = []
    idx = 0

    for section_label, section_text in sections:
        raw_chunks = _split_text_into_chunks(section_text)
        for raw in raw_chunks:
            tc = _count_tokens(raw)
            chunks.append(Chunk(
                text=raw,
                section=section_label,
                source=source,
                index=idx,
                token_count=tc,
            ))
            idx += 1

    return chunks
