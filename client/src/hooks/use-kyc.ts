import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
    kycService,
    type KYCVerificationResult,
    type KYCStatusInfo,
    type LivenessVerificationResult,
} from '@/actions/kyc.actions';

export interface UseKYCReturn {
    // State
    isLoading: boolean;
    verificationResult: KYCVerificationResult | null;
    kycStatus: KYCStatusInfo | null;
    livenessResult: LivenessVerificationResult | null;

    // Actions
    uploadImages: (selfie: File, idCard: File) => Promise<boolean>;
    uploadLivenessVideo: (video: File) => Promise<boolean>;
    getKYCStatus: () => Promise<void>;
    clearKYCData: () => Promise<void>;
    checkServiceHealth: () => Promise<boolean>;
    reset: () => void;
}

export function useKYC(): UseKYCReturn {
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [verificationResult, setVerificationResult] = useState<KYCVerificationResult | null>(null);
    const [kycStatus, setKycStatus] = useState<KYCStatusInfo | null>(null);
    const [livenessResult, setLivenessResult] = useState<LivenessVerificationResult | null>(null);

    const uploadImages = useCallback(async (selfie: File, idCard: File): Promise<boolean> => {
        if (!session?.user?.id) {
            toast.error('Please log in to continue');
            return false;
        }

        setIsLoading(true);

        try {
            // Validate files
            const selfieValidation = kycService.validateImageFile(selfie);
            if (!selfieValidation.valid) {
                toast.error(`Selfie: ${selfieValidation.error}`);
                return false;
            }

            const idCardValidation = kycService.validateImageFile(idCard);
            if (!idCardValidation.valid) {
                toast.error(`ID Card: ${idCardValidation.error}`);
                return false;
            }

            // Upload and verify
            const response = await kycService.uploadImages(selfie, idCard, session.user.id);

            if (response.status === 'success') {
                setVerificationResult(response.verification_result);
                toast.success('Verification completed');
                return true;
            } else {
                toast.error('Verification failed');
                return false;
            }
        } catch (error) {
            console.error('KYC upload error:', error);
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error('Verification failed. Please try again.');
            }
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [session?.user?.id]);

    const uploadLivenessVideo = useCallback(async (video: File): Promise<boolean> => {
        if (!session?.user?.id) {
            toast.error('Please log in to continue');
            return false;
        }

        setIsLoading(true);

        try {
            // Validate video file
            const videoValidation = kycService.validateVideoFile(video);
            if (!videoValidation.valid) {
                toast.error(`Video: ${videoValidation.error}`);
                return false;
            }

            // Upload liveness video
            const response = await kycService.uploadLivenessVideo(video, session.user.id);

            if (response.status === 'success') {
                setLivenessResult(response.liveness_result);
                toast.success('Liveness verification completed');
                return true;
            } else {
                toast.error('Liveness verification failed');
                return false;
            }
        } catch (error) {
            console.error('Liveness verification error:', error);
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error('Liveness verification failed. Please try again.');
            }
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [session?.user?.id]);

    const getKYCStatus = useCallback(async (): Promise<void> => {
        if (!session?.user?.id) {
            toast.error('Please log in to continue');
            return;
        }

        setIsLoading(true);

        try {
            const response = await kycService.getKYCStatus(session.user.id);

            if (response.status === 'success') {
                setKycStatus(response.kyc_status);
            } else {
                toast.error('Failed to fetch KYC status');
            }
        } catch (error) {
            console.error('Get KYC status error:', error);
            toast.error('Failed to fetch KYC status');
        } finally {
            setIsLoading(false);
        }
    }, [session?.user?.id]);

    const clearKYCData = useCallback(async (): Promise<void> => {
        if (!session?.user?.id) {
            toast.error('Please log in to continue');
            return;
        }

        setIsLoading(true);

        try {
            const response = await kycService.clearKYCData(session.user.id);

            if (response.status === 'success') {
                setVerificationResult(null);
                setKycStatus(null);
                setLivenessResult(null);
                toast.success('KYC data cleared successfully');
            } else {
                toast.error('Failed to clear KYC data');
            }
        } catch (error) {
            console.error('Clear KYC data error:', error);
            toast.error('Failed to clear KYC data');
        } finally {
            setIsLoading(false);
        }
    }, [session?.user?.id]);

    const checkServiceHealth = useCallback(async (): Promise<boolean> => {
        try {
            const response = await kycService.checkHealth();

            if (response.status === 'healthy') {
                return true;
            } else {
                toast.error('KYC service is not available');
                return false;
            }
        } catch (error) {
            console.error('KYC health check error:', error);
            toast.error('KYC service is not available');
            return false;
        }
    }, []);

    const reset = useCallback(() => {
        setVerificationResult(null);
        setKycStatus(null);
        setLivenessResult(null);
        setIsLoading(false);
    }, []);

    return {
        // State
        isLoading,
        verificationResult,
        kycStatus,
        livenessResult,

        // Actions
        uploadImages,
        uploadLivenessVideo,
        getKYCStatus,
        clearKYCData,
        checkServiceHealth,
        reset,
    };
}
