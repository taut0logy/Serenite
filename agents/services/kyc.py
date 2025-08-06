from fastapi import HTTPException
from deepface import DeepFace
import cv2
import numpy as np
import os
from typing import List
import logging
from datetime import datetime

# Enhanced logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class KYCService:
    def __init__(self):
        # Get absolute path for uploads directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.upload_dir = os.path.join(current_dir, "uploads")
        self.ensure_upload_directory()
        logger.info(f"Upload directory initialized at: {self.upload_dir}")
        
    def ensure_upload_directory(self):
        """Ensure the upload directory exists"""
        try:
            if not os.path.exists(self.upload_dir):
                os.makedirs(self.upload_dir, exist_ok=True)
                # Set directory permissions (on Unix-like systems)
                if os.name == 'posix':
                    os.chmod(self.upload_dir, 0o755)
                logger.info(f"Created uploads directory at: {self.upload_dir}")
            else:
                logger.info(f"Using existing uploads directory at: {self.upload_dir}")
        except Exception as e:
            logger.error(f"Failed to create uploads directory: {str(e)}")
            raise
            
    async def save_image(self, file_data: bytes, user_id: str, image_type: str) -> str:
        """Save uploaded image to disk"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{user_id}_{image_type}_{timestamp}.jpg"
            filepath = os.path.join(self.upload_dir, filename)
            
            logger.info(f"Attempting to save image: {filepath}")
            
            # Convert bytes to numpy array
            nparr = np.frombuffer(file_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                logger.error("Failed to decode image data")
                raise HTTPException(status_code=400, detail="Invalid image data")
            
            # Log image details
            logger.info(f"Image shape: {img.shape}")
            
            # Ensure the file is written
            success = cv2.imwrite(filepath, img)
            if not success:
                logger.error(f"Failed to write image to {filepath}")
                raise HTTPException(status_code=500, detail="Failed to save image")
            
            logger.info(f"Successfully saved image to: {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error saving image: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")
        
    async def verify_face_match(self, id_photo_path: str, selfie_paths: List[str]) -> dict:
        """Verify if the ID photo matches the selfies"""
        try:
            logger.info(f"Starting face verification - ID: {id_photo_path}, Selfies: {selfie_paths}")
            
            # Verify files exist
            if not os.path.exists(id_photo_path):
                logger.error(f"ID photo not found: {id_photo_path}")
                raise HTTPException(status_code=404, detail="ID photo not found")
                
            for selfie_path in selfie_paths:
                if not os.path.exists(selfie_path):
                    logger.error(f"Selfie not found: {selfie_path}")
                    raise HTTPException(status_code=404, detail="Selfie not found")
            
            results = []
            for selfie_path in selfie_paths:
                result = DeepFace.verify(
                    img1_path=id_photo_path,
                    img2_path=selfie_path,
                    model_name="VGG-Face",
                    distance_metric="cosine"
                )
                results.append(result)
                logger.info(f"Verification result for {selfie_path}: {result}")
                
            # Calculate average confidence
            verified_count = sum(1 for r in results if r["verified"])
            confidence = verified_count / len(results)
            
            verification_result = {
                "verified": confidence >= 0.7,
                "confidence": confidence,
                "details": results
            }
            logger.info(f"Final verification result: {verification_result}")
            return verification_result
            
        except Exception as e:
            logger.error(f"Face verification failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Face verification failed: {str(e)}"
            )
            
    def cleanup_images(self, file_paths: List[str]):
        """Clean up temporary image files"""
        for path in file_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
                    logger.info(f"Successfully deleted file: {path}")
                else:
                    logger.warning(f"File not found for deletion: {path}")
            except Exception as e:
                logger.error(f"Failed to delete file {path}: {str(e)}")
