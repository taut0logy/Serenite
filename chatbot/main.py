from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
from chatbot_service import ChatbotService
from kyc import KYCService
from datetime import datetime
import json
import logging

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
chatbot_service = ChatbotService()
kyc_service = KYCService()

# Enhanced logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ChatRequest(BaseModel):
    message: str
    chat_history: List[Dict[str, str]]

class ChatResponse(BaseModel):
    response: str

class VerificationResult(BaseModel):
    verified: bool
    confidence: float
    details: List[dict]

class VerifyRequest(BaseModel):
    id_photo_path: str
    selfie_paths: List[str]

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        response = await chatbot_service.get_response(
            request.message,
            request.chat_history
        )
        return ChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversation/summary")
async def get_conversation_summary():
    """Get summary of the current conversation."""
    summary = chatbot_service.get_conversation_summary()
    if not summary:
        raise HTTPException(status_code=404, detail="No conversation history found")
    return summary

@app.get("/user/{user_id}/mood")
async def get_user_mood(user_id: str):
    """Get mood analysis for a specific user."""
    analysis = chatbot_service.get_mood_analysis(user_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="No mood data found for user")
    return analysis

@app.get("/crisis-resources")
async def get_crisis_resources():
    """Get crisis resources and helpline information."""
    return chatbot_service.crisis_resources

@app.get("/health")
async def health_check():
    """Check if the service is healthy."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/")
async def root():
    return {"message": "Chatbot API is running"}

@app.post("/kyc/upload-id")
async def upload_id_photo(
    user_id: str = Form(...),
    id_photo: UploadFile = File(...)
):
    """Upload ID photo for KYC verification"""
    try:
        # Log the upload attempt
        logger.info(f"Receiving ID photo upload for user: {user_id}")
        logger.info(f"File details - Filename: {id_photo.filename}, Content-Type: {id_photo.content_type}")
        
        # Read file contents
        contents = await id_photo.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file received")
            
        logger.info(f"Successfully read {len(contents)} bytes from uploaded file")
        
        # Save the image
        file_path = await kyc_service.save_image(contents, user_id, "id")
        logger.info(f"Successfully saved ID photo to: {file_path}")
        
        return {"status": "success", "file_path": file_path}
    except Exception as e:
        logger.error(f"Error in upload_id_photo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/kyc/upload-selfies")
async def upload_selfies(
    user_id: str = Form(...),
    selfies: UploadFile = File(...)
):
    """Upload selfie for KYC verification"""
    try:
        logger.info(f"Receiving selfie upload for user: {user_id}")
        logger.info(f"File details - Filename: {selfies.filename}, Content-Type: {selfies.content_type}")
        
        # Read file contents
        contents = await selfies.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file received")
            
        logger.info(f"Successfully read {len(contents)} bytes from uploaded file")
        
        # Save the image
        file_path = await kyc_service.save_image(contents, user_id, "selfie")
        logger.info(f"Successfully saved selfie to: {file_path}")
        
        return {"status": "success", "file_paths": [file_path]}
    except Exception as e:
        logger.error(f"Error in upload_selfies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/kyc/verify")
async def verify_identity(request: VerifyRequest):
    try:
        result = await kyc_service.verify_face_match(
            request.id_photo_path,
            request.selfie_paths
        )
        
        # Clean up uploaded files after verification
        kyc_service.cleanup_images([request.id_photo_path] + request.selfie_paths)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
