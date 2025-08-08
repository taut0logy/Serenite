from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class KYCStatus(str, Enum):
    """KYC verification status enumeration"""

    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    EXPIRED = "expired"


class VerificationModel(str, Enum):
    """Face verification model types"""

    VGG_FACE = "VGG-Face"
    FACENET = "Facenet"
    ARCFACE = "ArcFace"


class FaceMetadata(BaseModel):
    """Face detection metadata"""

    face_index: int = Field(..., description="Index of the detected face")
    bounding_box: tuple = Field(
        ..., description="Face bounding box coordinates (x, y, w, h)"
    )
    face_area: int = Field(..., description="Area of the detected face in pixels")
    aspect_ratio: float = Field(..., description="Width to height ratio of the face")
    blur_score: float = Field(
        ..., description="Blur detection score (higher = less blur)"
    )
    brightness: float = Field(..., description="Average brightness of the face region")
    quality_score: float = Field(..., description="Overall face quality score (0-100)")
    is_id_card: bool = Field(
        ..., description="Whether this face was detected in an ID card"
    )


class VerificationResult(BaseModel):
    """Individual model verification result"""

    model: VerificationModel = Field(..., description="Verification model used")
    verified: bool = Field(
        ..., description="Whether faces match according to this model"
    )
    distance: float = Field(..., description="Face distance/similarity score")
    threshold: float = Field(..., description="Threshold used for verification")


class IdentityVerificationResponse(BaseModel):
    """Identity verification response model"""

    verified: bool = Field(..., description="Overall verification result")
    confidence_score: float = Field(
        ..., description="Confidence score percentage (0-100)"
    )
    verification_threshold: float = Field(
        ..., description="Threshold used for final decision"
    )
    selfie_quality: float = Field(..., description="Quality score of the selfie image")
    id_photo_quality: float = Field(..., description="Quality score of the ID photo")
    models_agreed: int = Field(
        ..., description="Number of models that agreed on verification"
    )
    total_models: int = Field(..., description="Total number of models used")
    individual_results: List[VerificationResult] = Field(
        ..., description="Individual model results"
    )
    timestamp: str = Field(..., description="Verification timestamp (ISO format)")
    message: str = Field(..., description="Human-readable verification message")


class LivenessVerificationResponse(BaseModel):
    """Liveness verification response model"""

    liveness_verified: bool = Field(..., description="Whether liveness was verified")
    confidence_score: float = Field(
        ..., description="Liveness confidence score (0-100)"
    )
    message: str = Field(..., description="Human-readable liveness message")
    timestamp: str = Field(..., description="Verification timestamp (ISO format)")


class KYCStatusInfo(BaseModel):
    """KYC status information model"""

    user_id: str = Field(..., description="Unique user identifier")
    kyc_status: KYCStatus = Field(..., description="Current KYC status")
    identity_verified: bool = Field(
        ..., description="Whether identity verification passed"
    )
    liveness_verified: bool = Field(
        ..., description="Whether liveness verification passed"
    )
    last_verification_date: Optional[datetime] = Field(
        None, description="Last verification attempt date"
    )
    verification_attempts: int = Field(0, description="Number of verification attempts")
    next_allowed_attempt: Optional[datetime] = Field(
        None, description="Next allowed verification attempt"
    )


class KYCUploadResponse(BaseModel):
    """KYC upload response model"""

    status: str = Field(..., description="Response status")
    user_id: str = Field(..., description="User identifier")
    verification_result: IdentityVerificationResponse = Field(
        ..., description="Verification results"
    )
    message: str = Field(..., description="Response message")


class LivenessUploadResponse(BaseModel):
    """Liveness upload response model"""

    status: str = Field(..., description="Response status")
    user_id: str = Field(..., description="User identifier")
    liveness_result: LivenessVerificationResponse = Field(
        ..., description="Liveness verification results"
    )
    message: str = Field(..., description="Response message")


class KYCStatusResponse(BaseModel):
    """KYC status response model"""

    status: str = Field(..., description="Response status")
    kyc_status: KYCStatusInfo = Field(..., description="KYC status information")
    message: str = Field(..., description="Response message")


