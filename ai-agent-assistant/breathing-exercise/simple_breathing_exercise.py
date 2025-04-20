from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import logging
import json
from dotenv import load_dotenv
from langchain_groq import ChatGroq

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Breathing Exercise Generator API")

# Improved CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Content-Length"],
)

# Initialize Groq chat model
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    logger.error("GROQ_API_KEY not found in environment variables")
    raise ValueError("GROQ_API_KEY not found in environment variables")

model = ChatGroq(
    groq_api_key=groq_api_key,
    model_name="llama3-70b-8192",
    temperature=0.7
)

# Define Pydantic models for API
class EmotionalState(BaseModel):
    description: str
    stress_level: int  # 1-10
    physical_symptoms: Optional[str] = None
    time_available: Optional[int] = 5  # Default 5 minutes

class BreathingPattern(BaseModel):
    name: str
    description: str
    steps: List[Dict[str, Any]]
    duration_minutes: int
    benefits: List[str]
    suitable_for: List[str]

# Default breathing exercise in case generation fails
DEFAULT_EXERCISE = {
    "name": "Basic Calming Breath",
    "description": "A simple breathing technique to restore calm and balance.",
    "steps": [
        {"action": "inhale", "duration": 4, "instruction": "Breathe in through your nose"},
        {"action": "hold", "duration": 2, "instruction": "Hold your breath briefly"},
        {"action": "exhale", "duration": 6, "instruction": "Exhale slowly through your mouth"},
        {"action": "hold", "duration": 0, "instruction": "Continue to the next breath"}
    ],
    "duration_minutes": 5,
    "benefits": ["Reduces anxiety", "Increases focus", "Promotes relaxation"],
    "suitable_for": ["Everyone", "Beginners", "People experiencing stress"]
}

@app.post("/generate_exercise", response_model=BreathingPattern)
async def generate_breathing_exercise(state: EmotionalState):
    """Generate a breathing exercise based on the user's emotional state."""
    logger.info(f"Generating breathing exercise for emotional state: {state.description}")
    
    try:
        # Format the emotional state information
        emotional_state_text = f"User feels: {state.description}. Stress level: {state.stress_level}/10."
        if state.physical_symptoms:
            emotional_state_text += f" Physical symptoms: {state.physical_symptoms}."
        emotional_state_text += f" Time available: {state.time_available} minutes."
        
        # Create prompt for analysis
        prompt = f"""As a meditation and breathing coach, I need to recommend a personalized breathing exercise.

User's emotional state: {emotional_state_text}

Please design a specific breathing exercise tailored to this emotional state. The exercise should include:
1. A name for the breathing technique
2. A short description of the exercise
3. Step-by-step breathing pattern with precise timings (in seconds) for:
   - Inhale duration
   - Hold after inhale (if applicable)
   - Exhale duration
   - Hold after exhale (if applicable)
4. Total duration (in minutes)
5. Benefits of this specific exercise
6. Who this exercise is particularly suitable for

Format the response as a JSON object with the following structure:
{{
  "name": "Name of technique",
  "description": "Brief description",
  "steps": [
    {{"action": "inhale", "duration": X, "instruction": "Breathe in slowly through your nose"}},
    {{"action": "hold", "duration": Y, "instruction": "Hold your breath"}},
    {{"action": "exhale", "duration": Z, "instruction": "Exhale slowly through your mouth"}},
    {{"action": "hold", "duration": W, "instruction": "Hold before breathing in again"}}
  ],
  "duration_minutes": minutes,
  "benefits": ["benefit 1", "benefit 2", "..."],
  "suitable_for": ["people with anxiety", "..."]
}}

The steps should form a cycle that repeats throughout the exercise period. Ensure the timing is appropriate for the emotional state.
"""
        
        # Invoke the LLM
        response = model.invoke(prompt)
        response_text = response.content
        
        # Extract the JSON
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        if json_start == -1 or json_end == 0:
            raise ValueError("Could not extract JSON from response")
            
        json_str = response_text[json_start:json_end]
        breathing_exercise = json.loads(json_str)
        
        # Ensure the exercise duration matches the available time
        breathing_exercise["duration_minutes"] = min(
            breathing_exercise.get("duration_minutes", 5),
            state.time_available
        )
        
        logger.info(f"Generated breathing exercise: {breathing_exercise['name']}")
        return breathing_exercise
    
    except Exception as e:
        logger.error(f"Error generating breathing exercise: {str(e)}")
        # Return default exercise if generation fails
        return DEFAULT_EXERCISE

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Breathing Exercise Generator API server")
    uvicorn.run(app, host="0.0.0.0", port=8001) 