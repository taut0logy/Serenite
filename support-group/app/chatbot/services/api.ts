interface ChatRequest {
  message: string;
  chat_history: Array<{
    type: string;
    content: string;
  }>;
}

interface ChatResponse {
  response: string;
}

const API_BASE_URL = 'http://localhost:8000';

export async function sendMessage(message: string, chatHistory: Array<any> = []) {
  try {
    // Convert the chat history to the format expected by FastAPI
    const formattedHistory = chatHistory.map(msg => ({
      type: msg.role === 'bot' ? 'system' : 'human',
      content: msg.content
    }));

    const requestBody = {
      message: message,
      chat_history: formattedHistory
    };

    console.log('Sending request:', requestBody);

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.detail || 'Failed to get response from chatbot');
    }

    return responseData.response;
  } catch (error) {
    console.error('Chat API Error:', error);
    throw error;
  }
}
