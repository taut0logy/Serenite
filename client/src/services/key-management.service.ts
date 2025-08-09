/**
 * Key Management Service for E2E Encryption
 * Handles user key pairs and group key management
 */

import {
    generateECDHKeyPair,
    serializeKeyPair,
    deserializeKeyPair,
    generateAESKey,
    encryptAESKey,
    decryptAESKey,
    importPublicKey,
    type ECDHKeyPair,
    type SerializedKeyPair,
    type GroupKeyBundle,
} from '@/lib/crypto';

const USER_KEYPAIR_STORAGE_KEY = 'e2e_user_keypair';
const GROUP_KEYS_STORAGE_KEY = 'e2e_group_keys';

export interface UserPublicKey {
    userId: string;
    publicKey: string; // Base64 encoded
    createdAt: string;
}

export interface GroupMember {
    userId: string;
    publicKey: string;
    joinedAt: string;
}

export interface GroupKeyInfo {
    groupId: string;
    aesKey: CryptoKey;
    keyVersion: number;
    createdAt: string;
}

export class KeyManagementService {
    private userKeyPair: ECDHKeyPair | null = null;
    private groupKeys: Map<string, GroupKeyInfo> = new Map();

    /**
     * Initialize the service - load or generate user key pair
     */
    async initialize(userId: string): Promise<void> {
        try {
            await this.loadUserKeyPair();
            await this.loadGroupKeys();

            // If no key pair exists, generate one
            if (!this.userKeyPair) {
                await this.generateAndStoreUserKeyPair(userId);
            }
        } catch (error) {
            console.error('Failed to initialize key management service:', error);
            throw error;
        }
    }

    /**
     * Generate new user key pair and store it
     */
    async generateAndStoreUserKeyPair(userId: string): Promise<UserPublicKey> {
        try {
            const keyPair = await generateECDHKeyPair();
            const serialized = await serializeKeyPair(keyPair);

            // Store in localStorage (in production, consider more secure storage)
            localStorage.setItem(USER_KEYPAIR_STORAGE_KEY, JSON.stringify(serialized));

            this.userKeyPair = keyPair;

            const userPublicKey: UserPublicKey = {
                userId,
                publicKey: serialized.publicKey,
                createdAt: new Date().toISOString(),
            };

            // Store public key on server
            await this.uploadPublicKey(userPublicKey);

            return userPublicKey;
        } catch (error) {
            console.error('Failed to generate user key pair:', error);
            throw error;
        }
    }

    /**
     * Load user key pair from storage
     */
    private async loadUserKeyPair(): Promise<void> {
        try {
            const stored = localStorage.getItem(USER_KEYPAIR_STORAGE_KEY);
            if (stored) {
                const serialized: SerializedKeyPair = JSON.parse(stored);
                this.userKeyPair = await deserializeKeyPair(serialized);
            }
        } catch (error) {
            console.error('Failed to load user key pair:', error);
            // Continue without throwing - will generate new key pair
        }
    }

    /**
     * Load group keys from storage
     */
    private async loadGroupKeys(): Promise<void> {
        try {
            const stored = localStorage.getItem(GROUP_KEYS_STORAGE_KEY);
            if (stored) {
                // Note: CryptoKey objects can't be serialized, 
                // so we'll need to decrypt them on demand
                // For now, just initialize the map
                this.groupKeys = new Map();
            }
        } catch (error) {
            console.error('Failed to load group keys:', error);
        }
    }

    /**
     * Get user's public key
     */
    async getUserPublicKey(): Promise<string> {
        if (!this.userKeyPair) {
            throw new Error('User key pair not initialized');
        }

        const serialized = await serializeKeyPair(this.userKeyPair);
        return serialized.publicKey;
    }

