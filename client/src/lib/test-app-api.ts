/**
 * Simple test script to verify the app API endpoints are working
 */

const API_BASE = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';

async function testEncryptionAPI() {
    console.log('🧪 Testing App API Encryption Endpoints...');

    try {
        // Test 1: Store a public key
        console.log('\n1. Testing public key storage...');
        const publicKeyResponse = await fetch(`${API_BASE}/api/encryption/public-key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: 'test-user-123',
                publicKey: 'mock-public-key-data',
                createdAt: new Date().toISOString(),
            }),
        });

        if (publicKeyResponse.ok) {
            console.log('✅ Public key stored successfully');
        } else {
            console.log('❌ Failed to store public key:', await publicKeyResponse.text());
        }

        // Test 2: Retrieve public keys
        console.log('\n2. Testing public keys retrieval...');
        const publicKeysResponse = await fetch(`${API_BASE}/api/encryption/public-keys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userIds: ['test-user-123'],
            }),
        });

        if (publicKeysResponse.ok) {
            const keys = await publicKeysResponse.json();
            console.log('✅ Public keys retrieved:', keys.length);
        } else {
            console.log('❌ Failed to retrieve public keys:', await publicKeysResponse.text());
        }

        // Test 3: Store group keys
        console.log('\n3. Testing group key storage...');
        const groupKeysResponse = await fetch(`${API_BASE}/api/encryption/group-keys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                groupId: 'test-group-456',
                encryptedKeys: [
                    { userId: 'test-user-123', encryptedKey: 'mock-encrypted-key-data' }
                ],
                keyVersion: 1,
            }),
        });

        if (groupKeysResponse.ok) {
            console.log('✅ Group keys stored successfully');
        } else {
            console.log('❌ Failed to store group keys:', await groupKeysResponse.text());
        }

        // Test 4: Retrieve group key
        console.log('\n4. Testing group key retrieval...');
        const groupKeyResponse = await fetch(`${API_BASE}/api/encryption/group-keys/test-group-456/test-user-123`);

        if (groupKeyResponse.ok) {
            const groupKey = await groupKeyResponse.json();
            console.log('✅ Group key retrieved:', groupKey.keyVersion);
        } else {
            console.log('❌ Failed to retrieve group key:', await groupKeyResponse.text());
        }

        console.log('\n🎉 App API migration test completed!');

    } catch (error) {
        console.error('💥 Test failed with error:', error);
    }
}

// Export for use in testing
export { testEncryptionAPI };
