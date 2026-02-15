
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

from chatbot.state import GraphState
from chatbot.config import GOOGLE_API_KEY, OPENROUTER_API_KEY, OPENROUTER_BASE_URL, LLM_MODEL
from chatbot.vector_store import similarity_search
from chatbot.sql_tools import (
    search_candidates_by_name_sql,
    get_job_postings_sql,
    get_application_reasoning_sql,
)
from chatbot.prompts import INTENT_PROMPT_TEMPLATE, RAG_GENERATION_PROMPT, FALLBACK_PROMPT
from database.models import Candidate, Job, Application
from database.connection import SessionLocal
from sqlalchemy import select, desc

import json

# Initialize LLM
llm = None
if OPENROUTER_API_KEY:
    llm = ChatOpenAI(
        model=LLM_MODEL,
        api_key=OPENROUTER_API_KEY,
        base_url=OPENROUTER_BASE_URL,
        temperature=0,
    )
    print(f"Chatbot utilizing OpenRouter ({LLM_MODEL})")
elif GOOGLE_API_KEY:
    from langchain_google_genai import ChatGoogleGenerativeAI
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=GOOGLE_API_KEY,
        temperature=0,
    )
    print("Chatbot utilizing Google Generative AI (gemini-1.5-flash)")
else:
    print("WARNING: No valid API Key found (OpenRouter or Google). Chatbot will not function.")


def _ensure_llm():
    """Raise a clear error if no LLM is configured."""
    if llm is None:
        raise RuntimeError(
            "No LLM configured. Set OPENROUTER_API_KEY_CHAT or GOOGLE_API_KEY in your .env file."
        )


def detect_intent(state: GraphState):
    """
    Node to classify the user's intent.
    """
    _ensure_llm()

    messages = state["messages"]
    user_query = messages[-1].content

    prompt = PromptTemplate(template=INTENT_PROMPT_TEMPLATE, input_variables=["query"])
    chain = prompt | llm | JsonOutputParser()

    try:
        response = chain.invoke({"query": user_query})
        intent = response.get("intent", "general_chat")
    except Exception as e:
        print(f"Error detecting intent: {e}")
        intent = "general_chat"

    return {"intent": intent}


def retrieve_documents(state: GraphState):
    """
    Node to retrieve documents based on intent.
    - Policy/Job queries  -> Vector Store (semantic search)
    - Candidate queries   -> SQL tools (structured data) + vector fallback
    """
    _ensure_llm()

    intent = state["intent"]
    messages = state["messages"]
    user_query = messages[-1].content

    context = ""
    documents = []

    if intent in ("policy_query", "job_query"):
        # Vector similarity search for HR policies and job descriptions
        docs = similarity_search(user_query, k=3)
        context = "\n\n".join([doc.page_content for doc in docs])
        documents = docs

    elif intent == "candidate_query":
        # Use a dedicated session (not the FastAPI dependency generator)
        db = SessionLocal()
        try:
            query_lower = user_query.lower()

            # --- "List all candidates" ---
            if "list" in query_lower and "all" in query_lower:
                stmt = select(Candidate).order_by(desc(Candidate.created_at)).limit(20)
                results = db.execute(stmt).scalars().all()
                candidates = [
                    {
                        "name": c.name,
                        "status": c.status,
                        "email": c.user.email if c.user else "N/A",
                    }
                    for c in results
                ]
                if candidates:
                    context += f"Found Candidates:\n{json.dumps(candidates, indent=2)}\n"

            else:
                # Extract candidate name using LLM
                extraction_prompt = PromptTemplate(
                    template=(
                        'Extract the candidate name from the query. '
                        'Return valid JSON: {{"name": "Name"}} or {{"name": null}} if none found.\n'
                        'Query: {query}'
                    ),
                    input_variables=["query"],
                )
                chain = extraction_prompt | llm | JsonOutputParser()
                try:
                    extracted = chain.invoke({"query": user_query})
                    candidate_name = extracted.get("name")

                    if candidate_name:
                        candidates = search_candidates_by_name_sql(candidate_name, db)
                        if candidates:
                            context += (
                                f"Found Candidates matching '{candidate_name}':\n"
                                f"{json.dumps(candidates, indent=2)}\n"
                            )
                except Exception as e:
                    print(f"Entity extraction failed: {e}")

            # --- "Why was X rejected?" ---
            if "why" in query_lower and ("reject" in query_lower or "fail" in query_lower):
                # Try extracting name again if not already done
                try:
                    extraction_prompt = PromptTemplate(
                        template=(
                            'Extract the candidate name from the query. '
                            'Return valid JSON: {{"name": "Name"}} or {{"name": null}} if none found.\n'
                            'Query: {query}'
                        ),
                        input_variables=["query"],
                    )
                    chain = extraction_prompt | llm | JsonOutputParser()
                    extracted = chain.invoke({"query": user_query})
                    candidate_name = extracted.get("name")
                    if candidate_name:
                        reasoning = get_application_reasoning_sql(candidate_name, db)
                        context += f"\nApplication Reasoning: {reasoning}\n"
                except Exception as e:
                    print(f"Reasoning extraction failed: {e}")

        finally:
            db.close()

    # Fallback: vector search as supplement if no context was found
    if not context:
        docs = similarity_search(user_query, k=2)
        if docs:
            context += "\n\nRelated Documents:\n" + "\n".join(
                [doc.page_content for doc in docs]
            )
            documents = docs

    return {"context": context, "documents": documents}


def generate_response(state: GraphState):
    """
    Node to generate the final response using RAG context.
    """
    _ensure_llm()

    context = state.get("context", "")
    messages = state["messages"]
    user_query = messages[-1].content
    intent = state["intent"]

    # Build conversation history summary for context
    history_text = ""
    if len(messages) > 1:
        history_lines = []
        for msg in messages[:-1]:  # exclude the current query
            role = "User" if isinstance(msg, HumanMessage) else "Assistant"
            history_lines.append(f"{role}: {msg.content}")
        history_text = "\n".join(history_lines[-10:])  # last 10 turns

    # Build the history section for the prompt
    history_section = ""
    if history_text:
        history_section = f"Conversation History:\n{history_text}\n"

    if intent in ("irrelevant", "general_chat"):
        prompt = PromptTemplate(
            template=FALLBACK_PROMPT,
            input_variables=["question", "history_section"],
        )
        chain = prompt | llm
        response = chain.invoke({"question": user_query, "history_section": history_section})
        return {"response": response.content}

    if not context:
        # No internal documents found — LLM will rely on its own knowledge
        print("No internal context found. Falling back to LLM general knowledge.")

    # RAG Generation with context + history
    prompt = PromptTemplate(
        template=RAG_GENERATION_PROMPT,
        input_variables=["context", "question", "history_section"],
    )
    chain = prompt | llm
    response = chain.invoke({
        "context": context,
        "question": user_query,
        "history_section": history_section,
    })

    return {"response": response.content}
