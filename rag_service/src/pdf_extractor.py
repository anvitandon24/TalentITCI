"""
Extract raw text from text-based PDFs using PyMuPDF (fitz).
No OCR — only embedded text layers.
"""

from pathlib import Path
import fitz  # PyMuPDF


def extract_text(pdf_path: str | Path) -> str:
    """Return the full text content of a PDF file."""
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    text_parts: list[str] = []
    with fitz.open(str(pdf_path)) as doc:
        for page in doc:
            text_parts.append(page.get_text("text"))

    full_text = "\n".join(text_parts).strip()
    if not full_text:
        raise ValueError(f"No extractable text found in {pdf_path.name}. "
                         "This tool only supports text-based PDFs (no OCR).")
    return full_text
