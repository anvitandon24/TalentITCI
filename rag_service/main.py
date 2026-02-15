"""
Resume Evaluator — RAG-based evaluation service.

Usage:
    python main.py

Place exactly three PDFs in the data/ folder:
    - resume.pdf          (candidate's resume)
    - job_description.pdf (job description)
    - hr_policy.pdf       (HR policy — contextual grounding only)

Outputs a JSON evaluation to the console.
"""

import json
import sys

from src.config import DATA_DIR, RESUME_FILENAME, JD_FILENAME, HR_POLICY_FILENAME, OPENROUTER_API_KEY


def _preflight_checks() -> list[str]:
    """Verify all prerequisites are met before running the pipeline."""
    errors: list[str] = []

    if not OPENROUTER_API_KEY:
        errors.append(
            "OPENROUTER_API_KEY not set. Add it to your .env file."
        )

    for fname in [RESUME_FILENAME, JD_FILENAME, HR_POLICY_FILENAME]:
        path = DATA_DIR / fname
        if not path.exists():
            errors.append(f"Missing file: {path}")

    return errors


def main() -> None:
    print("=" * 60)
    print("  RAG Resume Evaluator")
    print("=" * 60)
    print()

    errors = _preflight_checks()
    if errors:
        print("Preflight check failed:\n")
        for e in errors:
            print(f"  - {e}")
        print("\nAborting.")
        sys.exit(1)

    from src.pipeline import run

    try:
        result = run()
    except Exception as exc:
        print(f"\nPipeline error: {exc}")
        sys.exit(1)

    print()
    print("=" * 60)
    print("  EVALUATION RESULT")
    print("=" * 60)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
