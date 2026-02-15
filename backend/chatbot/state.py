
from typing import TypedDict, Annotated, List, Dict, Any, Union
from langchain_core.messages import BaseMessage
import operator

class GraphState(TypedDict):
    """
    State for the chatbot LangGraph workflow.
    """
    messages: Annotated[List[BaseMessage], operator.add]
    user_email: str
    intent: str
    context: str
    documents: List[Any]
    response: str
