/**
 * @file rag.test.js
 * @description Test script for RAG endpoints
 */

import supertest from 'supertest';

console.log('Test script starting...');

// Test user credentials
const testUser = {
    email: 'test@example.com',
    password: 'password'
};

console.log('Creating request object...');
// Create a request object pointing to the running server
const request = supertest('http://localhost:3000');

// Login function to get auth token
async function login() {
    console.log('Attempting login...');
    try {
        const response = await request
            .post('/api/auth/login')
            .send(testUser);

        console.log('Login response status:', response.status);
        console.log('Login response body:', JSON.stringify(response.body, null, 2));

        if (response.status !== 200) {
            throw new Error(`Login failed: ${response.body?.error || 'Unknown error'}`);
        }

        return response.body.token;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Test message fetching
async function testMessageFetching(token) {
    console.log('Attempting to fetch messages...');
    try {
        const response = await request
            .get('/api/rag/messages')
            .set('Authorization', `Bearer ${token}`)
            .query({ offset: 0, limit: 10 });

        console.log('Message fetch response status:', response.status);
        console.log('Message fetch response body:', JSON.stringify(response.body, null, 2));

        if (response.status !== 200) {
            throw new Error(`Message fetching failed: ${response.body?.error || 'Unknown error'}`);
        }

        if (!response.body?.messages || !Array.isArray(response.body.messages)) {
            throw new Error('Invalid response format: messages not found or not an array');
        }

        console.log(`Found ${response.body.messages.length} messages`);
        if (response.body.messages.length > 0) {
            console.log('First message:', JSON.stringify(response.body.messages[0], null, 2));
        }

        return response.body;
    } catch (error) {
        console.error('Message fetching error:', error);
        throw error;
    }
}

// Run the tests
async function runTests() {
    console.log('runTests function starting...');
    try {
        console.log('Starting tests...');
        const token = await login();
        console.log('Login successful, token:', token?.substring(0, 10) + '...');
        
        await testMessageFetching(token);
        console.log('Message fetching test completed');
        
        console.log('All tests completed successfully');
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
console.log('Checking if should run tests...');
console.log('argv[1]:', process.argv[1]);
console.log('import.meta.url:', import.meta.url);

// Normalize paths for comparison
const testPath = process.argv[1].replace(/\\/g, '/');
const importPath = new URL(import.meta.url).pathname.replace(/^\//, '');
console.log('Normalized test path:', testPath);
console.log('Normalized import path:', importPath);

if (testPath === importPath) {
    console.log('Running tests...');
    runTests().catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
} else {
    console.log('Not running tests - paths do not match:');
    console.log('Test path:', testPath);
    console.log('Import path:', importPath);
} 