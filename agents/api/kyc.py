from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from typing import Dict, Any
import logging
from services.kyc import kyc_service
from middleware.auth import get_current_user

# Initialize router and logger
router = APIRouter(prefix="/kyc", tags=["KYC"])
logger = logging.getLogger(__name__)


@router.post(
    "/upload-images",
    response_model=Dict[str, Any],
    dependencies=[Depends(get_current_user)],
)
async def upload_images(
    selfie: UploadFile = File(
        ..., description="Selfie image for identity verification"
    ),
    id_card: UploadFile = File(..., description="Government-issued ID card image"),
    user_id: str = Form(..., description="Unique user identifier"),
):
    """
    Upload selfie and ID card images for identity verification

    Args:
        selfie: User's selfie image (JPG, PNG, WebP)
        id_card: Government-issued ID card image (JPG, PNG, WebP)
        user_id: Unique identifier for the user

    Returns:
        Dictionary containing verification result and confidence score
    """
    try:
        logger.info(f"Starting KYC upload for user: {user_id}")

        # Validate file types
        allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/webp"}

        if selfie.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid selfie file type. Allowed types: {', '.join(allowed_types)}",
            )

        if id_card.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid ID card file type. Allowed types: {', '.join(allowed_types)}",
            )

        # Validate file sizes (max 10MB each)
        max_size = 10 * 1024 * 1024  # 10MB

        selfie_content = await selfie.read()
        if len(selfie_content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selfie file too large. Maximum size: 10MB",
            )

        id_card_content = await id_card.read()
        if len(id_card_content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID card file too large. Maximum size: 10MB",
            )

        logger.info(
            f"Files validated - Selfie: {len(selfie_content)} bytes, ID: {len(id_card_content)} bytes"
        )

        # Save images using the KYC service
        selfie_path = await kyc_service.save_image(selfie_content, user_id, "selfie")
        id_card_path = await kyc_service.save_image(id_card_content, user_id, "id_card")

        logger.info(f"Images saved - Selfie: {selfie_path}, ID: {id_card_path}")

        # List to track all files that need cleanup
        files_to_cleanup = [selfie_path, id_card_path]

        try:
            # Perform identity verification
            verification_result = await kyc_service.verify_identity(
                selfie_path, id_card_path
            )

            logger.info(
                f"KYC verification completed for user {user_id}: {verification_result['verified']}"
            )

            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "status": "success",
                    "user_id": user_id,
                    "verification_result": verification_result,
                    "message": "Identity verification completed successfully",
                },
            )
        finally:
            # Always clean up uploaded files, even if verification fails
            kyc_service.cleanup_images(files_to_cleanup)
            logger.info(f"Cleanup completed for user {user_id}")

    except Exception as e:
        logger.error(f"KYC verification failed for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Identity verification failed: {str(e)}",
        )


@router.post(
    "/verify-liveness",
    response_model=Dict[str, Any],
    dependencies=[Depends(get_current_user)],
)
async def verify_liveness(
    video: UploadFile = File(..., description="Short video for liveness detection"),
    user_id: str = Form(..., description="Unique user identifier"),
):
    """
    Verify user liveness using a short video

    Args:
        video: Short video file (MP4, WebM, AVI) showing user movements
        user_id: Unique identifier for the user

    Returns:
        Dictionary containing liveness verification result
    """
    try:
        logger.info(f"Starting liveness verification for user: {user_id}")

        # Validate file type
        allowed_types = {"video/mp4", "video/webm", "video/avi"}

        if video.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid video file type. Allowed types: {', '.join(allowed_types)}",
            )

        # Validate file size (max 50MB)
        max_size = 50 * 1024 * 1024  # 50MB
        video_content = await video.read()

        if len(video_content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Video file too large. Maximum size: 50MB",
            )

        # TODO: Implement liveness detection
        # For now, return a placeholder response
        result = {
            "liveness_verified": True,
            "confidence_score": 85.0,
            "message": "Liveness verification successful (placeholder implementation)",
            "timestamp": "2024-01-01T00:00:00Z",
        }

        logger.info(f"Liveness verification completed for user {user_id}")

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "success",
                "user_id": user_id,
                "liveness_result": result,
                "message": "Liveness verification completed",
            },
        )

    except Exception as e:
        logger.error(f"Liveness verification failed for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Liveness verification failed: {str(e)}",
        )


@router.get(
    "/status/{user_id}",
    response_model=Dict[str, Any],
    dependencies=[Depends(get_current_user)],
)
async def get_kyc_status(user_id: str):
    """
    Get KYC verification status for a user

    Args:
        user_id: Unique identifier for the user

    Returns:
        Dictionary containing KYC status information
    """
    try:
        logger.info(f"Fetching KYC status for user: {user_id}")

        # TODO: Implement database lookup for KYC status
        # For now, return a placeholder response
        status_info = {
            "user_id": user_id,
            "kyc_status": "pending",  # pending, verified, rejected
            "identity_verified": False,
            "liveness_verified": False,
            "last_verification_date": None,
            "verification_attempts": 0,
            "next_allowed_attempt": None,
        }

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "success",
                "kyc_status": status_info,
                "message": "KYC status retrieved successfully",
            },
        )

    except Exception as e:
        logger.error(f"Failed to fetch KYC status for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve KYC status: {str(e)}",
        )


@router.delete("/clear-data/{user_id}", response_model=Dict[str, str])
async def clear_kyc_data(user_id: str):
    """
    Clear all KYC data for a user (for testing/development)

    Args:
        user_id: Unique identifier for the user

    Returns:
        Confirmation message
    """
    try:
        logger.info(f"Clearing KYC data for user: {user_id}")

        # TODO: Implement data cleanup from database and file system
        # For now, return a placeholder response

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "success",
                "message": f"KYC data cleared for user {user_id}",
                "user_id": user_id,
            },
        )

    except Exception as e:
        logger.error(f"Failed to clear KYC data for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear KYC data: {str(e)}",
        )


# Health check endpoint for KYC service
@router.get("/health", response_model=Dict[str, str])
async def health_check():
    """
    Health check endpoint for KYC service

    Returns:
        Service health status
    """
    try:
        # Check if KYC service is properly initialized
        if kyc_service.upload_dir and kyc_service.face_cascade is not None:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "status": "healthy",
                    "service": "KYC Identity Verification",
                    "upload_directory": kyc_service.upload_dir,
                    "face_detection": "initialized",
                    "message": "KYC service is operational",
                },
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="KYC service not properly initialized",
            )

    except Exception as e:
        logger.error(f"KYC health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"KYC service unhealthy: {str(e)}",
        )