    /**
     * Upload public key to server
     */
    private async uploadPublicKey(userPublicKey: UserPublicKey): Promise<void> {
        try {
            const response = await fetch('/api/encryption/public-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userPublicKey),
            });

            if (!response.ok) {
                throw new Error('Failed to upload public key');
            }
        } catch (error) {
            console.error('Failed to upload public key:', error);
            // Don't throw - key is still generated locally
        }
    }

    /**
     * Create new group and generate encryption key
     */
    async createGroup(groupId: string, members: GroupMember[]): Promise<void> {
        try {
            console.log('🏗️ Creating group:', { groupId, memberCount: members.length });

            if (!this.userKeyPair) {
                throw new Error('User key pair not initialized');
            }

            // Generate AES key for the group
            console.log('🔑 Generating AES key...');
            const aesKey = await generateAESKey();
            console.log('✅ AES key generated');

            // Encrypt AES key for each member
            const encryptedKeys: Array<{ userId: string; encryptedKey: string }> = [];
            console.log('🔐 Encrypting AES key for each member...');

            for (const member of members) {
                console.log(`🔐 Encrypting for member: ${member.userId}`);
                try {
                    const memberPublicKey = await importPublicKey(member.publicKey);
                    console.log('✅ Member public key imported');

                    const encryptedAESKey = await encryptAESKey(
                        aesKey,
                        memberPublicKey,
                        this.userKeyPair.privateKey
                    );
                    console.log('✅ AES key encrypted for member');

                    encryptedKeys.push({
                        userId: member.userId,
                        encryptedKey: encryptedAESKey,
                    });
                } catch (memberError) {
                    console.error(`❌ Failed to encrypt for member ${member.userId}:`, memberError);
                    throw memberError;
                }
            }

            console.log(`✅ AES key encrypted for ${encryptedKeys.length} members`);

            // Store group key locally
            const groupKeyInfo: GroupKeyInfo = {
                groupId,
                aesKey,
                keyVersion: 1,
                createdAt: new Date().toISOString(),
            };

            this.groupKeys.set(groupId, groupKeyInfo);
            console.log('💾 Group key stored locally');

            // Send encrypted keys to server
            console.log('🌐 Uploading group keys to server...');
            await this.uploadGroupKeys(groupId, encryptedKeys, 1);
            console.log('✅ Group keys uploaded to server');

        } catch (error) {
            console.error('❌ Failed to create group:', error);
            throw error;
        }
    }

    /**
     * Join existing group - decrypt group key
     */
    async joinGroup(groupId: string, encryptedAESKey: string, senderPublicKey: string): Promise<void> {
        try {
            if (!this.userKeyPair) {
                throw new Error('User key pair not initialized');
            }

            const senderKey = await importPublicKey(senderPublicKey);
            const aesKey = await decryptAESKey(
                encryptedAESKey,
                senderKey,
                this.userKeyPair.privateKey
            );

            const groupKeyInfo: GroupKeyInfo = {
                groupId,
                aesKey,
                keyVersion: 1, // Get from server
                createdAt: new Date().toISOString(),
            };

            this.groupKeys.set(groupId, groupKeyInfo);

        } catch (error) {
            console.error('Failed to join group:', error);
            throw error;
        }
    }

    /**
     * Get group encryption key
     */
    getGroupKey(groupId: string): CryptoKey | null {
        const groupKeyInfo = this.groupKeys.get(groupId);
        return groupKeyInfo?.aesKey || null;
    }

    /**
     * Rotate group key (when member added/removed)
     */
    async rotateGroupKey(groupId: string, members: GroupMember[]): Promise<void> {
        try {
            if (!this.userKeyPair) {
                throw new Error('User key pair not initialized');
            }

            // Generate new AES key
            const newAESKey = await generateAESKey();
            const currentKeyInfo = this.groupKeys.get(groupId);
            const newVersion = (currentKeyInfo?.keyVersion || 0) + 1;

            // Encrypt new AES key for each member
            const encryptedKeys: Array<{ userId: string; encryptedKey: string }> = [];

            for (const member of members) {
                const memberPublicKey = await importPublicKey(member.publicKey);
                const encryptedAESKey = await encryptAESKey(
                    newAESKey,
                    memberPublicKey,
                    this.userKeyPair.privateKey
                );

                encryptedKeys.push({
                    userId: member.userId,
                    encryptedKey: encryptedAESKey,
                });
            }

            // Update local group key
            const groupKeyInfo: GroupKeyInfo = {
                groupId,
                aesKey: newAESKey,
                keyVersion: newVersion,
                createdAt: new Date().toISOString(),
            };

            this.groupKeys.set(groupId, groupKeyInfo);

            // Send encrypted keys to server
            await this.uploadGroupKeys(groupId, encryptedKeys, newVersion);

        } catch (error) {
            console.error('Failed to rotate group key:', error);
            throw error;
        }
    }

    /**
     * Upload encrypted group keys to server
     */
    private async uploadGroupKeys(
        groupId: string,
        encryptedKeys: Array<{ userId: string; encryptedKey: string }>,
        keyVersion: number
    ): Promise<void> {
        try {
            console.log('📤 Uploading group keys:', { groupId, keyCount: encryptedKeys.length, keyVersion });

            const response = await fetch('/api/encryption/group-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    groupId,
                    encryptedKeys,
                    keyVersion,
                }),
            });

            console.log('📤 Server response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Server error response:', errorText);
                throw new Error(`Failed to upload group keys: ${response.status} ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Group keys uploaded successfully:', result);
        } catch (error) {
            console.error('❌ Failed to upload group keys:', error);
            throw error;
        }
    }

    /**
     * Fetch public keys for users
     */
    async fetchPublicKeys(userIds: string[]): Promise<UserPublicKey[]> {
        try {
            const response = await fetch('/api/encryption/public-keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userIds }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch public keys');
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to fetch public keys:', error);
            throw error;
        }
    }

    /**
     * Fetch encrypted group key
     */
    async fetchGroupKey(groupId: string, userId: string): Promise<GroupKeyBundle | null> {
        try {
            const response = await fetch(`/api/encryption/group-keys/${groupId}/${userId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error('Failed to fetch group key');
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to fetch group key:', error);
            return null;
        }
    }

    /**
     * Clear all keys (for logout)
     */
    clearKeys(): void {
        this.userKeyPair = null;
        this.groupKeys.clear();
        localStorage.removeItem(USER_KEYPAIR_STORAGE_KEY);
        localStorage.removeItem(GROUP_KEYS_STORAGE_KEY);
    }
}

// Export singleton instance
export const keyManagementService = new KeyManagementService();
