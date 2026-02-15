"""
Extract raw text from PDF bytes using PyMuPDF (fitz).
Works with in-memory bytes — no temp files needed.
"""

from __future__ import annotations

import fitz  # PyMuPDF


def extract_text_from_bytes(pdf_bytes: bytes) -> str:
    """Return the full text content of a PDF given as raw bytes."""
    text_parts: list[str] = []
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text("text"))

    full_text = "\n".join(text_parts).strip()
    if not full_text:
        raise ValueError(
            "No extractable text found in PDF. "
            "This tool only supports text-based PDFs (no OCR)."
        )
    return full_text
