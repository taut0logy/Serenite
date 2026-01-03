'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
    saveEncryptedResponses, 
    getEncryptedResponses, 
    completeQuestionnaire 
} from '@/actions/questionnaire.actions';
import { verifyPassword } from '@/actions/auth.actions';
import { useQuestionnaireStore } from '@/stores/use-questionnaire-store';
import { QuestionnaireResponses } from '@/types/questionnaire';
import { computeProfile } from '@/lib/profiling';
import { 
    encryptResponses, 
    decryptResponses, 
    arrayBufferToBase64, 
    base64ToArrayBuffer,
    base64ToUint8Array 
} from '@/lib/encryption';

export function useQuestionnaire() {
    const { data: session } = useSession();
    
    // Use stable references to store methods
    const setResponses = useQuestionnaireStore(s => s.setResponses);
    const setIsSubmitting = useQuestionnaireStore(s => s.setIsSubmitting);
    const setState = useQuestionnaireStore(s => s.setState);
    const responses = useQuestionnaireStore(s => s.responses);
    const isLoading = useQuestionnaireStore(s => s.isLoading);
    const isSubmitting = useQuestionnaireStore(s => s.isSubmitting);
    const getFirstUnansweredIndex = useQuestionnaireStore(s => s.getFirstUnansweredIndex);
    
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [hasInitialized, setHasInitialized] = useState(false);
    const [password, setPassword] = useState<string | null>(null);
    const [isPasswordVerified, setIsPasswordVerified] = useState(false);
    
    // Ref to track if save is in progress (prevents double-saves)
    const isSaving = useRef(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Verify and set the user's password for encryption/decryption.
     */
    const verifyAndSetPassword = useCallback(async (pwd: string): Promise<{ success: boolean; error?: string }> => {
        if (!session?.user?.id) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            const result = await verifyPassword(session.user.id, pwd);
            
            if (!result.success) {
                return { success: false, error: result.message || 'Incorrect password' };
            }

            setPassword(pwd);
            setIsPasswordVerified(true);
            return { success: true };
        } catch (error) {
            console.error('Error verifying password:', error);
            return { success: false, error: 'Failed to verify password' };
        }
    }, [session?.user?.id]);

    /**
     * Save encrypted responses to database.
     */
    const saveToDatabase = useCallback(async (responsesToSave: QuestionnaireResponses) => {
        if (!session?.user || Object.keys(responsesToSave).length === 0) {
            return { success: false, error: 'User not authenticated or no responses' };
        }

        if (!password || !isPasswordVerified) {
            return { success: false, error: 'Password not verified' };
        }

        if (isSaving.current) {
            return { success: false, error: 'Save already in progress' };
        }

        isSaving.current = true;
        try {
            const { encrypted, iv, salt } = await encryptResponses(responsesToSave, password);
            const encryptedBase64 = arrayBufferToBase64(encrypted);
            const ivBase64 = arrayBufferToBase64(iv.buffer as ArrayBuffer);
            const saltBase64 = arrayBufferToBase64(salt.buffer as ArrayBuffer);

            const result = await saveEncryptedResponses(encryptedBase64, ivBase64, saltBase64);
            return result;
        } catch (error) {
            console.error('Failed to encrypt and save:', error);
            return { success: false, error: 'Failed to encrypt and save responses' };
        } finally {
            isSaving.current = false;
        }
    }, [session?.user, password, isPasswordVerified]);

    /**
     * Load and decrypt responses from database.
     */
    const loadFromDatabase = useCallback(async () => {
        if (!session?.user) {
            return { success: false, error: 'User not authenticated' };
        }

        if (!password || !isPasswordVerified) {
            return { success: false, error: 'Password not verified' };
        }

        try {
            const result = await getEncryptedResponses();

            if (result.success && result.data?.encryptedData) {
                try {
                    const encrypted = base64ToArrayBuffer(result.data.encryptedData);
                    const iv = base64ToUint8Array(result.data.iv);
                    const salt = base64ToUint8Array(result.data.salt);

                    const decryptedResponses = await decryptResponses(encrypted, iv, salt, password);
                    setResponses(decryptedResponses);
                    return { success: true, data: decryptedResponses };
                } catch (decryptError) {
                    console.error('Failed to decrypt responses:', decryptError);
                    return { success: false, error: 'Failed to decrypt responses' };
                }
            } else {
                // No encrypted data - start fresh
                setResponses({});
                return { success: true, data: null };
            }
        } catch (error) {
            console.error('Failed to load from database:', error);
            setResponses({});
            return { success: false, error: 'Failed to load from database' };
        }
    }, [session?.user, password, isPasswordVerified, setResponses]);

    /**
     * Complete questionnaire: encrypt responses and compute profile locally.
     */
    const submitQuestionnaire = useCallback(async () => {
        if (!session?.user) {
            throw new Error('User not authenticated');
        }

        if (!password || !isPasswordVerified) {
            throw new Error('Password not verified');
        }

        setIsSubmitting(true);
        try {
            // 1. Compute profile locally (deterministic, no LLM)
            const profile = computeProfile(responses);

            // 2. Encrypt responses locally
            const { encrypted, iv, salt } = await encryptResponses(responses, password);
            const encryptedBase64 = arrayBufferToBase64(encrypted);
            const ivBase64 = arrayBufferToBase64(iv.buffer as ArrayBuffer);
            const saltBase64 = arrayBufferToBase64(salt.buffer as ArrayBuffer);

            // 3. Send profile (plaintext) + encrypted responses to server
            const result = await completeQuestionnaire(
                profile,
                encryptedBase64,
                ivBase64,
                saltBase64
            );

            if (result.success) {
                setResponses({});
                setState('intro');
                return result;
            } else {
                throw new Error(result.error || 'Failed to complete questionnaire');
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [session?.user, password, isPasswordVerified, responses, setIsSubmitting, setResponses, setState]);

    // Initialize: Load from database when password is verified
    useEffect(() => {
        if (!session?.user || hasInitialized || !password || !isPasswordVerified) return;

        setIsInitialLoading(true);
        loadFromDatabase().finally(() => {
            setIsInitialLoading(false);
            setHasInitialized(true);
        });
    }, [session?.user, hasInitialized, loadFromDatabase, password, isPasswordVerified]);

    // Auto-save responses with debouncing (single effect, prevents race conditions)
    useEffect(() => {
        if (!session?.user || !hasInitialized || !password || !isPasswordVerified) return;
        if (Object.keys(responses).length === 0) return;

        // Clear any pending save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Debounce save
        saveTimeoutRef.current = setTimeout(() => {
            saveToDatabase(responses);
        }, 2000);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [responses, session?.user, hasInitialized, password, isPasswordVerified, saveToDatabase]);

    return {
        submitQuestionnaire,
        verifyAndSetPassword,
        isLoading,
        isSubmitting,
        isInitialLoading,
        hasInitialized,
        needsPassword: !isPasswordVerified,
        getFirstUnansweredIndex,
    };
}

// Hook for keyboard navigation
export function useKeyboardNavigation(
    onNext: () => void,
    onPrevious: () => void,
    canGoNext: boolean,
    canGoPrevious: boolean,
    isSlideComplete: boolean
) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (event.key) {
                case 'ArrowRight':
                case 'Enter':
                    if (canGoNext && isSlideComplete) {
                        event.preventDefault();
                        onNext();
                    }
                    break;
                case 'ArrowLeft':
                    if (canGoPrevious) {
                        event.preventDefault();
                        onPrevious();
                    }
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNext, onPrevious, canGoNext, canGoPrevious, isSlideComplete]);
}
