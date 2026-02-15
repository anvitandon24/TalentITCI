
from langgraph.graph import StateGraph, END
from chatbot.state import GraphState
from chatbot.nodes import detect_intent, retrieve_documents, generate_response

# Define the graph
workflow = StateGraph(GraphState)

# Add nodes
workflow.add_node("detect_intent", detect_intent)
workflow.add_node("retrieve_documents", retrieve_documents)
workflow.add_node("generate_response", generate_response)

# Set entry point
workflow.set_entry_point("detect_intent")

# Define edges
# From intent detection, deciding next step
def decide_next_step(state: GraphState):
    intent = state['intent']
    if intent == "irrelevant" or intent == "general_chat":
        return "generate_response" # Skip retrieval
    return "retrieve_documents"

workflow.add_conditional_edges(
    "detect_intent",
    decide_next_step,
    {
        "retrieve_documents": "retrieve_documents",
        "generate_response": "generate_response"
    }
)

workflow.add_edge("retrieve_documents", "generate_response")
workflow.add_edge("generate_response", END)

# Compile
app = workflow.compile()
