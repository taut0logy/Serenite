/**
 * End-to-End Encryption utilities for group chat
 * Uses ECDH for key exchange and AES-GCM for message encryption
 */

export interface ECDHKeyPair {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}

export interface SerializedKeyPair {
    publicKey: string; // Base64 encoded
    privateKey: string; // Base64 encoded
}

export interface EncryptedMessage {
    encryptedContent: string; // Base64 encoded
    iv: string; // Base64 encoded initialization vector
    tag: string; // Base64 encoded authentication tag
}

export interface GroupKeyBundle {
    groupId: string;
    encryptedAESKey: string; // AES key encrypted with user's ECDH public key
    keyVersion: number; // For key rotation
    createdAt: string;
}

/**
 * Generate ECDH key pair for a user
 */
export async function generateECDHKeyPair(): Promise<ECDHKeyPair> {
    try {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-256", // secp256r1
            },
            true, // extractable
            ["deriveKey", "deriveBits"]
        );

        return {
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey,
        };
    } catch (error) {
        console.error("Failed to generate ECDH key pair:", error);
        throw new Error("Key generation failed");
    }
}

/**
 * Serialize key pair for storage
 */
export async function serializeKeyPair(keyPair: ECDHKeyPair): Promise<SerializedKeyPair> {
    try {
        const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
        const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

        return {
            publicKey: bufferToBase64(publicKeyBuffer),
            privateKey: bufferToBase64(privateKeyBuffer),
        };
    } catch (error) {
        console.error("Failed to serialize key pair:", error);
        throw new Error("Key serialization failed");
    }
}

/**
 * Deserialize key pair from storage
 */
export async function deserializeKeyPair(serialized: SerializedKeyPair): Promise<ECDHKeyPair> {
    try {
        const publicKeyBuffer = base64ToBuffer(serialized.publicKey);
        const privateKeyBuffer = base64ToBuffer(serialized.privateKey);

        const publicKey = await crypto.subtle.importKey(
            "spki",
            publicKeyBuffer,
            { name: "ECDH", namedCurve: "P-256" },
            true,
            []
        );

        const privateKey = await crypto.subtle.importKey(
            "pkcs8",
            privateKeyBuffer,
            { name: "ECDH", namedCurve: "P-256" },
            true,
            ["deriveKey", "deriveBits"]
        );

        return { publicKey, privateKey };
    } catch (error) {
        console.error("Failed to deserialize key pair:", error);
        throw new Error("Key deserialization failed");
    }
}

/**
 * Import public key from base64 string
 */
export async function importPublicKey(publicKeyB64: string): Promise<CryptoKey> {
    try {
        const publicKeyBuffer = base64ToBuffer(publicKeyB64);
        return await crypto.subtle.importKey(
            "spki",
            publicKeyBuffer,
            { name: "ECDH", namedCurve: "P-256" },
            true,
            []
        );
    } catch (error) {
        console.error("Failed to import public key:", error);
        throw new Error("Public key import failed");
    }
}

/**
 * Generate AES key for group encryption
 */
export async function generateAESKey(): Promise<CryptoKey> {
    try {
        return await crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256, // 256-bit AES key
            },
            true, // extractable
            ["encrypt", "decrypt"]
        );
    } catch (error) {
        console.error("Failed to generate AES key:", error);
        throw new Error("AES key generation failed");
    }
}

/**
 * Derive shared secret using ECDH
 */
export async function deriveSharedSecret(
    privateKey: CryptoKey,
    publicKey: CryptoKey
): Promise<CryptoKey> {
    try {
        return await crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: publicKey,
            },
            privateKey,
            {
                name: "AES-GCM",
                length: 256,
            },
            false, // not extractable
            ["encrypt", "decrypt"]
        );
    } catch (error) {
        console.error("Failed to derive shared secret:", error);
        throw new Error("Shared secret derivation failed");
    }
}

/**
 * Encrypt AES key with ECDH public key
 */
export async function encryptAESKey(
    aesKey: CryptoKey,
    recipientPublicKey: CryptoKey,
    senderPrivateKey: CryptoKey
): Promise<string> {
    try {
        // Derive shared secret
        const sharedSecret = await deriveSharedSecret(senderPrivateKey, recipientPublicKey);

        // Export AES key as raw bytes
        const aesKeyBuffer = await crypto.subtle.exportKey("raw", aesKey);

        // Generate IV
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Encrypt AES key with shared secret
        const encryptedBuffer = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            sharedSecret,
            aesKeyBuffer
        );

        // Combine IV and encrypted data
        const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encryptedBuffer), iv.length);

        return bufferToBase64(combined.buffer);
    } catch (error) {
        console.error("Failed to encrypt AES key:", error);
        throw new Error("AES key encryption failed");
    }
}

/**
 * Decrypt AES key with ECDH private key
 */
export async function decryptAESKey(
    encryptedAESKey: string,
    senderPublicKey: CryptoKey,
    recipientPrivateKey: CryptoKey
): Promise<CryptoKey> {
    try {
        // Decode encrypted data
        const combined = base64ToBuffer(encryptedAESKey);

        // Extract IV and encrypted data
        const iv = combined.slice(0, 12);
        const encryptedData = combined.slice(12);

        // Derive shared secret
        const sharedSecret = await deriveSharedSecret(recipientPrivateKey, senderPublicKey);

        // Decrypt AES key
        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            sharedSecret,
            encryptedData
        );

        // Import decrypted AES key
        return await crypto.subtle.importKey(
            "raw",
            decryptedBuffer,
            { name: "AES-GCM" },
            false,
            ["encrypt", "decrypt"]
        );
    } catch (error) {
        console.error("Failed to decrypt AES key:", error);
        throw new Error("AES key decryption failed");
    }
}

/**
 * Encrypt message with AES-GCM
 */
export async function encryptMessage(message: string, aesKey: CryptoKey): Promise<EncryptedMessage> {
    try {
        const messageBuffer = new TextEncoder().encode(message);
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const encryptedBuffer = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            aesKey,
            messageBuffer
        );

        // Split encrypted data and authentication tag
        const encryptedData = encryptedBuffer.slice(0, -16);
        const tag = encryptedBuffer.slice(-16);

        return {
            encryptedContent: bufferToBase64(encryptedData),
            iv: bufferToBase64(iv.buffer),
            tag: bufferToBase64(tag),
        };
    } catch (error) {
        console.error("Failed to encrypt message:", error);
        throw new Error("Message encryption failed");
    }
}

/**
 * Decrypt message with AES-GCM
 */
export async function decryptMessage(
    encryptedMessage: EncryptedMessage,
    aesKey: CryptoKey
): Promise<string> {
    try {
        const encryptedData = base64ToBuffer(encryptedMessage.encryptedContent);
        const iv = base64ToBuffer(encryptedMessage.iv);
        const tag = base64ToBuffer(encryptedMessage.tag);

        // Combine encrypted data and tag
        const combined = new Uint8Array(encryptedData.byteLength + tag.byteLength);
        combined.set(new Uint8Array(encryptedData));
        combined.set(new Uint8Array(tag), encryptedData.byteLength);

        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            aesKey,
            combined
        );

        return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
        console.error("Failed to decrypt message:", error);
        throw new Error("Message decryption failed");
    }
}

/**
 * Utility functions for base64 encoding/decoding
 */
function bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Generate random hex string for group IDs
 */
export function generateRandomId(length: number = 32): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length / 2));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
