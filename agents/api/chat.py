from fastapi import APIRouter, HTTPException, Request, Depends
import requests
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from services.mental_health_assistant import (
    chat_with_mental_health_assistant,
)
from models.chat import (
    ChatRequest,
    ChatResponse,
    TranslationRequest,
    TranslationResponse,
)
from middleware.auth import get_current_user
from config.limiter import limiter


router = APIRouter(prefix="/chat", tags=["Mental Health Assistant"])

feedback_data = []  # Store feedback data in memory
chat_histories = {}


@router.post("/", response_model=ChatResponse)
@limiter.limit("5/minute")
async def chat(request: Request, input: ChatRequest, user = Depends(get_current_user)):
    """
    Chat with the mental health assistant.

    If emotion data is included, it will be incorporated into the conversation.
    """
    global chat_histories

    # Check for user ID - required for memory management
    user_id = input.user_id
    if not user_id:
        raise HTTPException(
            status_code=400, detail="User ID is required for chat history"
        )

    # Retrieve or create chat history for this user
    if user_id not in chat_histories:
        chat_histories[user_id] = ChatMessageHistory()

    # Get the chat history
    history = chat_histories[user_id]

    # Initialize agent state if needed
    if input.agent_state is None:
        input.agent_state = {}

    # Check if we should add message history to the agent state
    if "messages" not in input.agent_state:
        # Convert langchain ChatMessageHistory to the format our assistant expects
        converted_messages = []
        for msg in history.messages:
            if isinstance(msg, HumanMessage):
                converted_messages.append({"type": "human", "content": msg.content})
            elif isinstance(msg, AIMessage):
                converted_messages.append({"type": "ai", "content": msg.content})
            elif isinstance(msg, SystemMessage):
                converted_messages.append({"type": "system", "content": msg.content})

        # Add messages to agent state if there's history
        if converted_messages:
            input.agent_state["message_history"] = converted_messages

    # Add facial emotion data to state if selected
    if input.include_face_emotion and input.face_emotion:
        input.agent_state["facial_emotion"] = {
            "emotion": input.face_emotion.get("emotion", ""),
            "score": input.face_emotion.get("score", 0.0),
        }

    # Add voice emotion data to state if selected
    if input.include_voice_emotion and input.voice_emotion:
        input.agent_state["voice_emotion"] = {
            "emotion": input.voice_emotion.get("emotion", ""),
            "score": input.voice_emotion.get("score", 0.0),
        }

    # Add user message to history
    history.add_user_message(input.message)

    # Pass the original message and updated state to the assistant
    result = chat_with_mental_health_assistant(input.message, input.agent_state)

    # Format response
    formatted_messages = []
    assistant_response = None

    if "messages" in result:
        for msg in result["messages"]:
            if hasattr(msg, "type") and msg.type == "human":
                formatted_messages.append({"role": "user", "content": msg.content})
            elif hasattr(msg, "type") and msg.type == "ai":
                formatted_messages.append({"role": "assistant", "content": msg.content})
                assistant_response = msg.content  # Save the assistant's response
            elif hasattr(msg, "type") and msg.type == "function":
                formatted_messages.append(
                    {"role": "function", "content": msg.content, "name": msg.name}
                )

    # Add assistant response to history if we found one
    if assistant_response:
        history.add_ai_message(assistant_response)

    # Store updated chat history
    chat_histories[user_id] = history

    # Limit memory usage (keep only the most recent 100 users' chat histories)
    if len(chat_histories) > 100:
        oldest_keys = sorted(chat_histories.keys())[:-100]
        for key in oldest_keys:
            chat_histories.pop(key, None)

    return {"messages": formatted_messages, "agent_state": result}


@router.get("/history/{user_id}")
@limiter.limit("10/minute")
async def get_chat_history(request: Request, user_id: str, user: dict = Depends(get_current_user)):
    """
    Get the chat history for a specific user
    """
    global chat_histories

    if user_id not in chat_histories:
        return {"messages": []}

    history = chat_histories[user_id]
    formatted_messages = []

    for msg in history.messages:
        if isinstance(msg, HumanMessage):
            formatted_messages.append({"role": "user", "content": msg.content})
        elif isinstance(msg, AIMessage):
            formatted_messages.append({"role": "assistant", "content": msg.content})
        elif isinstance(msg, SystemMessage):
            formatted_messages.append({"role": "system", "content": msg.content})

    return {"messages": formatted_messages}


@router.delete("/history/{user_id}")
@limiter.limit("10/minute")
async def clear_chat_history(request: Request, user_id: str, user = Depends(get_current_user)):
    """
    Clear the chat history for a specific user
    """
    global chat_histories

    if user_id in chat_histories:
        chat_histories[user_id] = ChatMessageHistory()

    return {"status": "success", "message": "Chat history cleared"}


@router.get("/resources")
@limiter.limit("10/minute")
async def get_mental_health_resources(request: Request):
    """Get mental health resources for Bangladesh"""
    return {
        "crisis_resources": [
            {
                "name": "National Mental Health Helpline (Bangladesh)",
                "contact": "01688-709965, 01688-709966",
                "description": "Government helpline for mental health support",
            },
            {
                "name": "Kaan Pete Roi (Emotional Support)",
                "contact": "9612119911",
                "description": "Emotional support and suicide prevention hotline",
            },
            {
                "name": "Bangladesh Emergency Services",
                "contact": "999",
                "description": "National emergency services",
            },
        ],
        "organizations": [
            {
                "name": "National Institute of Mental Health (NIMH)",
                "website": "https://nimhbd.com/",
                "description": "Leading mental health institution in Bangladesh",
            },
            {
                "name": "Bangladesh Association of Psychiatrists",
                "website": "http://www.bap.org.bd/",
                "description": "Professional association of psychiatrists",
            },
            {
                "name": "Dhaka Community Hospital",
                "website": "http://dchtrust.org/",
                "description": "Hospital providing mental health services",
            },
            {
                "name": "Mental Health & Psychosocial Support Network Bangladesh",
                "website": "https://www.mhinnovation.net/organisations/mental-health-psychosocial-support-network-bangladesh",
                "description": "Network providing psychosocial support",
            },
        ],
    }


@router.post("/translate", response_model=TranslationResponse)
@limiter.limit("5/minute")
async def translate_text(request: Request, input: TranslationRequest, user: dict = Depends(get_current_user)):
    """
    Translate text from one language to another using Google Translate API directly
    """
    try:
        # Use public Google Translate API directly with requests
        # This is more stable and doesn't have dependency conflicts
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={input.target_language}&dt=t&q={requests.utils.quote(input.text)}"

        response = requests.get(url)
        if response.status_code != 200:
            raise HTTPException(
                status_code=500, detail="Translation service unavailable"
            )

        # Parse the response from Google
        result = response.json()

        # Extract translated text from the nested response structure
        translated_text = "".join([sentence[0] for sentence in result[0]])

        # Get detected source language if available
        source_language = result[2] if len(result) > 2 else "auto"

        return TranslationResponse(
            original_text=input.text,
            translated_text=translated_text,
            source_language=source_language,
            target_language=input.target_language,
        )
    except Exception as e:
        # Handle errors
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")
