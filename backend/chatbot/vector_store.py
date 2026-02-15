
import os
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from chatbot.config import (
    GOOGLE_API_KEY,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    CHROMA_PERSIST_DIRECTORY,
    COLLECTION_NAME,
    EMBEDDING_MODEL,
)

# Initialize Embeddings
embeddings = None
if OPENROUTER_API_KEY:
    embeddings = OpenAIEmbeddings(
        model=EMBEDDING_MODEL,
        openai_api_key=OPENROUTER_API_KEY,
        openai_api_base=OPENROUTER_BASE_URL,
    )
elif GOOGLE_API_KEY:
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=GOOGLE_API_KEY,
    )
else:
    print("WARNING: No API Key for embeddings. Vector search will not work.")


def get_vector_store():
    """
    Returns the Chroma vector store instance.
    """
    if embeddings is None:
        raise RuntimeError(
            "No embedding model configured. "
            "Set OPENROUTER_API_KEY_CHAT or GOOGLE_API_KEY in your .env file."
        )
    vector_store = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_PERSIST_DIRECTORY,
    )
    return vector_store


def add_documents_to_index(documents):
    """
    Adds a list of LangChain Documents to the vector store.
    """
    vector_store = get_vector_store()
    vector_store.add_documents(documents)


def similarity_search(query: str, k: int = 4, filter: dict = None):
    """
    Search for documents similar to the query.
    Returns empty list if vector store is not configured.
    """
    try:
        vector_store = get_vector_store()
        return vector_store.similarity_search(query, k=k, filter=filter)
    except RuntimeError:
        print("Vector store not configured — returning empty results.")
        return []


def clear_collection():
    """
    Delete all documents from the vector store collection.
    Useful for re-seeding without duplicates.
    """
    vector_store = get_vector_store()
    # Get all document IDs and delete them
    collection = vector_store._collection
    existing = collection.count()
    if existing > 0:
        # Get all IDs
        all_ids = collection.get()["ids"]
        collection.delete(ids=all_ids)
        print(f"  Cleared {existing} existing documents from '{COLLECTION_NAME}' collection.")
    return existing


def get_collection_count() -> int:
    """Return the number of documents currently in the vector store."""
    try:
        vector_store = get_vector_store()
        return vector_store._collection.count()
    except Exception:
        return 0
