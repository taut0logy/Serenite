"""
AWS Rekognition adapter for face detection, emotion analysis, and verification
Replaces local DeepFace models with cloud API
"""

import boto3
from typing import Tuple, Dict, Optional
from io import BytesIO
from PIL import Image
import numpy as np
from config.settings import settings
from utils.logger import logger


class AWSRekognitionAdapter:
    """
    Adapter for AWS Rekognition face operations
    Provides unified interface for emotion detection and face verification
    """

    def __init__(self):
        """Initialize AWS Rekognition client"""
        try:
            self.client = boto3.client(
                "rekognition",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )
            logger.info(
                f"AWS Rekognition client initialized (region: {settings.AWS_REGION})"
            )
        except Exception as e:
            logger.error(f"Failed to initialize AWS Rekognition: {e}")
            raise

    def detect_emotion(self, image_data) -> Tuple[Optional[str], Optional[float]]:
        """
        Detect emotion from image using AWS Rekognition

        Args:
            image_data: Can be bytes, numpy array, or PIL Image

        Returns:
            Tuple of (emotion_name, confidence_score) or (None, None) if failed
        """
        try:
            # Convert image to bytes if needed
            image_bytes = self._prepare_image_bytes(image_data)

            logger.info(
                f"Sending image to AWS Rekognition (size: {len(image_bytes)} bytes)"
            )

            # Call AWS Rekognition
            response = self.client.detect_faces(
                Image={"Bytes": image_bytes},
                Attributes=["ALL"],  # Include emotions, age, gender, etc.
            )

            logger.info(f"AWS Rekognition response: {response}")

            if not response["FaceDetails"]:
                logger.warning("No faces detected in image")
                logger.warning(f"Full response: {response}")
                return None, None

            # Get the first face (primary face)
            face = response["FaceDetails"][0]

            # Get emotions
            emotions = face.get("Emotions", [])
            if not emotions:
                logger.warning("No emotions detected")
                return None, None

            # Find dominant emotion (highest confidence)
            dominant_emotion = max(emotions, key=lambda x: x["Confidence"])

            emotion_name = dominant_emotion["Type"].lower()
            confidence = dominant_emotion["Confidence"]

            logger.info(
                f"Detected emotion: {emotion_name} (confidence: {confidence:.2f}%)"
            )

            # Map AWS emotion names to our system's emotion names
            emotion_mapping = {
                "happy": "happy",
                "sad": "sad",
                "angry": "angry",
                "confused": "neutral",
                "disgusted": "disgust",
                "surprised": "surprise",
                "calm": "neutral",
                "fear": "fear",
                "unknown": "neutral",
            }

            mapped_emotion = emotion_mapping.get(emotion_name, emotion_name)

            return mapped_emotion, confidence

        except Exception as e:
            logger.error(f"Error detecting emotion: {e}")
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error details: {str(e)}")
            import traceback

            logger.error(f"Traceback: {traceback.format_exc()}")
            return None, None

    def verify_faces(
        self, source_image, target_image, similarity_threshold: float = 80.0
    ) -> Dict:
        """
        Verify if two faces match using AWS Rekognition

        Args:
            source_image: First image (bytes, numpy array, or PIL Image)
            target_image: Second image (bytes, numpy array, or PIL Image)
            similarity_threshold: Minimum similarity percentage (0-100)

        Returns:
            Dict with verification results:
            {
                'verified': bool,
                'confidence': float,
                'similarity': float,
                'face_matches': bool,
                'details': dict
            }
        """
        try:
            # Convert images to bytes
            source_bytes = self._prepare_image_bytes(source_image)
            target_bytes = self._prepare_image_bytes(target_image)

            # Call AWS Rekognition compare faces
            response = self.client.compare_faces(
                SourceImage={"Bytes": source_bytes},
                TargetImage={"Bytes": target_bytes},
                SimilarityThreshold=similarity_threshold,
            )

            # Check if faces match
            face_matches = response.get("FaceMatches", [])

            if face_matches:
                # Faces match
                match = face_matches[0]
                similarity = match["Similarity"]
                confidence = match["Face"]["Confidence"]

                result = {
                    "verified": True,
                    "confidence": confidence,
                    "similarity": similarity,
                    "face_matches": True,
                    "details": {
                        "bounding_box": match["Face"]["BoundingBox"],
                        "landmarks": match["Face"].get("Landmarks", []),
                        "pose": match["Face"].get("Pose", {}),
                        "quality": match["Face"].get("Quality", {}),
                    },
                }

                logger.info(f"Face verification: MATCH (similarity: {similarity:.2f}%)")
            else:
                # No match found
                result = {
                    "verified": False,
                    "confidence": 0.0,
                    "similarity": 0.0,
                    "face_matches": False,
                    "details": {"unmatched_faces": response.get("UnmatchedFaces", [])},
                }

                logger.info("Face verification: NO MATCH")

            return result

        except Exception as e:
            logger.error(f"Error verifying faces: {e}")
            return {
                "verified": False,
                "confidence": 0.0,
                "similarity": 0.0,
                "face_matches": False,
                "error": str(e),
            }

    def detect_face_attributes(self, image_data) -> Dict:
        """
        Get comprehensive face attributes including age, gender, emotions, etc.

        Args:
            image_data: Image as bytes, numpy array, or PIL Image

        Returns:
            Dict with all face attributes
        """
        try:
            image_bytes = self._prepare_image_bytes(image_data)

            response = self.client.detect_faces(
                Image={"Bytes": image_bytes}, Attributes=["ALL"]
            )

            if not response["FaceDetails"]:
                return {"error": "No face detected"}

            face = response["FaceDetails"][0]

            # Extract all attributes
            attributes = {
                "age_range": {
                    "low": face.get("AgeRange", {}).get("Low", 0),
                    "high": face.get("AgeRange", {}).get("High", 0),
                },
                "gender": {
                    "value": face.get("Gender", {}).get("Value", "Unknown"),
                    "confidence": face.get("Gender", {}).get("Confidence", 0),
                },
                "emotions": [
                    {"type": e["Type"], "confidence": e["Confidence"]}
                    for e in face.get("Emotions", [])
                ],
                "smile": face.get("Smile", {}).get("Value", False),
                "eyeglasses": face.get("Eyeglasses", {}).get("Value", False),
                "sunglasses": face.get("Sunglasses", {}).get("Value", False),
                "beard": face.get("Beard", {}).get("Value", False),
                "mustache": face.get("Mustache", {}).get("Value", False),
                "eyes_open": face.get("EyesOpen", {}).get("Value", True),
                "mouth_open": face.get("MouthOpen", {}).get("Value", False),
                "quality": face.get("Quality", {}),
                "confidence": face.get("Confidence", 0),
            }

            return attributes

        except Exception as e:
            logger.error(f"Error detecting face attributes: {e}")
            return {"error": str(e)}

    def _prepare_image_bytes(self, image_data) -> bytes:
        """
        Convert various image formats to bytes for AWS Rekognition

        Args:
            image_data: bytes, numpy array, or PIL Image

        Returns:
            Image as bytes
        """
        try:
            # If already bytes, return as-is
            if isinstance(image_data, bytes):
                logger.info("Image data already in bytes format")
                return image_data

            # If numpy array, convert to bytes
            if isinstance(image_data, np.ndarray):
                logger.info(
                    f"Converting numpy array to bytes (shape: {image_data.shape}, dtype: {image_data.dtype})"
                )

                # Handle grayscale images (convert to RGB)
                if len(image_data.shape) == 2:
                    logger.info("Grayscale image detected, converting to RGB")
                    # Convert grayscale to RGB by stacking the same data 3 times
                    image_data = np.stack([image_data] * 3, axis=-1)
                    logger.info(f"Converted to RGB (new shape: {image_data.shape})")

                # Handle RGBA images (convert to RGB)
                elif len(image_data.shape) == 3 and image_data.shape[2] == 4:
                    logger.info("RGBA image detected, converting to RGB")
                    image_data = image_data[:, :, :3]
                    logger.info(f"Converted to RGB (new shape: {image_data.shape})")

                # Convert to PIL Image
                image = Image.fromarray(image_data.astype("uint8"))
            elif isinstance(image_data, Image.Image):
                logger.info(
                    f"PIL Image provided (size: {image_data.size}, mode: {image_data.mode})"
                )

                # Convert grayscale or other modes to RGB
                if image_data.mode != "RGB":
                    logger.info(f"Converting {image_data.mode} image to RGB")
                    image = image_data.convert("RGB")
                    logger.info("Converted to RGB")
                else:
                    image = image_data
            else:
                raise ValueError(f"Unsupported image type: {type(image_data)}")

            # Convert PIL Image to bytes
            buffer = BytesIO()
            # Save as JPEG (AWS Rekognition supports JPEG and PNG)
            image.save(buffer, format="JPEG")
            image_bytes = buffer.getvalue()
            logger.info(
                f"Image converted to JPEG bytes (size: {len(image_bytes)} bytes)"
            )
            return image_bytes
        except Exception as e:
            logger.error(f"Error in _prepare_image_bytes: {e}")
            import traceback

            logger.error(f"Traceback: {traceback.format_exc()}")
            raise


# Singleton instance for easy import
try:
    if settings.USE_API_MODELS and settings.AWS_ACCESS_KEY_ID:
        rekognition = AWSRekognitionAdapter()
        logger.info("AWS Rekognition adapter initialized")
    else:
        rekognition = None
        logger.info("AWS Rekognition not configured (using local models)")
except Exception as e:
    logger.warning(f"Could not initialize AWS Rekognition: {e}")
    rekognition = None
