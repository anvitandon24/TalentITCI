
from fastapi import APIRouter, HTTPException
from chatbot.schemas import ChatRequest, ChatResponse
from chatbot.graph import app as graph_app
from langchain_core.messages import HumanMessage, AIMessage

router = APIRouter(prefix="/api/chat", tags=["Chatbot"])

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Chat endpoint for HR assistant.
    Accepts a message, optional user_email, and optional conversation history.
    """
    try:
        # Build message history from the request
        messages = []
        for entry in request.history:
            role = entry.get("role", "user")
            content = entry.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(AIMessage(content=content))

        # Append the current user message
        messages.append(HumanMessage(content=request.message))

        # Prepare initial state
        initial_state = {
            "messages": messages,
            "user_email": request.user_email,
            "intent": "",
            "context": "",
            "documents": [],
            "response": "",
        }

        # Use ainvoke for async compatibility with FastAPI
        result = await graph_app.ainvoke(initial_state)

        response_text = result.get("response", "I'm sorry, I encountered an error processing your request.")
        intent = result.get("intent", "unknown")

        # Extract unique sources from retrieved documents
        sources = []
        if result.get("documents"):
            for doc in result["documents"]:
                source = doc.metadata.get("source", "Unknown Document") if hasattr(doc, "metadata") else "Context Document"
                if source not in sources:
                    sources.append(source)

        return ChatResponse(
            response=response_text,
            sources=sources,
            intent=intent
        )

    except Exception as e:
        print(f"Chatbot Error: {e}")
        raise HTTPException(status_code=500, detail=f"Chatbot error: {str(e)}")