class KYCHealthResponse(BaseModel):
    """KYC health check response model"""

    status: str = Field(..., description="Service health status")
    service: str = Field(..., description="Service name")
    upload_directory: str = Field(..., description="Upload directory path")
    face_detection: str = Field(..., description="Face detection status")
    message: str = Field(..., description="Health check message")


class KYCErrorResponse(BaseModel):
    """KYC error response model"""

    status: str = Field(default="error", description="Response status")
    error_code: str = Field(..., description="Error code")
    error_message: str = Field(..., description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(
        None, description="Additional error details"
    )
    timestamp: str = Field(..., description="Error timestamp (ISO format)")


class KYCUploadRequest(BaseModel):
    """KYC upload request validation model"""

    user_id: str = Field(
        ..., min_length=1, max_length=100, description="Unique user identifier"
    )

    class Config:
        schema_extra = {
            "example": {
                "user_id": "user123456",
                "selfie": "multipart/form-data file",
                "id_card": "multipart/form-data file",
            }
        }


class LivenessUploadRequest(BaseModel):
    """Liveness upload request validation model"""

    user_id: str = Field(
        ..., min_length=1, max_length=100, description="Unique user identifier"
    )

    class Config:
        schema_extra = {
            "example": {"user_id": "user123456", "video": "multipart/form-data file"}
        }


# Additional validation models
class ImageValidation(BaseModel):
    """Image validation parameters"""

    max_file_size: int = Field(
        default=10 * 1024 * 1024, description="Maximum file size in bytes"
    )
    allowed_formats: List[str] = Field(
        default=["image/jpeg", "image/jpg", "image/png", "image/webp"],
        description="Allowed image formats",
    )
    min_resolution: tuple = Field(
        default=(100, 100), description="Minimum image resolution (width, height)"
    )
    max_resolution: tuple = Field(
        default=(4000, 4000), description="Maximum image resolution (width, height)"
    )


class VideoValidation(BaseModel):
    """Video validation parameters"""

    max_file_size: int = Field(
        default=50 * 1024 * 1024, description="Maximum file size in bytes"
    )
    allowed_formats: List[str] = Field(
        default=["video/mp4", "video/webm", "video/avi"],
        description="Allowed video formats",
    )
    max_duration: int = Field(
        default=30, description="Maximum video duration in seconds"
    )
    min_duration: int = Field(
        default=2, description="Minimum video duration in seconds"
    )


class KYCConfiguration(BaseModel):
    """KYC service configuration model"""

    verification_threshold: float = Field(
        default=0.65, description="Minimum confidence for verification"
    )
    min_face_quality: float = Field(
        default=30.0, description="Minimum face quality score"
    )
    max_verification_attempts: int = Field(
        default=3, description="Maximum verification attempts per user"
    )
    attempt_cooldown_hours: int = Field(
        default=24, description="Hours to wait between failed attempts"
    )
    data_retention_days: int = Field(
        default=90, description="Days to retain verification data"
    )

    image_validation: ImageValidation = Field(default_factory=ImageValidation)
    video_validation: VideoValidation = Field(default_factory=VideoValidation)


# Database models (for future implementation)
class KYCRecord(BaseModel):
    """KYC record for database storage"""

    id: Optional[int] = Field(None, description="Database record ID")
    user_id: str = Field(..., description="User identifier")
    verification_id: str = Field(..., description="Unique verification ID")
    status: KYCStatus = Field(..., description="Verification status")
    identity_verified: bool = Field(
        default=False, description="Identity verification result"
    )
    liveness_verified: bool = Field(
        default=False, description="Liveness verification result"
    )
    confidence_score: Optional[float] = Field(
        None, description="Verification confidence score"
    )
    verification_data: Optional[Dict[str, Any]] = Field(
        None, description="Detailed verification results"
    )
    created_at: datetime = Field(
        default_factory=datetime.now, description="Record creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=datetime.now, description="Last update timestamp"
    )
    expires_at: Optional[datetime] = Field(None, description="Verification expiry date")

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}
