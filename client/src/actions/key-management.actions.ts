"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

/**
 * Store a new encryption key record for the user.
 * Called during initial setup (set-password flow or first questionnaire visit).
 */
export async function storeEncryptionKeys(
  wrappedMasterKey: string,      // Base64 — MK wrapped by password-derived KEK
  kekSalt: string,               // Base64 — PBKDF2 salt for KEK
  wrappedMasterKeyByRecovery?: string,  // Base64 — MK wrapped by safe-word key
  safeWordPhrase?: string        // Plaintext phrase — bcrypt hashed for verification
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const recoveryKeyHash = safeWordPhrase
      ? await bcrypt.hash(safeWordPhrase, BCRYPT_ROUNDS)
      : undefined;

    await prisma.userEncryptionKey.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        wrappedMasterKey: Buffer.from(wrappedMasterKey, "base64"),
        kekSalt: Buffer.from(kekSalt, "base64"),
        ...(wrappedMasterKeyByRecovery && {
          wrappedMasterKeyByRecovery: Buffer.from(wrappedMasterKeyByRecovery, "base64"),
        }),
        ...(recoveryKeyHash && { recoveryKeyHash }),
      },
      update: {
        wrappedMasterKey: Buffer.from(wrappedMasterKey, "base64"),
        kekSalt: Buffer.from(kekSalt, "base64"),
        ...(wrappedMasterKeyByRecovery && {
          wrappedMasterKeyByRecovery: Buffer.from(wrappedMasterKeyByRecovery, "base64"),
        }),
        ...(recoveryKeyHash && { recoveryKeyHash }),
        updatedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error storing encryption keys:", error);
    return { success: false, error: "Failed to store encryption keys" };
  }
}

/**
 * Fetch the wrapped master key + salt for the current user.
 * Used on every session unlock.
 */
export async function getEncryptionKeys(): Promise<{
  success: boolean;
  data?: {
    wrappedMasterKey: string;   // Base64
    kekSalt: string;            // Base64
    kekIterations: number;
    hasRecoveryKey: boolean;
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const record = await prisma.userEncryptionKey.findUnique({
      where: { userId: session.user.id },
    });

    if (!record) {
      return { success: true, data: undefined }; // No key yet — first-time setup needed
    }

    return {
      success: true,
      data: {
        wrappedMasterKey: Buffer.from(record.wrappedMasterKey as Uint8Array).toString("base64"),
        kekSalt: Buffer.from(record.kekSalt as Uint8Array).toString("base64"),
        kekIterations: record.kekIterations,
        hasRecoveryKey: !!record.wrappedMasterKeyByRecovery,
      },
    };
  } catch (error) {
    console.error("Error fetching encryption keys:", error);
    return { success: false, error: "Failed to fetch encryption keys" };
  }
}

/**
 * Update the wrapped master key after a password change.
 * Only re-wraps the MK — no questionnaire data re-encryption needed.
 */
export async function updateWrappedMasterKey(
  newWrappedMasterKey: string,   // Base64 — MK re-wrapped with new password
  newKekSalt: string             // Base64 — new PBKDF2 salt
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    await prisma.userEncryptionKey.update({
      where: { userId: session.user.id },
      data: {
        wrappedMasterKey: Buffer.from(newWrappedMasterKey, "base64"),
        kekSalt: Buffer.from(newKekSalt, "base64"),
        updatedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating wrapped master key:", error);
    return { success: false, error: "Failed to update master key" };
  }
}

/**
 * Verify a safe-word phrase against the stored hash.
 * Returns the wrapped-by-recovery blob if verification passes.
 */
export async function verifyAndGetRecoveryKey(
  safeWordPhrase: string
): Promise<{
  success: boolean;
  wrappedMasterKeyByRecovery?: string;  // Base64
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const record = await prisma.userEncryptionKey.findUnique({
      where: { userId: session.user.id },
    });

    if (!record || !record.recoveryKeyHash || !record.wrappedMasterKeyByRecovery) {
      return { success: false, error: "No recovery key set up for this account" };
    }

    const isValid = await bcrypt.compare(safeWordPhrase, record.recoveryKeyHash);
    if (!isValid) {
      return { success: false, error: "Incorrect safe words" };
    }

    return {
      success: true,
      wrappedMasterKeyByRecovery: Buffer.from(record.wrappedMasterKeyByRecovery as Uint8Array).toString("base64"),
    };
  } catch (error) {
    console.error("Error verifying recovery key:", error);
    return { success: false, error: "Failed to verify safe words" };
  }
}
