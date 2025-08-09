import axios from '@/lib/axios';
import { AxiosResponse } from 'axios';

export interface KYCVerificationResult {
    verified: boolean;
    confidence_score: number;
    verification_threshold: number;
    selfie_quality: number;
    id_photo_quality: number;
    models_agreed: number;
    total_models: number;
    individual_results: Array<{
        model: string;
        verified: boolean;
        distance: number;
        threshold: number;
    }>;
    timestamp: string;
    message: string;
}

export interface KYCUploadResponse {
    status: string;
    user_id: string;
    verification_result: KYCVerificationResult;
    message: string;
}

export interface LivenessVerificationResult {
    liveness_verified: boolean;
    confidence_score: number;
    message: string;
    timestamp: string;
}

export interface LivenessUploadResponse {
    status: string;
    user_id: string;
    liveness_result: LivenessVerificationResult;
    message: string;
}

export interface KYCStatusInfo {
    user_id: string;
    kyc_status: 'pending' | 'verified' | 'rejected' | 'in_progress' | 'expired';
    identity_verified: boolean;
    liveness_verified: boolean;
    last_verification_date: string | null;
    verification_attempts: number;
    next_allowed_attempt: string | null;
}

export interface KYCStatusResponse {
    status: string;
    kyc_status: KYCStatusInfo;
    message: string;
}

export interface KYCHealthResponse {
    status: string;
    service: string;
    upload_directory: string;
    face_detection: string;
    message: string;
}

export class KYCService {
    private baseURL = '/kyc';

    /**
     * Upload selfie and ID card images for identity verification
     */
    async uploadImages(
        selfie: File,
        idCard: File,
        userId: string
    ): Promise<KYCUploadResponse> {
        const formData = new FormData();
        formData.append('selfie', selfie);
        formData.append('id_card', idCard);
        formData.append('user_id', userId);

        const response: AxiosResponse<KYCUploadResponse> = await axios.post(
            `${this.baseURL}/upload-images`,
            formData,
            {
                timeout: 60000, // 60 seconds timeout for image processing
            }
        );

        return response.data;
    }

    /**
     * Upload video for liveness verification
     */
    async uploadLivenessVideo(
        video: File,
        userId: string
    ): Promise<LivenessUploadResponse> {
        const formData = new FormData();
        formData.append('video', video);
        formData.append('user_id', userId);

        const response: AxiosResponse<LivenessUploadResponse> = await axios.post(
            `${this.baseURL}/verify-liveness`,
            formData,
            {
                timeout: 120000, // 2 minutes timeout for video processing
            }
        );

        return response.data;
    }

    /**
     * Get KYC verification status for a user
     */
    async getKYCStatus(userId: string): Promise<KYCStatusResponse> {
        const response: AxiosResponse<KYCStatusResponse> = await axios.get(
            `${this.baseURL}/status/${userId}`
        );

        return response.data;
    }

    /**
     * Clear KYC data for a user (for testing/development)
     */
    async clearKYCData(userId: string): Promise<{ status: string; message: string; user_id: string }> {
        const response: AxiosResponse<{ status: string; message: string; user_id: string }> = await axios.delete(
            `${this.baseURL}/clear-data/${userId}`
        );

        return response.data;
    }

    /**
     * Check KYC service health
     */
    async checkHealth(): Promise<KYCHealthResponse> {
        const response: AxiosResponse<KYCHealthResponse> = await axios.get(
            `${this.baseURL}/health`
        );

        return response.data;
    }

    /**
     * Validate file before upload
     */
    validateImageFile(file: File): { valid: boolean; error?: string } {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(file.type)) {
            return {
                valid: false,
                error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
            };
        }

        if (file.size > maxSize) {
            return {
                valid: false,
                error: 'File too large. Maximum size: 10MB'
            };
        }

        return { valid: true };
    }

    /**
     * Validate video file before upload
     */
    validateVideoFile(file: File): { valid: boolean; error?: string } {
        const allowedTypes = ['video/mp4', 'video/webm', 'video/avi'];
        const maxSize = 50 * 1024 * 1024; // 50MB

        if (!allowedTypes.includes(file.type)) {
            return {
                valid: false,
                error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
            };
        }

        if (file.size > maxSize) {
            return {
                valid: false,
                error: 'File too large. Maximum size: 50MB'
            };
        }

        return { valid: true };
    }

    /**
     * Format confidence score as percentage
     */
    formatConfidenceScore(score: number): string {
        return `${score.toFixed(1)}%`;
    }

    /**
     * Get status color for UI
     */
    getStatusColor(status: string): string {
        switch (status) {
            case 'verified':
                return 'text-green-600';
            case 'rejected':
                return 'text-red-600';
            case 'pending':
            case 'in_progress':
                return 'text-yellow-600';
            case 'expired':
                return 'text-gray-600';
            default:
                return 'text-gray-600';
        }
    }

    /**
     * Get human-readable status text
     */
    getStatusText(status: string): string {
        switch (status) {
            case 'verified':
                return 'Verified';
            case 'rejected':
                return 'Rejected';
            case 'pending':
                return 'Pending';
            case 'in_progress':
                return 'In Progress';
            case 'expired':
                return 'Expired';
            default:
                return 'Unknown';
        }
    }
}

// Export singleton instance
export const kycService = new KYCService();
