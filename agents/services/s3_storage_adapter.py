"""
S3 Storage Adapter for temporary file storage.

This adapter provides a unified interface for storing and retrieving temporary files
using AWS S3. It's designed to work seamlessly with Heroku's ephemeral filesystem.

Usage:
    from services.s3_storage_adapter import s3_storage

    # Save a file
    s3_key = await s3_storage.save_file(file_bytes, "user_123", "selfie.jpg")

    # Retrieve a file
    file_bytes = await s3_storage.get_file(s3_key)

    # Delete files
    await s3_storage.delete_files([s3_key])
"""

import boto3
from botocore.exceptions import ClientError, BotoCoreError
import os
import logging
from typing import Optional, List
from datetime import datetime
from config.settings import settings

logger = logging.getLogger(__name__)


class S3StorageAdapter:
    """Adapter for S3 temporary file storage"""

    def __init__(self):
        self.enabled = settings.USE_S3_STORAGE
        self.bucket_name = settings.S3_TEMP_BUCKET
        self.s3_client = None
        self.local_temp_dir = None

        if self.enabled:
            self._initialize_s3_client()
        else:
            self._initialize_local_storage()

    def _initialize_s3_client(self):
        """Initialize S3 client with AWS credentials"""
        try:
            if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
                logger.warning(
                    "USE_S3_STORAGE is True but AWS credentials not found. "
                    "Falling back to local storage."
                )
                self.enabled = False
                self._initialize_local_storage()
                return

            self.s3_client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )

            # Verify bucket exists or create it
            self._ensure_bucket_exists()

            logger.info(
                f"S3 storage initialized successfully (bucket: {self.bucket_name}, "
                f"region: {settings.AWS_REGION})"
            )
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {str(e)}")
            logger.warning("Falling back to local storage")
            self.enabled = False
            self._initialize_local_storage()

    def _initialize_local_storage(self):
        """Initialize local filesystem storage as fallback"""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.local_temp_dir = os.path.join(current_dir, "temp_storage")

        if not os.path.exists(self.local_temp_dir):
            os.makedirs(self.local_temp_dir, exist_ok=True)
            logger.info(f"Created local temp storage directory: {self.local_temp_dir}")
        else:
            logger.info(f"Using local temp storage: {self.local_temp_dir}")

    def _ensure_bucket_exists(self):
        """Ensure S3 bucket exists, create if it doesn't"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"S3 bucket '{self.bucket_name}' exists")
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "404":
                # Bucket doesn't exist, create it
                try:
                    if settings.AWS_REGION == "us-east-1":
                        # us-east-1 doesn't need LocationConstraint
                        self.s3_client.create_bucket(Bucket=self.bucket_name)
                    else:
                        self.s3_client.create_bucket(
                            Bucket=self.bucket_name,
                            CreateBucketConfiguration={
                                "LocationConstraint": settings.AWS_REGION
                            },
                        )

                    # Add lifecycle policy to auto-delete files after 1 day
                    lifecycle_policy = {
                        "Rules": [
                            {
                                "Id": "DeleteTempFilesAfter1Day",
                                "Status": "Enabled",
                                "Prefix": "",
                                "Expiration": {"Days": 1},
                            }
                        ]
                    }
                    self.s3_client.put_bucket_lifecycle_configuration(
                        Bucket=self.bucket_name, LifecycleConfiguration=lifecycle_policy
                    )

                    logger.info(
                        f"Created S3 bucket '{self.bucket_name}' with 1-day auto-delete policy"
                    )
                except Exception as create_error:
                    logger.error(f"Failed to create S3 bucket: {str(create_error)}")
                    raise
            else:
                logger.error(f"Error checking S3 bucket: {str(e)}")
                raise

    async def save_file(
        self,
        file_data: bytes,
        user_id: str,
        filename: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """
        Save file to S3 or local storage

        Args:
            file_data: File contents as bytes
            user_id: User identifier for organizing files
            filename: Original filename
            content_type: MIME type of the file

        Returns:
            S3 key or local filepath for the saved file
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = os.path.basename(filename)  # Security: prevent path traversal

        if self.enabled:
            # S3 storage
            s3_key = f"temp/{user_id}/{timestamp}_{safe_filename}"

            try:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=file_data,
                    ContentType=content_type,
                    Metadata={
                        "user_id": user_id,
                        "uploaded_at": timestamp,
                        "original_filename": safe_filename,
                    },
                )

                logger.info(f"Saved file to S3: s3://{self.bucket_name}/{s3_key}")
                return s3_key

            except (ClientError, BotoCoreError) as e:
                logger.error(f"Failed to upload to S3: {str(e)}")
                logger.warning("Falling back to local storage for this file")
                # Fallback to local storage
                return await self._save_local(
                    file_data, user_id, safe_filename, timestamp
                )
        else:
            # Local storage
            return await self._save_local(file_data, user_id, safe_filename, timestamp)

    async def _save_local(
        self, file_data: bytes, user_id: str, filename: str, timestamp: str
    ) -> str:
        """Save file to local filesystem"""
        local_path = os.path.join(
            self.local_temp_dir, f"{user_id}_{timestamp}_{filename}"
        )

        try:
            with open(local_path, "wb") as f:
                f.write(file_data)
            logger.info(f"Saved file locally: {local_path}")
            return local_path
        except Exception as e:
            logger.error(f"Failed to save file locally: {str(e)}")
            raise

    async def get_file(self, file_key: str) -> Optional[bytes]:
        """
        Retrieve file from S3 or local storage

        Args:
            file_key: S3 key or local filepath

        Returns:
            File contents as bytes, or None if not found
        """
        if self.enabled and not os.path.isabs(file_key):
            # S3 storage (key doesn't look like local path)
            try:
                response = self.s3_client.get_object(
                    Bucket=self.bucket_name, Key=file_key
                )
                file_data = response["Body"].read()
                logger.info(f"Retrieved file from S3: {file_key}")
                return file_data

            except ClientError as e:
                error_code = e.response["Error"]["Code"]
                if error_code == "NoSuchKey":
                    logger.warning(f"File not found in S3: {file_key}")
                    return None
                else:
                    logger.error(f"Error retrieving file from S3: {str(e)}")
                    return None
        else:
            # Local storage
            try:
                if os.path.exists(file_key):
                    with open(file_key, "rb") as f:
                        file_data = f.read()
                    logger.info(f"Retrieved file locally: {file_key}")
                    return file_data
                else:
                    logger.warning(f"File not found locally: {file_key}")
                    return None
            except Exception as e:
                logger.error(f"Error reading local file: {str(e)}")
                return None

    async def delete_files(self, file_keys: List[str]) -> int:
        """
        Delete multiple files from S3 or local storage

        Args:
            file_keys: List of S3 keys or local filepaths

        Returns:
            Number of files successfully deleted
        """
        if not file_keys:
            return 0

        deleted_count = 0

        for file_key in file_keys:
            try:
                if self.enabled and not os.path.isabs(file_key):
                    # S3 storage
                    self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_key)
                    logger.info(f"Deleted file from S3: {file_key}")
                    deleted_count += 1
                else:
                    # Local storage
                    if os.path.exists(file_key):
                        os.remove(file_key)
                        logger.info(f"Deleted local file: {file_key}")
                        deleted_count += 1
                    else:
                        logger.warning(f"File not found for deletion: {file_key}")

            except Exception as e:
                logger.error(f"Failed to delete file {file_key}: {str(e)}")
                continue

        logger.info(f"Deleted {deleted_count}/{len(file_keys)} files")
        return deleted_count

    async def delete_file(self, file_key: str) -> bool:
        """
        Delete a single file from S3 or local storage

        Args:
            file_key: S3 key or local filepath

        Returns:
            True if deleted successfully, False otherwise
        """
        result = await self.delete_files([file_key])
        return result > 0

    def get_storage_info(self) -> dict:
        """Get information about current storage configuration"""
        return {
            "enabled": self.enabled,
            "storage_type": "s3" if self.enabled else "local",
            "bucket_name": self.bucket_name if self.enabled else None,
            "local_temp_dir": self.local_temp_dir if not self.enabled else None,
            "region": settings.AWS_REGION if self.enabled else None,
        }


# Create singleton instance
s3_storage = S3StorageAdapter()

# Log storage configuration on import
storage_info = s3_storage.get_storage_info()
if storage_info["enabled"]:
    logger.info(
        f"Using S3 temporary storage (bucket: {storage_info['bucket_name']}, "
        f"region: {storage_info['region']})"
    )
else:
    logger.info(f"Using local temporary storage: {storage_info['local_temp_dir']}")
