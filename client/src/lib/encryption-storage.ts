/**
 * Shared storage service for encryption keys
 * This allows both pages API and app API to share the same in-memory storage
 */

// In-memory storage for demo purposes
// In production, use a database
export const publicKeysStore = new Map<string, {
    userId: string;
    publicKey: string;
    createdAt: string;
}>();

export const groupKeysStore = new Map<string, Array<{
    userId: string;
    encryptedKey: string;
    keyVersion: number;
    createdAt: string;
}>>();

// Utility functions for storage operations
export const storageService = {
    // Public key operations
    setPublicKey(userId: string, publicKey: string, createdAt?: string) {
        publicKeysStore.set(userId, {
            userId,
            publicKey,
            createdAt: createdAt || new Date().toISOString(),
        });
    },

    getPublicKey(userId: string) {
        return publicKeysStore.get(userId);
    },

    getPublicKeys(userIds: string[]) {
        return userIds
            .map(userId => publicKeysStore.get(userId))
            .filter(Boolean);
    },

    // Group key operations
    setGroupKeys(groupId: string, encryptedKeys: Array<{ userId: string; encryptedKey: string }>, keyVersion: number) {
        const groupKeyEntries = encryptedKeys.map(({ userId, encryptedKey }) => ({
            userId,
            encryptedKey,
            keyVersion,
            createdAt: new Date().toISOString(),
        }));

        groupKeysStore.set(groupId, groupKeyEntries);
    },

    getGroupKey(groupId: string, userId: string) {
        const groupKeys = groupKeysStore.get(groupId);
        if (!groupKeys) return null;

        return groupKeys.find(key => key.userId === userId);
    },

    getAllGroupKeys(groupId: string) {
        return groupKeysStore.get(groupId) || [];
    },

    // Clear all data (for testing/reset)
    clearAll() {
        publicKeysStore.clear();
        groupKeysStore.clear();
    }
};
