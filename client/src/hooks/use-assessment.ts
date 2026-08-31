'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
    saveEncryptedResponses,
    getEncryptedResponses,
    completeAssessment,
} from '@/actions/assessment.actions';
import { useAssessmentStore } from '@/stores/use-assessment-store';
import { createSession, type SessionState } from '@/lib/assessment/session';
import { assembleResult } from '@/lib/assessment/assemble';
import { contributeCalibrationResponses } from '@/actions/calibration.actions';
import { BANKS_BY_DOMAIN, PARAMETER_SET_ID } from '@/lib/assessment/banks';
import { encryptWithMK, decryptWithMK, arrayBufferToBase64, base64ToArrayBuffer, base64ToUint8Array, isValidBase64 } from '@/lib/key-management';
import { useEncryption } from '@/providers/encryption-provider';

export function useAssessment() {
    const { data: session, update } = useSession();
    const { masterKey, isUnlocked, unlockWithPassword, setupNewKey } = useEncryption();

    const setSession = useAssessmentStore(s => s.setSession);
    const setIsSubmitting = useAssessmentStore(s => s.setIsSubmitting);
    const setUIState = useAssessmentStore(s => s.setUIState);
    const assessmentSession = useAssessmentStore(s => s.session);
    const isLoading = useAssessmentStore(s => s.isLoading);
    const isSubmitting = useAssessmentStore(s => s.isSubmitting);
    const hasInitialized = useAssessmentStore(s => s.hasInitialized);
    const setHasInitialized = useAssessmentStore(s => s.setHasInitialized);

    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const isSaving = useRef(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastUserIdRef = useRef<string | undefined>(undefined);

    const unlockVault = useCallback(async (
        password: string
    ): Promise<{ success: boolean; needsSetup?: boolean; error?: string }> => {
        const result = await unlockWithPassword(password);
        if (result.needsSetup) {
            await setupNewKey(password);
            return { success: true };
        }
        return result;
    }, [unlockWithPassword, setupNewKey]);

    const saveToDatabase = useCallback(async (sessionToSave: SessionState) => {
        if (!session?.user || sessionToSave.history.length === 0) {
            return { success: false, error: 'No session or responses' };
        }
        if (!masterKey) return { success: false, error: 'Vault is locked' };
        if (isSaving.current) return { success: false, error: 'Save in progress' };

        isSaving.current = true;
        try {
            const { encrypted, iv } = await encryptWithMK(sessionToSave, masterKey);
            const encryptedBase64 = arrayBufferToBase64(encrypted);
            const ivBase64 = arrayBufferToBase64(iv.buffer as ArrayBuffer);
            return await saveEncryptedResponses(encryptedBase64, ivBase64, '');
        } catch (err) {
            console.error('Failed to encrypt and save:', err);
            return { success: false, error: 'Failed to save responses' };
        } finally {
            isSaving.current = false;
        }
    }, [session?.user, masterKey]);

    const loadFromDatabase = useCallback(async () => {
        if (!session?.user) return { success: false, error: 'Not authenticated' };
        if (!masterKey) return { success: false, error: 'Vault is locked' };

        try {
            const result = await getEncryptedResponses();

            if (result.success && result.data?.encryptedData) {
                const { encryptedData, iv } = result.data;

                if (!isValidBase64(encryptedData) || !isValidBase64(iv)) {
                    console.warn('Invalid base64 in stored assessment — starting fresh');
                    setSession(createSession());
                    return { success: true, data: null };
                }

                try {
                    const encrypted = base64ToArrayBuffer(encryptedData);
                    const ivBytes = base64ToUint8Array(iv);
                    const decrypted = await decryptWithMK<SessionState>(encrypted, ivBytes, masterKey);
                    setSession(decrypted);
                    return { success: true, data: decrypted };
                } catch (decryptErr) {
                    console.error('Decryption failed:', decryptErr);
                    setSession(createSession());
                    return { success: false, error: 'Failed to decrypt responses' };
                }
            } else {
                setSession(createSession());
                return { success: true, data: null };
            }
        } catch (err) {
            console.error('Failed to load from database:', err);
            setSession(createSession());
            return { success: false, error: 'Failed to load responses' };
        }
    }, [session?.user, masterKey, setSession]);

    const submitAssessment = useCallback(async () => {
        if (!session?.user) throw new Error('Not authenticated');
        if (!masterKey) throw new Error('Vault is locked');

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        setIsSubmitting(true);
        try {
            // Risk and quality are read off the session inside assembleResult.
            // They used to be passed in here as literal `false`, which is how
            // both detectors ended up wired to nothing.
            const result = assembleResult({
                banks: BANKS_BY_DOMAIN,
                session: assessmentSession,
                parameterSetId: PARAMETER_SET_ID,
            });

            const { encrypted, iv } = await encryptWithMK(assessmentSession, masterKey);
            const encryptedBase64 = arrayBufferToBase64(encrypted);
            const ivBase64 = arrayBufferToBase64(iv.buffer as ArrayBuffer);

            const submitResult = await completeAssessment(result, encryptedBase64, ivBase64, '');

            if (submitResult.success) {
                // After the member's own results are safely stored, never
                // before. Returns quietly when they have not opted in, which
                // is the default.
                void contributeCalibrationResponses({
                    session: assessmentSession,
                    parameterSetId: PARAMETER_SET_ID,
                    qualityFlagged: result.qualityFlagged,
                });
                // navigation is already safe via the claim override cookie; don't block on this
                update().catch((err) => console.error('Background session refresh failed:', err));
                return submitResult;
            }
            throw new Error(submitResult.error || 'Failed to complete assessment');
        } finally {
            setIsSubmitting(false);
        }
    }, [session?.user, masterKey, assessmentSession, setIsSubmitting, update]);

    // hasInitialized lives in the store, not component state, so a remount
    // of this hook (observed around the post-submit navigation) doesn't
    // re-trigger a load that's likely to be interrupted mid-flight.
    useEffect(() => {
        if (!session?.user || hasInitialized || !masterKey) return;

        setIsInitialLoading(true);
        loadFromDatabase().finally(() => {
            setIsInitialLoading(false);
            setHasInitialized(true);
        });
    }, [session?.user, hasInitialized, loadFromDatabase, masterKey, setHasInitialized]);

    useEffect(() => {
        const currentId = session?.user?.id;
        if (!currentId) return;
        // ignore transient undefined->defined blips from a session refresh; only
        // reset when the id actually changes to a different logged-in user
        if (lastUserIdRef.current === currentId) return;
        const isRealUserChange = lastUserIdRef.current !== undefined;
        lastUserIdRef.current = currentId;
        if (!isRealUserChange) return;

        setHasInitialized(false);
        setSession(createSession());
        setUIState('intro');
    }, [session?.user?.id, setSession, setUIState, setHasInitialized]);

    useEffect(() => {
        if (!session?.user || !hasInitialized || !masterKey) return;
        if (assessmentSession.history.length === 0) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            saveToDatabase(assessmentSession);
        }, 2000);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [assessmentSession, session?.user, hasInitialized, masterKey, saveToDatabase]);

    return {
        submitAssessment,
        unlockVault,
        isLoading,
        isSubmitting,
        isInitialLoading,
        hasInitialized,
        needsUnlock: !isUnlocked,
    };
}
