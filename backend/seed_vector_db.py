
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from langchain_core.documents import Document
from chatbot.vector_store import add_documents_to_index, clear_collection, get_collection_count
from database.connection import SessionLocal
from database.models import Job


def seed_vector_db():
    """
    Seed the ChromaDB vector store with HR knowledge base and job data.
    Clears existing documents first to prevent duplicates on re-runs.
    """
    print("Seeding Vector DB...")

    # Clear existing data to prevent duplicates
    try:
        existing_count = get_collection_count()
        if existing_count > 0:
            print(f"  Found {existing_count} existing documents. Clearing to prevent duplicates...")
            clear_collection()
    except Exception as e:
        print(f"  Note: Could not check/clear existing data ({e}). Proceeding with fresh seed.")

    documents = []

    # ── 1. Static HR Knowledge Base (Policies & SOPs) ────────────────────────
    print("  - Adding HR Knowledge Base (Policies & SOPs)...")

    kb_data = [
        # ── Recruitment & Hiring ──
        {"content": "**Recruitment Policy**: All job postings must be approved by Dept Head. Internal candidates apply via portal. Reference checks mandatory.", "source": "Recruitment Policy", "type": "policy"},
        {"content": "**How to add a new candidate**: Dashboard -> Candidates -> Add Candidate -> Upload Resume -> Save.", "source": "SOP - Add Candidate", "type": "guide"},
        {"content": "**How to post a job**: Dashboard -> Jobs -> Post New Job -> Fill details (Title, Dept, Desc) -> Publish.", "source": "SOP - Post Job", "type": "guide"},
        {"content": "**Interview Process**: 1. Screening (HR) 2. Technical Round 3. Managerial Round 4. HR Fitment.", "source": "Interview SOP", "type": "guide"},
        {"content": "**Offer Letter Process**: Once selected, HR generates offer letter -> Approval by VP -> Sent to Candidate.", "source": "Recruitment SOP", "type": "guide"},

        # ── Leave & Attendance ──
        {"content": "**Leave Policy**: 20 days Paid Leave (PL), 10 days Sick Leave (SL), 10 days Casual Leave (CL) per year.", "source": "Leave Policy", "type": "policy"},
        {"content": "**Maternity Leave**: 26 weeks paid leave for expecting mothers. Apply 8 weeks in advance.", "source": "Leave Policy", "type": "policy"},
        {"content": "**Paternity Leave**: 2 weeks paid leave for new fathers.", "source": "Leave Policy", "type": "policy"},
        {"content": "**Work From Home (WFH)**: Hybrid model. 3 days office, 2 days remote. Manager approval needed for full remote.", "source": "Remote Work Policy", "type": "policy"},
        {"content": "**Office Timings**: Core hours 10 AM - 4 PM. Standard shift 9 AM - 6 PM.", "source": "Attendance Policy", "type": "policy"},

        # ── Code of Conduct & Ethics ──
        {"content": "**Code of Conduct**: Respect all colleagues. Zero tolerance for harassment or discrimination.", "source": "Code of Conduct", "type": "policy"},
        {"content": "**Dress Code**: Business Casuals Mon-Thu. Casuals on Friday. No flip-flops or shorts.", "source": "Dress Code Policy", "type": "policy"},
        {"content": "**IT Security**: Lock screen when away. Do not share passwords. Use VPN for remote access.", "source": "IT Policy", "type": "policy"},
        {"content": "**Data Privacy**: Customer data is confidential. Access on need-to-know basis only.", "source": "Data Privacy Policy", "type": "policy"},

        # ── Benefits & Compensation ──
        {"content": "**Health Insurance**: Coverage of $5000 for employee + spouse + 2 children.", "source": "Benefits Policy", "type": "policy"},
        {"content": "**Provident Fund (PF)**: 12% of basic salary deducted and matched by employer.", "source": "Compensation Policy", "type": "policy"},
        {"content": "**Performance Bonus**: Variable pay distributed annually based on KPI achievement.", "source": "Compensation Policy", "type": "policy"},
        {"content": "**Travel Allowance**: Reimbursed for client visits. 0.5$ per mile for personal vehicle use.", "source": "Travel Policy", "type": "policy"},

        # ── Onboarding & Exit ──
        {"content": "**Onboarding Process**: Day 1: IT Setup & Orientation. Week 1: Team Intro & KTs. Month 1: Role clarity.", "source": "Onboarding SOP", "type": "guide"},
        {"content": "**Probation Period**: 3 months for all new hires. Confirmation based on review.", "source": "HR Policy", "type": "policy"},
        {"content": "**Notice Period**: 60 days for confirmed employees. 15 days during probation.", "source": "Exit Policy", "type": "policy"},
        {"content": "**Resignation Process**: Submit formal email to Manager & HR. Exit interview mandatory.", "source": "Exit Policy", "type": "guide"},

        # ── Tools & Systems ──
        {"content": "**TalentAI Platform**: Use for ATS, RAG scoring, and Candidate management.", "source": "IT Systems", "type": "guide"},
        {"content": "**Slack Etiquette**: Use threads. Set status when away. Use #general for announcements.", "source": "Communication Policy", "type": "policy"},

        # ── Miscellaneous ──
        {"content": "**Grievance Redressal**: Report issues to hr-grievance@company.com. Anonymous reporting available.", "source": "Grievance Policy", "type": "policy"},
        {"content": "**Referral Bonus**: $500 for successful referral of Senior Devs. $300 for Junior roles.", "source": "Referral Policy", "type": "policy"},
        {"content": "**Learning & Development**: $1000 annual budget per employee for certifications/courses.", "source": "L&D Policy", "type": "policy"},
    ]

    for item in kb_data:
        documents.append(
            Document(
                page_content=item["content"],
                metadata={"source": item["source"], "type": item["type"]},
            )
        )

    # ── 2. Dynamic Data from SQL Database (Jobs) ─────────────────────────────
    print("  - Syncing Jobs from Database...")
    session = SessionLocal()
    try:
        jobs = session.query(Job).all()
        for job in jobs:
            content = (
                f"**Job Opening: {job.title}**\n"
                f"Department: {job.department}\n"
                f"Location: {job.location}\n"
                f"Type: {job.type}\n"
                f"Status: {job.status}"
            )
            documents.append(
                Document(
                    page_content=content,
                    metadata={
                        "source": f"Job - {job.title}",
                        "type": "job",
                        "job_id": job.id,
                    },
                )
            )
            print(f"    Added Job: {job.title}")
        if not jobs:
            print("    No jobs found in database (run seed_data.py first if needed).")
    except Exception as e:
        print(f"  Error fetching jobs from DB: {e}")
    finally:
        session.close()

    # ── 3. Add to Vector Store ────────────────────────────────────────────────
    try:
        if documents:
            add_documents_to_index(documents)
            print(f"\nSuccess! Added {len(documents)} documents to ChromaDB.")
        else:
            print("\nNo documents to add.")
    except Exception as e:
        print(f"\nError seeding Vector DB: {e}")
        raise


if __name__ == "__main__":
    seed_vector_db()
