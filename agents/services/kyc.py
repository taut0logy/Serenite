from fastapi import HTTPException
from deepface import DeepFace
import cv2
import numpy as np
import os
from typing import List, Tuple, Dict, Any
from utils.logger import logger
from datetime import datetime


class KYCService:
    def __init__(self):
        # Get absolute path for uploads directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.upload_dir = os.path.join(current_dir, "uploads")
        self.ensure_upload_directory()

        # Initialize face detection cascade
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

        # Verification thresholds
        self.VERIFICATION_THRESHOLD = 0.6  # DeepFace similarity threshold
        self.MIN_FACE_SIZE = (50, 50)  # Minimum face size for detection
        self.MAX_VERIFICATION_DISTANCE = 0.4  # Maximum distance for face verification

        logger.info(
            f"Enhanced KYC Service initialized with upload directory: {self.upload_dir}"
        )

    def ensure_upload_directory(self):
        """Ensure the upload directory exists"""
        try:
            if not os.path.exists(self.upload_dir):
                os.makedirs(self.upload_dir, exist_ok=True)
                # Set directory permissions (on Unix-like systems)
                if os.name == "posix":
                    os.chmod(self.upload_dir, 0o755)
                logger.info(f"Created uploads directory at: {self.upload_dir}")
            else:
                logger.info(f"Using existing uploads directory at: {self.upload_dir}")
        except Exception as e:
            logger.error(f"Failed to create uploads directory: {str(e)}")
            raise

    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for better face detection"""
        try:
            # Convert to RGB if needed
            if len(image.shape) == 3 and image.shape[2] == 3:
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            else:
                image_rgb = image

            # Enhance contrast and brightness
            lab = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2LAB)
            L, a, b = cv2.split(lab)

            # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            L = clahe.apply(L)

            # Merge channels and convert back
            enhanced = cv2.merge([L, a, b])
            enhanced_rgb = cv2.cvtColor(enhanced, cv2.COLOR_LAB2RGB)

            return enhanced_rgb

        except Exception as e:
            logger.warning(f"Image preprocessing failed, using original: {str(e)}")
            return image

    def detect_and_extract_faces(
        self, image: np.ndarray, is_id_card: bool = False
    ) -> List[Tuple[np.ndarray, Dict]]:
        """
        Detect and extract faces from image with metadata
        Returns list of (face_image, metadata) tuples
        """
        try:
            faces_data = []

            # Preprocess image
            processed_image = self.preprocess_image(image)

            # Convert to grayscale for face detection
            gray = cv2.cvtColor(processed_image, cv2.COLOR_RGB2GRAY)

            # Multiple scale face detection for better accuracy
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=self.MIN_FACE_SIZE,
                flags=cv2.CASCADE_SCALE_IMAGE,
            )

            logger.info(
                f"Detected {len(faces)} faces in {'ID card' if is_id_card else 'selfie'}"
            )

            for i, (x, y, w, h) in enumerate(faces):
                # Calculate face area and quality metrics
                face_area = w * h
                aspect_ratio = w / h

                # Add padding around face for better extraction
                padding = 20
                x_start = max(0, x - padding)
                y_start = max(0, y - padding)
                x_end = min(processed_image.shape[1], x + w + padding)
                y_end = min(processed_image.shape[0], y + h + padding)

                # Extract face region
                face_region = processed_image[y_start:y_end, x_start:x_end]

                # Calculate face quality score
                face_gray = gray[y : y + h, x : x + w]

                # Blur detection (Laplacian variance)
                blur_score = cv2.Laplacian(face_gray, cv2.CV_64F).var()

                # Brightness analysis
                brightness = np.mean(face_gray)

                # Face metadata
                metadata = {
                    "face_index": i,
                    "bounding_box": (x, y, w, h),
                    "face_area": face_area,
                    "aspect_ratio": aspect_ratio,
                    "blur_score": blur_score,
                    "brightness": brightness,
                    "quality_score": self._calculate_face_quality(
                        blur_score, brightness, face_area
                    ),
                    "is_id_card": is_id_card,
                }

                faces_data.append((face_region, metadata))

                logger.info(
                    f"Face {i}: Area={face_area}, Quality={metadata['quality_score']:.2f}, Blur={blur_score:.2f}"
                )

            # Sort faces by quality score (highest first)
            faces_data.sort(key=lambda x: x[1]["quality_score"], reverse=True)

            return faces_data

        except Exception as e:
            logger.error(f"Face detection failed: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Face detection failed: {str(e)}"
            )

    def _calculate_face_quality(
        self, blur_score: float, brightness: float, face_area: int
    ) -> float:
        """Calculate overall face quality score (0-100)"""
        try:
            # Blur quality (higher variance = less blur = better quality)
            blur_quality = min(100, blur_score / 10)  # Normalize blur score

            # Brightness quality (prefer faces with good illumination)
            optimal_brightness = 128  # Mid-gray
            brightness_diff = abs(brightness - optimal_brightness)
            brightness_quality = max(
                0, 100 - (brightness_diff / optimal_brightness) * 100
            )

            # Size quality (larger faces are generally better)
            size_quality = min(
                100, face_area / 5000 * 100
            )  # Normalize based on typical face size

            # Weighted average
            quality_score = (
                blur_quality * 0.4 + brightness_quality * 0.3 + size_quality * 0.3
            )

            return min(100, max(0, quality_score))

        except Exception:
            return 50.0  # Default moderate quality

    def select_best_face(
        self, faces_data: List[Tuple[np.ndarray, Dict]]
    ) -> Tuple[np.ndarray, Dict]:
        """Select the best quality face from detected faces"""
        if not faces_data:
            raise HTTPException(status_code=400, detail="No faces detected in image")

        # Already sorted by quality, return the best one
        best_face, best_metadata = faces_data[0]

        logger.info(
            f"Selected best face with quality score: {best_metadata['quality_score']:.2f}"
        )

        # Minimum quality threshold
        if best_metadata["quality_score"] < 30:
            raise HTTPException(
                status_code=400,
                detail=f"Face quality too low: {best_metadata['quality_score']:.1f}/100. Please provide a clearer image.",
            )

        return best_face, best_metadata

    async def save_image(self, file_data: bytes, user_id: str, image_type: str) -> str:
        """Save uploaded image to disk with validation"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{user_id}_{image_type}_{timestamp}.jpg"
            filepath = os.path.join(self.upload_dir, filename)

            logger.info(f"Attempting to save {image_type} image: {filepath}")

            # Convert bytes to numpy array
            nparr = np.frombuffer(file_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                logger.error("Failed to decode image data")
                raise HTTPException(
                    status_code=400,
                    detail="Invalid image data. Please upload a valid image file.",
                )

            # Validate image dimensions
            height, width = img.shape[:2]
            if width < 100 or height < 100:
                raise HTTPException(
                    status_code=400,
                    detail="Image resolution too low. Minimum 100x100 pixels required.",
                )

            if width > 4000 or height > 4000:
                # Resize large images to prevent memory issues
                scale = min(4000 / width, 4000 / height)
                new_width = int(width * scale)
                new_height = int(height * scale)
                img = cv2.resize(
                    img, (new_width, new_height), interpolation=cv2.INTER_AREA
                )
                logger.info(
                    f"Resized large image from {width}x{height} to {new_width}x{new_height}"
                )

            # Log image details
            logger.info(f"Image shape: {img.shape}")

            # Ensure the file is written
            success = cv2.imwrite(filepath, img)
            if not success:
                logger.error(f"Failed to write image to {filepath}")
                raise HTTPException(status_code=500, detail="Failed to save image")

            logger.info(f"Successfully saved image to: {filepath}")
            return filepath

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error saving image: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Failed to save image: {str(e)}"
            )

    async def verify_identity(
        self, selfie_path: str, id_card_path: str
    ) -> Dict[str, Any]:
        """
        Complete identity verification process
        1. Load and validate images
        2. Extract faces from both images
        3. Perform face verification
        4. Return detailed results
        """
        try:
            logger.info(
                f"Starting identity verification - Selfie: {selfie_path}, ID: {id_card_path}"
            )

            # Load images
            selfie_img = cv2.imread(selfie_path)
            id_card_img = cv2.imread(id_card_path)

            if selfie_img is None:
                raise HTTPException(
                    status_code=404, detail="Selfie image not found or corrupted"
                )
            if id_card_img is None:
                raise HTTPException(
                    status_code=404, detail="ID card image not found or corrupted"
                )

            # Step 1: Extract faces from selfie
            selfie_faces = self.detect_and_extract_faces(selfie_img, is_id_card=False)
            if not selfie_faces:
                raise HTTPException(
                    status_code=400,
                    detail="No face detected in selfie. Please ensure your face is clearly visible.",
                )

            # Step 2: Extract faces from ID card
            id_faces = self.detect_and_extract_faces(id_card_img, is_id_card=True)
            if not id_faces:
                raise HTTPException(
                    status_code=400,
                    detail="No face detected in ID card. Please ensure the ID photo is clear and visible.",
                )

            # Step 3: Select best faces
            best_selfie_face, selfie_metadata = self.select_best_face(selfie_faces)
            best_id_face, id_metadata = self.select_best_face(id_faces)

            # Step 4: Save extracted faces for verification
            selfie_face_path = selfie_path.replace(".jpg", "_face.jpg")
            id_face_path = id_card_path.replace(".jpg", "_face.jpg")

            cv2.imwrite(
                selfie_face_path, cv2.cvtColor(best_selfie_face, cv2.COLOR_RGB2BGR)
            )
            cv2.imwrite(id_face_path, cv2.cvtColor(best_id_face, cv2.COLOR_RGB2BGR))

            # Step 5: Perform face verification using multiple models
            verification_results = []
            models = ["VGG-Face", "Facenet", "ArcFace"]

            for model in models:
                try:
                    result = DeepFace.verify(
                        img1_path=selfie_face_path,
                        img2_path=id_face_path,
                        model_name=model,
                        distance_metric="cosine",
                        enforce_detection=False,
                    )
                    verification_results.append(
                        {
                            "model": model,
                            "verified": bool(result["verified"]),
                            "distance": float(result["distance"]),
                            "threshold": float(result["threshold"]),
                        }
                    )
                    logger.info(
                        f"{model} verification: {result['verified']} (distance: {result['distance']:.4f})"
                    )
                except Exception as e:
                    logger.warning(f"Verification with {model} failed: {str(e)}")
                    continue

            if not verification_results:
                raise HTTPException(
                    status_code=500, detail="All face verification models failed"
                )

            # Step 6: Calculate final verification result
            verified_count = sum(1 for r in verification_results if r["verified"])
            total_models = len(verification_results)
            confidence_score = verified_count / total_models

            # Additional confidence factors
            quality_factor = (
                min(selfie_metadata["quality_score"], id_metadata["quality_score"])
                / 100
            )
            final_confidence = (confidence_score * 0.7) + (quality_factor * 0.3)

            is_verified = final_confidence >= 0.65  # 65% threshold for verification

            # Step 7: Prepare detailed result
            result = {
                "verified": is_verified,
                "confidence_score": round(final_confidence * 100, 2),
                "verification_threshold": 65.0,
                "selfie_quality": round(selfie_metadata["quality_score"], 2),
                "id_photo_quality": round(id_metadata["quality_score"], 2),
                "models_agreed": verified_count,
                "total_models": total_models,
                "individual_results": verification_results,
                "timestamp": datetime.now().isoformat(),
                "message": self._get_verification_message(
                    is_verified, final_confidence * 100
                ),
            }

            # Cleanup extracted face images
            self._safe_delete([selfie_face_path, id_face_path])

            logger.info(
                f"Identity verification completed: {result['verified']} with {result['confidence_score']}% confidence"
            )

            return result

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Identity verification failed: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Identity verification failed: {str(e)}"
            )

    def _get_verification_message(self, is_verified: bool, confidence: float) -> str:
        """Generate user-friendly verification message"""
        if is_verified:
            if confidence >= 90:
                return "Identity verification successful with high confidence."
            elif confidence >= 75:
                return "Identity verification successful with good confidence."
            else:
                return "Identity verification successful with moderate confidence."
        else:
            if confidence >= 50:
                return "Identity verification failed. The images appear to be of different people, but please ensure good lighting and image quality."
            elif confidence >= 30:
                return "Identity verification failed. Please ensure both images are clear, well-lit, and the face is fully visible."
            else:
                return "Identity verification failed. Please retake both photos with better lighting and ensure faces are clearly visible."

    def _safe_delete(self, file_paths: List[str]):
        """Safely delete files without raising exceptions"""
        for path in file_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
                    logger.info(f"Deleted temporary file: {path}")
            except Exception as e:
                logger.warning(f"Failed to delete file {path}: {str(e)}")

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


# Create service instance
kyc_service = KYCService()
