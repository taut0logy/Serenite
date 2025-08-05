# Diary Mood Analysis Agent

This is a LangGraph and LangChain-based AI agent that analyzes user diary entries to track mood patterns using Groq's Mixtral model.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the project root with your Groq API key:
```
GROQ_API_KEY=your_api_key_here
```

## Running the Application

Start the FastAPI server:
```bash
python diary.py
```

The server will start at `http://localhost:8000`

## API Usage

### Analyze Diary Entry

Send a POST request to `/analyze` with the following JSON body:

```json
{
    "content": "Your diary entry text here",
    "date": "2024-04-08"
}
```

The response will include:
- mood: The detected mood
- analysis: Explanation of the mood detection
- confidence: Confidence score (0-1)

Example response:
```json
{
    "mood": "happy",
    "analysis": "The entry contains positive language and expressions of joy",
    "confidence": 0.85
}
```

## API Documentation

Once the server is running, visit `http://localhost:8000/docs` for interactive API documentation. 