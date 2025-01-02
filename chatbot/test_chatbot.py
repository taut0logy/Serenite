import requests
import json

def test_chatbot():
    url = "http://localhost:8000/chat"
    headers = {
        "Content-Type": "application/json"
    }
    
    # Test conversation
    messages = [
        "Hello, how are you?",
        "I'm feeling sad today",
        "Can you help me feel better?"
    ]
    
    chat_history = []
    
    for message in messages:
        payload = {
            "message": message,
            "chat_history": chat_history
        }
        
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            bot_response = response.json()["response"]
            print(f"You: {message}")
            print(f"Bot: {bot_response}")
            print("-" * 50)
            
            # Update chat history
            chat_history.append({"type": "human", "content": message})
            chat_history.append({"type": "system", "content": bot_response})
        else:
            print(f"Error: {response.status_code}")
            print(response.text)

if __name__ == "__main__":
    test_chatbot()
