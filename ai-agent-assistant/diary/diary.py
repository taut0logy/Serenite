from typing import Dict, List, TypedDict, Annotated
from langchain_core.messages import HumanMessage, AIMessage
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Diary Mood Analysis API")

# Initialize Groq chat model
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    raise ValueError("GROQ_API_KEY not found in environment variables")


model = ChatGroq(
    groq_api_key=groq_api_key,
    model_name="llama3-70b-8192",
    temperature=0.7
)


# Define state types
class AgentState(TypedDict):
    messages: List[Dict]
    mood: str
    analysis: str
    confidence: float

# Define Pydantic models for API
class DiaryEntry(BaseModel):
    content: str
    date: str

class MoodAnalysis(BaseModel):
    mood: str
    analysis: str
    confidence: float

# Define the nodes for our graph
def analyze_mood(state: AgentState) -> AgentState:
    """Analyze the mood from the diary entry."""
    messages = state["messages"]
    last_message = messages[-1]["content"]
    
    # Create prompt for mood analysis
    prompt = f"""Analyze the following diary entry and determine the user's mood:
    {last_message}
    
    Please provide:
    1. The primary mood (e.g., happy, sad, anxious, calm)
    2. A brief analysis of why you think this is the mood
    3. Your confidence level (0-1)
    
    Format your response as:
    MOOD: [mood]
    ANALYSIS: [analysis]
    CONFIDENCE: [confidence]
    """
    
    try:
        response = model.invoke(prompt)
        response_text = response.content
        
        # Parse the response
        mood = ""
        analysis = ""
        confidence = 0.5  # Default confidence if parsing fails
        
        for line in response_text.split("\n"):
            if line.startswith("MOOD:"):
                mood = line.split(":")[1].strip()
            elif line.startswith("ANALYSIS:"):
                analysis = line.split(":")[1].strip()
            elif line.startswith("CONFIDENCE:"):
                try:
                    confidence = float(line.split(":")[1].strip())
                except (ValueError, IndexError):
                    confidence = 0.5
        
        # Ensure we have valid values
        if not mood:
            mood = "neutral"
        if not analysis:
            analysis = "Unable to determine specific mood patterns"
        
        return {
            "messages": messages,
            "mood": mood,
            "analysis": analysis,
            "confidence": confidence
        }
    except Exception as e:
        # Return default values in case of error
        return {
            "messages": messages,
            "mood": "neutral",
            "analysis": "Error in mood analysis",
            "confidence": 0.5
        }

# Create the graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("analyze_mood", analyze_mood)

# Add edges
workflow.add_edge("analyze_mood", END)
workflow.set_entry_point("analyze_mood")  # Set the entry point

# Compile the graph
app.state.graph = workflow.compile()

# FastAPI endpoints
@app.post("/analyze", response_model=MoodAnalysis)
async def analyze_diary(entry: DiaryEntry):
    """Analyze a diary entry and return mood analysis."""
    try:
        # Initialize state with all required fields
        initial_state = {
            "messages": [{"role": "user", "content": entry.content}],
            "mood": "",
            "analysis": "",
            "confidence": 0.0
        }
        
        # Run the graph
        result = app.state.graph.invoke(initial_state)
        
        # Create response
        return MoodAnalysis(
            mood=result.get("mood", "neutral"),
            analysis=result.get("analysis", "Unable to analyze mood"),
            confidence=result.get("confidence", 0.5)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error in mood analysis: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
