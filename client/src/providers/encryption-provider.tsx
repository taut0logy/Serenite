'use client';

/**
 * EncryptionProvider — Session-wide Master Key Context
 *
 * Holds the unlocked AES-256 Master Key (MK) for the current session.
 * The MK is a non-extractable CryptoKey — JavaScript cannot read its raw bytes.
 *
 * Lifecycle:
 *  - MK is unlocked at login (credential auth) or at set-password (social auth)
 *  - MK is lost on page refresh (must re-enter password to re-unlock)
 *  - MK is set to null on logout
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
    deriveKEK,
    generateKEKSalt,
    generateMasterKey,
    generateSafeWords,
    deriveSafeWordKey,
    safeWordsToBytes,
    wrapMasterKey,
    unwrapMasterKey,
    isValidBase64,
    arrayBufferToBase64,
    base64ToUint8Array,
} from '@/lib/key-management';
import {
    storeEncryptionKeys,
    getEncryptionKeys,
    updateWrappedMasterKey,
    verifyAndGetRecoveryKey,
} from '@/actions/key-management.actions';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SetupResult {
    safeWords: string[];
    phrase: string;
}

interface EncryptionContextValue {
    /** The unlocked Master Key, or null if the vault is locked */
    masterKey: CryptoKey | null;
    /** True when a valid MK is in memory */
    isUnlocked: boolean;
    /**
     * Unlock the vault with the user's password.
     * Fetches the wrapped MK from the server, derives KEK, unwraps.
     * Returns false if the password is wrong (OperationError from unwrapKey).
     */
    unlockWithPassword: (password: string) => Promise<{ success: boolean; needsSetup?: boolean; error?: string }>;
    /**
     * First-time setup — generates a new MK, wraps it, stores on server.
     * Returns the safe words to show to the user.
     */
    setupNewKey: (password: string) => Promise<SetupResult>;
    /**
     * Re-wrap the MK with a new password (for password change).
     * Requires the vault to be currently unlocked.
     */
    rewrapWithNewPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
    /**
     * Unlock with safe words (forgot password flow).
     * Re-wraps MK with new password after unlocking.
     */
    unlockWithSafeWords: (phrase: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
    /** Lock the vault (MK cleared from memory) */
    lockVault: () => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const EncryptionContext = createContext<EncryptionContextValue | undefined>(undefined);

export function EncryptionProvider({ children }: { children: ReactNode }) {
    const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);

    const isUnlocked = masterKey !== null;

    // ── Unlock with Password ─────────────────────────────────────────────────
    const unlockWithPassword = useCallback(async (
        password: string
    ): Promise<{ success: boolean; needsSetup?: boolean; error?: string }> => {
        try {
            const result = await getEncryptionKeys();
            if (!result.success) {
                return { success: false, error: result.error || 'Failed to fetch encryption keys' };
            }

            // No key yet — caller should trigger setupNewKey
            if (!result.data) {
                return { success: false, needsSetup: true };
            }

            const { wrappedMasterKey, kekSalt } = result.data;

            if (!isValidBase64(wrappedMasterKey) || !isValidBase64(kekSalt)) {
                return { success: false, error: 'Corrupted key data — please contact support' };
            }

            const salt = base64ToUint8Array(kekSalt);
            const kek = await deriveKEK(password, salt);
            const mk = await unwrapMasterKey(wrappedMasterKey, kek);
            setMasterKey(mk);
            return { success: true };
        } catch {
            // unwrapKey throws OperationError for wrong password
            return { success: false, error: 'Incorrect password' };
        }
    }, []);

    // ── First-time Setup ──────────────────────────────────────────────────────
    const setupNewKey = useCallback(async (password: string): Promise<SetupResult> => {
        // Generate fresh MK
        const mk = await generateMasterKey();

        // Wrap with password-derived KEK
        const salt = generateKEKSalt();
        const kek = await deriveKEK(password, salt);
        const wrappedMKBuffer = await wrapMasterKey(mk, kek);

        // Generate safe words for recovery
        const { words, phrase, rawBytes } = generateSafeWords();
        const safeWordKey = await deriveSafeWordKey(rawBytes);
        const wrappedMKByRecoveryBuffer = await wrapMasterKey(mk, safeWordKey);

        // Convert to Base64 using our utility (avoids Uint8Array type issues)
        const saltBase64 = arrayBufferToBase64(salt.buffer as ArrayBuffer);
        const wrappedMKBase64 = wrappedMKBuffer;  // wrapMasterKey already returns Base64
        const wrappedMKByRecoveryBase64 = wrappedMKByRecoveryBuffer;  // same

        await storeEncryptionKeys(
            wrappedMKBase64,
            saltBase64,
            wrappedMKByRecoveryBase64,
            phrase
        );

        // Hold MK in memory
        setMasterKey(mk);

        return { safeWords: words, phrase };
    }, []);

    // ── Re-wrap on Password Change ────────────────────────────────────────────
    const rewrapWithNewPassword = useCallback(async (
        newPassword: string
    ): Promise<{ success: boolean; error?: string }> => {
        if (!masterKey) {
            return { success: false, error: 'Vault is locked — unlock first' };
        }
        try {
            const newSalt = generateKEKSalt();
            const newKEK = await deriveKEK(newPassword, newSalt);
            const newWrappedMKBuffer = await wrapMasterKey(masterKey, newKEK);

            const newSaltBase64 = arrayBufferToBase64(newSalt.buffer as ArrayBuffer);
            const newWrappedMKBase64 = newWrappedMKBuffer;  // wrapMasterKey already returns Base64

            return await updateWrappedMasterKey(newWrappedMKBase64, newSaltBase64);
        } catch {
            return { success: false, error: 'Failed to update encryption key' };
        }
    }, [masterKey]);

    // ── Recover with Safe Words ───────────────────────────────────────────────
    const unlockWithSafeWords = useCallback(async (
        phrase: string,
        newPassword: string
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            // Verify phrase and get encrypted blob from server
            const verifyResult = await verifyAndGetRecoveryKey(phrase);
            if (!verifyResult.success || !verifyResult.wrappedMasterKeyByRecovery) {
                return { success: false, error: verifyResult.error || 'Invalid safe words' };
            }

            // Reconstruct safe-word key and unwrap MK
            const rawBytes = safeWordsToBytes(phrase);
            const safeWordKey = await deriveSafeWordKey(rawBytes);
            const mk = await unwrapMasterKey(verifyResult.wrappedMasterKeyByRecovery, safeWordKey);

            // Re-wrap MK with the new password and persist
            const newSalt = generateKEKSalt();
            const newKEK = await deriveKEK(newPassword, newSalt);
            const newWrappedMKBuffer = await wrapMasterKey(mk, newKEK);

            const newSaltBase64 = arrayBufferToBase64(newSalt.buffer as ArrayBuffer);
            const newWrappedMKBase64 = newWrappedMKBuffer;  // wrapMasterKey already returns Base64

            await updateWrappedMasterKey(newWrappedMKBase64, newSaltBase64);

            // Hold MK in memory
            setMasterKey(mk);
            return { success: true };
        } catch {
            return { success: false, error: 'Recovery failed — check your safe words' };
        }
    }, []);

    // ── Lock ──────────────────────────────────────────────────────────────────
    const lockVault = useCallback(() => {
        setMasterKey(null);
    }, []);

    return (
        <EncryptionContext.Provider value={{
            masterKey,
            isUnlocked,
            unlockWithPassword,
            setupNewKey,
            rewrapWithNewPassword,
            unlockWithSafeWords,
            lockVault,
        }}>
            {children}
        </EncryptionContext.Provider>
    );
}

export function useEncryption(): EncryptionContextValue {
    const ctx = useContext(EncryptionContext);
    if (!ctx) throw new Error('useEncryption must be used within an EncryptionProvider');
    return ctx;
}
