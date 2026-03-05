'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
    saveEncryptedResponses,
    getEncryptedResponses,
    completeQuestionnaire
} from '@/actions/questionnaire.actions';
import { useQuestionnaireStore } from '@/stores/use-questionnaire-store';
import { QuestionnaireResponses } from '@/types/questionnaire';
import { computeProfile } from '@/lib/profiling';
import { encryptWithMK, decryptWithMK, arrayBufferToBase64, base64ToArrayBuffer, base64ToUint8Array, isValidBase64 } from '@/lib/key-management';
import { useEncryption } from '@/providers/encryption-provider';

export function useQuestionnaire() {
    const { data: session, update } = useSession();
    const { masterKey, isUnlocked, unlockWithPassword, setupNewKey } = useEncryption();

    // Store selectors
    const setResponses = useQuestionnaireStore(s => s.setResponses);
    const setIsSubmitting = useQuestionnaireStore(s => s.setIsSubmitting);
    const setState = useQuestionnaireStore(s => s.setState);
    const responses = useQuestionnaireStore(s => s.responses);
    const isLoading = useQuestionnaireStore(s => s.isLoading);
    const isSubmitting = useQuestionnaireStore(s => s.isSubmitting);
    const getFirstUnansweredIndex = useQuestionnaireStore(s => s.getFirstUnansweredIndex);

    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [hasInitialized, setHasInitialized] = useState(false);

    // Ref to prevent concurrent saves
    const isSaving = useRef(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Unlock the vault using the user's password.
     * Returns needsSetup=true if this is the user's first login (no MK yet).
     */
    const unlockVault = useCallback(async (
        password: string
    ): Promise<{ success: boolean; needsSetup?: boolean; error?: string }> => {
        const result = await unlockWithPassword(password);
        // If no key exists yet, generate one
        if (result.needsSetup) {
            await setupNewKey(password);
            return { success: true };
        }
        return result;
    }, [unlockWithPassword, setupNewKey]);

    /**
     * Save encrypted responses to database.
     */
    const saveToDatabase = useCallback(async (responsesToSave: QuestionnaireResponses) => {
        if (!session?.user || Object.keys(responsesToSave).length === 0) {
            return { success: false, error: 'No session or responses' };
        }
        if (!masterKey) {
            return { success: false, error: 'Vault is locked' };
        }
        if (isSaving.current) {
            return { success: false, error: 'Save in progress' };
        }

        isSaving.current = true;
        try {
            const { encrypted, iv } = await encryptWithMK(responsesToSave, masterKey);
            const encryptedBase64 = arrayBufferToBase64(encrypted);
            const ivBase64 = arrayBufferToBase64(iv.buffer as ArrayBuffer);
            // Salt is empty string — MK-based encryption doesn't use per-call PBKDF2
            const result = await saveEncryptedResponses(encryptedBase64, ivBase64, '');
            return result;
        } catch (err) {
            console.error('Failed to encrypt and save:', err);
            return { success: false, error: 'Failed to save responses' };
        } finally {
            isSaving.current = false;
        }
    }, [session?.user, masterKey]);

    /**
     * Load and decrypt responses from database.
     * T2 fix: validates base64 before decoding to prevent InvalidCharacterError.
     */
    const loadFromDatabase = useCallback(async () => {
        if (!session?.user) return { success: false, error: 'Not authenticated' };
        if (!masterKey) return { success: false, error: 'Vault is locked' };

        try {
            const result = await getEncryptedResponses();

            if (result.success && result.data?.encryptedData) {
                const { encryptedData, iv } = result.data;

                // T2 fix: validate before decoding
                if (!isValidBase64(encryptedData) || !isValidBase64(iv)) {
                    console.warn('Invalid base64 in stored responses — starting fresh');
                    setResponses({});
                    return { success: true, data: null };
                }

                try {
                    const encrypted = base64ToArrayBuffer(encryptedData);
                    const ivBytes = base64ToUint8Array(iv);
                    const decrypted = await decryptWithMK(encrypted, ivBytes, masterKey);
                    setResponses(decrypted);
                    return { success: true, data: decrypted };
                } catch (decryptErr) {
                    console.error('Decryption failed:', decryptErr);
                    setResponses({});
                    return { success: false, error: 'Failed to decrypt responses' };
                }
            } else {
                setResponses({});
                return { success: true, data: null };
            }
        } catch (err) {
            console.error('Failed to load from database:', err);
            setResponses({});
            return { success: false, error: 'Failed to load responses' };
        }
    }, [session?.user, masterKey, setResponses]);

    /**
     * Complete questionnaire: compute profile + encrypt + call server action.
     * T1 fix: calls session.update() before returning so middleware re-reads questionnaireCompleted=true.
     * T4 fix: cancels pending auto-save before submitting.
     */
    const submitQuestionnaire = useCallback(async () => {
        if (!session?.user) throw new Error('Not authenticated');
        if (!masterKey) throw new Error('Vault is locked');

        // T4 fix: Cancel any pending debounced auto-save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        setIsSubmitting(true);
        try {
            // 1. Compute profile locally
            const profile = computeProfile(responses);

            // 2. Encrypt responses with MK (no PBKDF2 — much faster)
            const { encrypted, iv } = await encryptWithMK(responses, masterKey);
            const encryptedBase64 = arrayBufferToBase64(encrypted);
            const ivBase64 = arrayBufferToBase64(iv.buffer as ArrayBuffer);

            // 3. Submit to server
            const result = await completeQuestionnaire(profile, encryptedBase64, ivBase64, '');

            if (result.success) {
                // T1 fix: Refresh JWT so middleware sees questionnaireCompleted=true
                await update();
                return result;
            } else {
                throw new Error(result.error || 'Failed to complete questionnaire');
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [session?.user, masterKey, responses, setIsSubmitting, update]);

    // Initialize: load from DB when MK becomes available
    useEffect(() => {
        if (!session?.user || hasInitialized || !masterKey) return;

        setIsInitialLoading(true);
        loadFromDatabase().finally(() => {
            setIsInitialLoading(false);
            setHasInitialized(true);
        });
    }, [session?.user, hasInitialized, loadFromDatabase, masterKey]);

    // T5 fix: Reset store when user changes
    useEffect(() => {
        if (!session?.user?.id) return;
        setHasInitialized(false);
        setResponses({});
        setState('intro');
    }, [session?.user?.id, setResponses, setState]);

    // Auto-save with 2s debounce
    useEffect(() => {
        if (!session?.user || !hasInitialized || !masterKey) return;
        if (Object.keys(responses).length === 0) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            saveToDatabase(responses);
        }, 2000);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [responses, session?.user, hasInitialized, masterKey, saveToDatabase]);

    return {
        submitQuestionnaire,
        unlockVault,
        isLoading,
        isSubmitting,
        isInitialLoading,
        hasInitialized,
        // needsUnlock: vault is locked — page must show a password prompt
        needsUnlock: !isUnlocked,
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
