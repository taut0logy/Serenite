from fastapi import HTTPException
import cv2
import numpy as np
import os
from typing import List, Tuple, Dict, Any
from utils.logger import logger
from datetime import datetime
from config.settings import settings

# Import S3 storage adapter for temporary file storage
from services.s3_storage_adapter import s3_storage

# Import AWS Rekognition adapter for face verification
try:
    from services.aws_rekognition_adapter import rekognition

    USE_REKOGNITION = rekognition is not None and settings.USE_API_MODELS
except ImportError:
    USE_REKOGNITION = False
    logger.warning("AWS Rekognition adapter not available, using fallback")

# Fallback to DeepFace if AWS Rekognition not configured
if not USE_REKOGNITION:
    try:
        from deepface import DeepFace

        logger.info("Using DeepFace for face verification (fallback)")
    except ImportError:
        logger.warning("DeepFace not available, face verification may not work")


class KYCService:
    def __init__(self):
        # Get absolute path for temporary uploads directory
        # NOTE: All files in this directory are temporary and will be deleted after verification
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.upload_dir = os.path.join(current_dir, "uploads")
        self.ensure_upload_directory()

        # Initialize face detection cascade
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

        # Verification thresholds
        self.VERIFICATION_THRESHOLD = (
            0.6  # Similarity threshold (for DeepFace fallback)
        )
        self.REKOGNITION_THRESHOLD = (
            80.0  # AWS Rekognition similarity threshold (0-100)
        )
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
        """
        Save uploaded image with validation
        Uses S3 storage if enabled, otherwise falls back to local storage
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{user_id}_{image_type}_{timestamp}.jpg"

            logger.info(f"Attempting to save {image_type} image for user {user_id}")

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

            # Encode image back to bytes for storage
            success, img_encoded = cv2.imencode(".jpg", img)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to encode image")

            img_bytes = img_encoded.tobytes()

            # Save to S3 or local storage using the adapter
            file_key = await s3_storage.save_file(
                file_data=img_bytes,
                user_id=user_id,
                filename=filename,
                content_type="image/jpeg",
            )

            logger.info(f"Successfully saved {image_type} image: {file_key}")
            return file_key

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

        Note: Face crop files are created temporarily during verification
        but are automatically cleaned up after processing.
        """
        # Track face crop files for cleanup
        selfie_face_path = None
        id_face_path = None

        try:
            logger.info(
                f"Starting identity verification - Selfie: {selfie_path}, ID: {id_card_path}"
            )

            # Load images from S3 or local storage
            selfie_bytes = await s3_storage.get_file(selfie_path)
            id_card_bytes = await s3_storage.get_file(id_card_path)

            if selfie_bytes is None:
                raise HTTPException(
                    status_code=404, detail="Selfie image not found or corrupted"
                )
            if id_card_bytes is None:
                raise HTTPException(
                    status_code=404, detail="ID card image not found or corrupted"
                )

            # Decode images from bytes
            selfie_img = cv2.imdecode(
                np.frombuffer(selfie_bytes, np.uint8), cv2.IMREAD_COLOR
            )
            id_card_img = cv2.imdecode(
                np.frombuffer(id_card_bytes, np.uint8), cv2.IMREAD_COLOR
            )

            if selfie_img is None:
                raise HTTPException(
                    status_code=404, detail="Selfie image not found or corrupted"
                )
            if id_card_img is None:
                raise HTTPException(
                    status_code=404, detail="ID card image not found or corrupted"
                )  # Step 1: Extract faces from selfie
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

            # Step 4: Save extracted face crops temporarily for verification
            # Generate unique keys/filenames for face crops
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            user_id = (
                selfie_path.split("/")[-1].split("_")[0]
                if "/" in selfie_path
                else selfie_path.split("_")[0]
            )

            selfie_face_filename = f"{user_id}_selfie_face_{timestamp}.jpg"
            id_face_filename = f"{user_id}_id_face_{timestamp}.jpg"

            # Encode face crops to bytes
            _, selfie_face_encoded = cv2.imencode(
                ".jpg", cv2.cvtColor(best_selfie_face, cv2.COLOR_RGB2BGR)
            )
            _, id_face_encoded = cv2.imencode(
                ".jpg", cv2.cvtColor(best_id_face, cv2.COLOR_RGB2BGR)
            )

            # Save face crops using S3 storage adapter
            selfie_face_path = await s3_storage.save_file(
                file_data=selfie_face_encoded.tobytes(),
                user_id=user_id,
                filename=selfie_face_filename,
                content_type="image/jpeg",
            )
            id_face_path = await s3_storage.save_file(
                file_data=id_face_encoded.tobytes(),
                user_id=user_id,
                filename=id_face_filename,
                content_type="image/jpeg",
            )

            logger.info(
                f"Face crops saved temporarily: {selfie_face_path}, {id_face_path}"
            )

            # Step 5: Perform face verification using AWS Rekognition or DeepFace
            verification_results = []
            use_rekognition = USE_REKOGNITION  # Local copy to avoid scope issues

            # Use AWS Rekognition if available
            if use_rekognition:
                try:
                    result = rekognition.verify_faces(
                        best_selfie_face,
                        best_id_face,
                        similarity_threshold=self.REKOGNITION_THRESHOLD,
                    )

                    verification_results.append(
                        {
                            "model": "AWS-Rekognition",
                            "verified": result["verified"],
                            "distance": 100
                            - result["similarity"],  # Convert similarity to distance
                            "similarity": result["similarity"],
                            "confidence": result["confidence"],
                            "threshold": self.REKOGNITION_THRESHOLD,
                        }
                    )

                    logger.info(
                        f"AWS Rekognition verification: {result['verified']} "
                        f"(similarity: {result['similarity']:.2f}%)"
                    )
                except Exception as e:
                    logger.warning(f"AWS Rekognition verification failed: {str(e)}")
                    # Fall back to DeepFace if Rekognition fails
                    use_rekognition = False

            # Fallback to DeepFace if Rekognition not available or failed
            if not use_rekognition:
                models = ["VGG-Face", "Facenet", "ArcFace"]

                # DeepFace requires local file paths, so if using S3, download temporarily
                local_selfie_face_path = selfie_face_path
                local_id_face_path = id_face_path

                # If files are in S3 (not absolute local paths), download them
                if settings.USE_S3_STORAGE and not os.path.isabs(selfie_face_path):
                    import tempfile

                    # Download face crops from S3 to temp files for DeepFace
                    selfie_face_bytes = await s3_storage.get_file(selfie_face_path)
                    id_face_bytes = await s3_storage.get_file(id_face_path)

                    # Create temp files
                    temp_selfie = tempfile.NamedTemporaryFile(
                        delete=False, suffix=".jpg"
                    )
                    temp_id = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")

                    temp_selfie.write(selfie_face_bytes)
                    temp_id.write(id_face_bytes)
                    temp_selfie.close()
                    temp_id.close()

                    local_selfie_face_path = temp_selfie.name
                    local_id_face_path = temp_id.name

                    logger.info(
                        "Downloaded face crops from S3 for DeepFace verification"
                    )

                for model in models:
                    try:
                        result = DeepFace.verify(
                            img1_path=local_selfie_face_path,
                            img2_path=local_id_face_path,
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
        finally:
            # Always cleanup face crop files, even if verification fails
            if selfie_face_path or id_face_path:
                files_to_delete = [f for f in [selfie_face_path, id_face_path] if f]
                deleted_count = await s3_storage.delete_files(files_to_delete)
                logger.info(f"Cleaned up {deleted_count} temporary face crop files")

                # Clean up temp files if DeepFace was used with S3
                if not use_rekognition and settings.USE_S3_STORAGE:
                    try:
                        if "local_selfie_face_path" in locals() and os.path.exists(
                            local_selfie_face_path
                        ):
                            os.remove(local_selfie_face_path)
                        if "local_id_face_path" in locals() and os.path.exists(
                            local_id_face_path
                        ):
                            os.remove(local_id_face_path)
                        logger.info("Cleaned up temporary DeepFace files")
                    except Exception as cleanup_error:
                        logger.warning(
                            f"Failed to cleanup temp DeepFace files: {str(cleanup_error)}"
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
        """Safely delete files without raising exceptions (deprecated - use cleanup_images)"""
        import asyncio

        asyncio.create_task(s3_storage.delete_files(file_paths))

    def cleanup_images(self, file_paths: List[str]):
        """
        Clean up temporary image files from S3 or local storage
        This method is synchronous wrapper for async S3 cleanup
        """
        import asyncio

        try:
            # Run async deletion in sync context
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is already running, schedule task
                asyncio.create_task(s3_storage.delete_files(file_paths))
                logger.info(f"Scheduled cleanup of {len(file_paths)} files")
            else:
                # Run in new event loop
                deleted_count = loop.run_until_complete(
                    s3_storage.delete_files(file_paths)
                )
                logger.info(f"Cleaned up {deleted_count}/{len(file_paths)} files")
        except Exception as e:
            logger.error(f"Failed to cleanup files: {str(e)}")


# Create service instance
kyc_service = KYCService()
