# Mental Health Chatbot Assistant

A modern web application offering a ChatGPT-like interface for mental health support, with emotion detection capabilities and an emotion journal.

## Features

- **AI-Powered Chat Interface**: Chat with an AI mental health assistant that provides support, resources, and guidance
- **Emotion Detection**: Capture facial expressions and voice tone to detect emotions
- **Emotion Journal**: Track your emotional states over time
- **Mental Health Resources**: Access to crisis resources and mental health organizations

## Technology Stack

- **Frontend**: Next.js with React
- **Backend**: FastAPI Python backend
- **Emotion Analysis**: Computer vision and audio processing for emotion detection

## Project Structure

```
support-group/
├── app/
│   └── mental-health-assistant/
│       ├── page.jsx               # Main chat interface
│       ├── layout.jsx             # Layout for the mental health assistant
│       └── resources/
│           └── page.jsx           # Mental health resources page
├── components/
│   ├── ChatMessage.jsx            # Component for individual chat messages
│   └── EmotionJournal.jsx         # Component for emotion journal functionality
├── public/                        # Static assets
└── README.md                      # Project documentation
```

## Getting Started

### Prerequisites

- Node.js 14+ and npm/yarn
- Python 3.8+
- pip (Python package manager)

### Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd support-group
   ```

2. Install frontend dependencies:
   ```
   npm install
   # or
   yarn install
   ```

3. Install backend dependencies:
   ```
   cd ../ai-agent-assistant
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```
   python app.py
   ```

5. Start the frontend development server:
   ```
   cd ../support-group
   npm run dev
   # or
   yarn dev
   ```

6. Open your browser and navigate to `http://localhost:3000/mental-health-assistant`

## API Endpoints

The backend provides the following endpoints:

- `/chat` - Chat with the mental health assistant
- `/detect-face-emotion` - Analyze facial emotion from uploaded image
- `/analyze-voice` - Analyze voice tone from uploaded audio
- `/emotion-journal/add` - Add entry to emotion journal
- `/emotion-journal` - Get emotion journal entries with pattern analysis
- `/emotion-insights/{emotion_type}/{emotion}` - Get insights for specific emotions
- `/resources` - Access mental health resources for Bangladesh

## Usage

1. **Chat Interface**: Type your message in the input box and press enter or click the send button
2. **Emotion Detection**: Click the camera icon to upload an image for facial emotion detection
3. **Voice Analysis**: Click the microphone icon to record your voice for tone analysis
4. **Emotion Journal**: Click the journal button to view and add entries to your emotion journal

## Note

This application is designed for educational and supportive purposes only. It is not a replacement for professional mental health care. If you or someone you know is in crisis, please contact local emergency services or a mental health crisis helpline.
