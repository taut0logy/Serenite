# Bangladesh Mental Health Support Assistant

This project provides a mental health support assistant specifically designed for Bangladesh, featuring:

- AI-powered mental health chat assistant
- Facial emotion detection
- Voice tone analysis
- Emotion tracking and journaling

## Backend Setup

The backend is built with FastAPI and provides API endpoints that can be consumed by a NextJS frontend.

### Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables in a `.env` file:
```
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
ASTRA_DB_APPLICATION_TOKEN=your_astra_db_token
ASTRA_DB_ID=your_astra_db_id
```

### Running the Backend Server

Start the FastAPI server:
```bash
uvicorn app:app --reload
```

The server will be available at `http://localhost:8000` and the API documentation at `http://localhost:8000/docs`.

## API Endpoints

### Chat API

- `POST /chat` - Chat with the mental health assistant
  - Request body: `ChatRequest` with message and optional emotion data
  - Response: `ChatResponse` with assistant messages and updated state

### Emotion Detection

- `POST /detect-face-emotion` - Analyze a facial image for emotion
  - Request: Upload an image file
  - Response: `EmotionDetectionResult` with emotion, score, and insights

- `POST /analyze-voice` - Analyze a voice recording for emotional tone
  - Request: Upload an audio file (WAV format)
  - Response: `EmotionDetectionResult` with emotion, score, and insights

### Emotion Journal

- `POST /emotion-journal/add` - Add an entry to the emotion journal
  - Request body: `EmotionJournalEntry` with emotion data
  - Response: The saved entry

- `GET /emotion-journal` - Get the emotion journal with pattern analysis
  - Response: `EmotionJournalResponse` with entries and analyzed patterns

### Other Resources

- `GET /emotion-insights/{emotion_type}/{emotion}` - Get detailed insights for a specific emotion
  - Path parameters: `emotion_type` (face/voice), `emotion` (e.g., happy, sad)
  - Response: Detailed insights for the specified emotion

- `GET /resources` - Get mental health resources for Bangladesh
  - Response: List of crisis resources and organizations

## Frontend Integration

The API is designed to work with a NextJS frontend. See `support-group/app/mental-health-assistant/page.jsx` for the frontend implementation.

## Note

In production:
1. Replace the in-memory emotion journal storage with a database
2. Set proper CORS origins for security
3. Add authentication and authorization
4. Deploy behind HTTPS 