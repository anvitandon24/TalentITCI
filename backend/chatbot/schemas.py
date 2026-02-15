
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ChatRequest(BaseModel):
    message: str
    user_email: str
    history: List[Dict[str, str]] = [] # [{"role": "user", "content": "..."}, ...]

class ChatResponse(BaseModel):
    response: str
    sources: List[str] = []
    intent: str
    
class Intent(BaseModel):
    intent: str
    confidence: float
