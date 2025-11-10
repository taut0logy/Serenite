"""
AWS Voice Sentiment Adapter using Amazon Transcribe + Amazon Comprehend

This adapter provides voice emotion/sentiment detection by:
1. Transcribing audio to text using Amazon Transcribe
2. Analyzing sentiment using Amazon Comprehend

Supports Bangla/Bengali language.
"""

import boto3
from botocore.exceptions import ClientError, BotoCoreError
import time
import uuid
import logging
from typing import Optional, Tuple, Dict
from config.settings import settings

logger = logging.getLogger(__name__)


class AWSVoiceSentimentAdapter:
    """Adapter for AWS voice sentiment analysis"""

    # Sentiment to emotion mapping
    SENTIMENT_TO_EMOTION = {
        "POSITIVE": "happy",
        "NEGATIVE": "sad",
        "NEUTRAL": "neutral",
        "MIXED": "mixed",
    }

    # More detailed mapping based on confidence scores
    DETAILED_EMOTION_MAPPING = {
        "POSITIVE": {
            "high": "happy",  # High positive confidence
            "medium": "calm",  # Medium positive confidence
            "low": "neutral",  # Low positive confidence
        },
        "NEGATIVE": {
            "angry": "angry",  # High negative with low neutral
            "sad": "sad",  # High negative with medium neutral
            "fearful": "fearful",  # Negative with mixed signals
        },
    }

    def __init__(self):
        self.enabled = False
        self.transcribe_client = None
        self.comprehend_client = None
        self.s3_client = None
        self.temp_bucket = settings.S3_TEMP_BUCKET

        if settings.USE_API_MODELS:
            self._initialize_clients()

    def _initialize_clients(self):
        """Initialize AWS clients"""
        try:
            if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
                logger.warning(
                    "USE_API_MODELS is True but AWS credentials not found. "
                    "Voice sentiment detection will be disabled."
                )
                return

            # Initialize Transcribe client
            self.transcribe_client = boto3.client(
                "transcribe",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )

            # Initialize Comprehend client
            self.comprehend_client = boto3.client(
                "comprehend",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )

            # Initialize S3 client (for temporary audio storage)
            self.s3_client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )

            self.enabled = True
            logger.info(
                f"AWS Voice Sentiment adapter initialized successfully "
                f"(region: {settings.AWS_REGION})"
            )

        except Exception as e:
            logger.error(f"Failed to initialize AWS Voice Sentiment clients: {str(e)}")
            self.enabled = False

    def _upload_audio_to_s3(self, audio_bytes: bytes, user_id: str) -> Optional[str]:
        """
        Upload audio file to S3 temporarily for Transcribe processing

        Args:
            audio_bytes: Audio file content
            user_id: User identifier

        Returns:
            S3 URI or None if upload fails
        """
        try:
            # Generate unique key for audio file
            timestamp = int(time.time())
            s3_key = (
                f"temp/audio/{user_id}/voice_{timestamp}_{uuid.uuid4().hex[:8]}.wav"
            )

            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.temp_bucket,
                Key=s3_key,
                Body=audio_bytes,
                ContentType="audio/wav",
            )

            s3_uri = f"s3://{self.temp_bucket}/{s3_key}"
            logger.info(f"Uploaded audio to S3: {s3_uri}")
            return s3_uri

        except (ClientError, BotoCoreError) as e:
            logger.error(f"Failed to upload audio to S3: {str(e)}")
            return None

    def _delete_s3_file(self, s3_uri: str):
        """Delete temporary audio file from S3"""
        try:
            # Extract bucket and key from S3 URI
            s3_uri = s3_uri.replace("s3://", "")
            parts = s3_uri.split("/", 1)
            if len(parts) == 2:
                bucket, key = parts
                self.s3_client.delete_object(Bucket=bucket, Key=key)
                logger.info(f"Deleted temporary audio from S3: {s3_uri}")
        except Exception as e:
            logger.warning(f"Failed to delete S3 file {s3_uri}: {str(e)}")

    def _start_transcription_job(
        self, s3_uri: str, language_code: str = "bn-IN"
    ) -> Optional[str]:
        """
        Start Amazon Transcribe job

        Args:
            s3_uri: S3 URI of the audio file
            language_code: Language code (bn-IN for Bangla/Bengali, en-US for English)

        Returns:
            Job name or None if failed
        """
        try:
            job_name = f"voice_sentiment_{uuid.uuid4().hex[:12]}"

            self.transcribe_client.start_transcription_job(
                TranscriptionJobName=job_name,
                Media={"MediaFileUri": s3_uri},
                MediaFormat="wav",
                LanguageCode=language_code,
                Settings={"ShowSpeakerLabels": False, "MaxSpeakerLabels": 1},
            )

            logger.info(f"Started transcription job: {job_name}")
            return job_name

        except (ClientError, BotoCoreError) as e:
            logger.error(f"Failed to start transcription job: {str(e)}")
            return None

    def _wait_for_transcription(
        self, job_name: str, max_wait_time: int = 60
    ) -> Optional[str]:
        """
        Wait for transcription job to complete and get transcript

        Args:
            job_name: Transcription job name
            max_wait_time: Maximum wait time in seconds

        Returns:
            Transcript text or None if failed/timeout
        """
        try:
            start_time = time.time()

            while time.time() - start_time < max_wait_time:
                response = self.transcribe_client.get_transcription_job(
                    TranscriptionJobName=job_name
                )

                status = response["TranscriptionJob"]["TranscriptionJobStatus"]

                if status == "COMPLETED":
                    # Get transcript
                    transcript_uri = response["TranscriptionJob"]["Transcript"][
                        "TranscriptFileUri"
                    ]

                    # Download transcript (it's a JSON file)
                    import requests

                    transcript_response = requests.get(transcript_uri)
                    transcript_data = transcript_response.json()

                    transcript_text = transcript_data["results"]["transcripts"][0][
                        "transcript"
                    ]
                    logger.info(f"Transcription completed: {transcript_text[:100]}...")

                    # Clean up job
                    try:
                        self.transcribe_client.delete_transcription_job(
                            TranscriptionJobName=job_name
                        )
                    except:
                        pass

                    return transcript_text

                elif status == "FAILED":
                    logger.error(f"Transcription job failed: {job_name}")
                    return None

                # Wait before checking again
                time.sleep(2)

            logger.warning(f"Transcription job timed out: {job_name}")
            return None

        except Exception as e:
            logger.error(f"Error waiting for transcription: {str(e)}")
            return None

    def _analyze_sentiment(
        self, text: str, language_code: str = "en"
    ) -> Optional[Dict]:
        """
        Analyze sentiment using Amazon Comprehend

        Args:
            text: Text to analyze
            language_code: Language code (en, bn, etc.)

        Returns:
            Sentiment analysis result or None if failed
        """
        try:
            # Amazon Comprehend language codes: en, bn (Bangla), etc.
            response = self.comprehend_client.detect_sentiment(
                Text=text, LanguageCode=language_code
            )

            sentiment = response["Sentiment"]
            scores = response["SentimentScore"]

            logger.info(
                f"Sentiment detected: {sentiment} "
                f"(Positive: {scores['Positive']:.2f}, "
                f"Negative: {scores['Negative']:.2f}, "
                f"Neutral: {scores['Neutral']:.2f}, "
                f"Mixed: {scores['Mixed']:.2f})"
            )

            return {
                "sentiment": sentiment,
                "scores": scores,
                "positive": scores["Positive"],
                "negative": scores["Negative"],
                "neutral": scores["Neutral"],
                "mixed": scores["Mixed"],
            }

        except (ClientError, BotoCoreError) as e:
            logger.error(f"Failed to analyze sentiment: {str(e)}")
            return None

    def _map_sentiment_to_emotion(self, sentiment_result: Dict) -> Tuple[str, float]:
        """
        Map AWS Comprehend sentiment to emotion categories

        Args:
            sentiment_result: Result from _analyze_sentiment

        Returns:
            Tuple of (emotion, confidence_score)
        """
        sentiment = sentiment_result["sentiment"]
        scores = sentiment_result["scores"]

        # Get the dominant sentiment score
        dominant_score = (
            max(
                scores["Positive"],
                scores["Negative"],
                scores["Neutral"],
                scores["Mixed"],
            )
            * 100
        )  # Convert to percentage

        # Advanced mapping based on score combinations
        if sentiment == "POSITIVE":
            if scores["Positive"] > 0.7:
                emotion = "happy"
            elif scores["Positive"] > 0.4:
                emotion = "calm"
            else:
                emotion = "neutral"

        elif sentiment == "NEGATIVE":
            # Determine specific negative emotion based on neutral score
            if scores["Neutral"] < 0.2:
                # Low neutral suggests stronger negative emotion
                emotion = "angry" if scores["Negative"] > 0.6 else "sad"
            elif scores["Mixed"] > 0.3:
                emotion = "fearful"
            else:
                emotion = "sad"

        elif sentiment == "MIXED":
            # Mixed emotions could indicate anxiety/fear
            if scores["Negative"] > scores["Positive"]:
                emotion = "fearful"
            else:
                emotion = "neutral"

        else:  # NEUTRAL
            emotion = "neutral"

        return emotion, dominant_score

    async def detect_emotion_from_audio(
        self, audio_bytes: bytes, user_id: str, language: str = "bangla"
    ) -> Tuple[Optional[str], Optional[float], Optional[str]]:
        """
        Detect emotion from audio file using AWS Transcribe + Comprehend

        Args:
            audio_bytes: Audio file content
            user_id: User identifier
            language: Language of the audio ("bangla" or "english")

        Returns:
            Tuple of (emotion, confidence_score, transcript_text)
        """
        if not self.enabled:
            logger.warning("AWS Voice Sentiment adapter not enabled")
            return None, None, None

        s3_uri = None

        try:
            # Step 1: Upload audio to S3
            s3_uri = self._upload_audio_to_s3(audio_bytes, user_id)
            if not s3_uri:
                return None, None, None

            # Step 2: Start transcription job
            # Language codes: bn-IN for Bangla, en-US for English
            language_code = "bn-IN" if language.lower() == "bangla" else "en-US"

            job_name = self._start_transcription_job(s3_uri, language_code)
            if not job_name:
                return None, None, None

            # Step 3: Wait for transcription to complete
            transcript = self._wait_for_transcription(job_name, max_wait_time=60)
            if not transcript or len(transcript.strip()) == 0:
                logger.warning("Transcription returned empty text")
                return None, None, None

            # Step 4: Analyze sentiment of transcript
            # Comprehend language codes: bn for Bangla, en for English
            comprehend_lang = "bn" if language.lower() == "bangla" else "en"

            sentiment_result = self._analyze_sentiment(transcript, comprehend_lang)
            if not sentiment_result:
                return None, None, transcript

            # Step 5: Map sentiment to emotion
            emotion, confidence = self._map_sentiment_to_emotion(sentiment_result)

            logger.info(
                f"Voice emotion detection completed: {emotion} "
                f"({confidence:.2f}%) from transcript: '{transcript[:50]}...'"
            )

            return emotion, confidence, transcript

        except Exception as e:
            logger.error(f"Error in voice emotion detection: {str(e)}")
            return None, None, None

        finally:
            # Clean up: Delete temporary S3 file
            if s3_uri:
                self._delete_s3_file(s3_uri)


# Create singleton instance
try:
    voice_sentiment = AWSVoiceSentimentAdapter()
    if voice_sentiment.enabled:
        logger.info("AWS Voice Sentiment detection enabled (Transcribe + Comprehend)")
    else:
        logger.info("AWS Voice Sentiment detection disabled (fallback to local)")
except Exception as e:
    logger.error(f"Failed to initialize AWS Voice Sentiment adapter: {str(e)}")
    voice_sentiment = None
