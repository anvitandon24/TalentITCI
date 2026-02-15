
import os
from dotenv import load_dotenv

load_dotenv()

# Gemini Data - keeping for reference, but preferring OpenRouter if available
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# OpenRouter Data
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY_CHAT")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

# Models for OpenRouter - defaulting to Gemini 1.5 Flash
# "google/gemini-2.0-flash-001" is also an option
LLM_MODEL = "anthropic/claude-3-haiku"
# For embeddings, we can use OpenAI or a free provider if available via OpenRouter
# But typically standard OpenAI embeddings are reliable
EMBEDDING_MODEL = "openai/text-embedding-3-small"

# ChromaDB
CHROMA_PERSIST_DIRECTORY = os.path.join(os.getcwd(), "chroma_db")
COLLECTION_NAME = "hr_docs"

# Prompts
SYSTEM_PROMPT_INTENT = """You are an expert HR Assistant. Your job is to classify the user's intent into one of the following categories:
- `policy_query`: Questions about HR policies, leave, benefits, etc.
- `candidate_query`: Questions about specific candidates, their status, or applications.
- `job_query`: Questions about job postings, vacancies, or requirements.
- `general_chat`: Greetings or simple conversational fillers.
- `irrelevant`: Questions that are NOT related to HR, recruitment, or professional work (e.g., politics, celebrities, sports, jokes).

Respond with a JSON object: {"intent": "..."}
"""
