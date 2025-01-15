/**
 * @file rag.test.js
 * @description Test script for RAG endpoints
 */

import supertest from 'supertest';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

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

async function testMessageChunking(token) {
    console.log('Testing message chunking...');
    
    const response = await request
        .get('/api/rag/messages')
        .set('Authorization', `Bearer ${token}`)
        .query({ offset: 0, limit: 10 })
        .expect(200);

    const messages = response.body?.messages || [];
    console.log(`Found ${messages.length} messages to analyze`);

    // Check each message's structure
    messages.forEach((msg, index) => {
        console.log(`\nAnalyzing message ${index + 1}:`);
        console.log('- ID:', msg.id);
        console.log('- Content length:', msg.content?.length || 0);
        
        // Verify message structure
        if (!msg.id || !msg.content || !msg.metadata) {
            throw new Error(`Message ${index + 1} is missing required properties`);
        }
        
        // Check metadata properties
        const requiredMetadataProps = ['chunk_index', 'total_chunks', 'original_message_id'];
        for (const prop of requiredMetadataProps) {
            if (!(prop in msg.metadata)) {
                throw new Error(`Message ${index + 1} is missing metadata property: ${prop}`);
            }
        }
        
        // Log chunking info
        console.log('- Chunk info:', {
            index: msg.metadata.chunk_index,
            total: msg.metadata.total_chunks,
            originalId: msg.metadata.original_message_id
        });

        // Verify chunking logic
        if (msg.content.length < 1000) {
            // Short messages should be single chunks
            if (msg.metadata.total_chunks !== 1) {
                throw new Error(`Short message ${index + 1} should have total_chunks=1`);
            }
            if (msg.metadata.chunk_index !== 0) {
                throw new Error(`Short message ${index + 1} should have chunk_index=0`);
            }
            if (msg.metadata.original_message_id !== msg.id) {
                throw new Error(`Short message ${index + 1} should have original_message_id equal to id`);
            }
        } else {
            // Long messages should be split
            if (msg.metadata.total_chunks <= 1) {
                throw new Error(`Long message ${index + 1} should have multiple chunks`);
            }
            if (msg.metadata.chunk_index >= msg.metadata.total_chunks) {
                throw new Error(`Message ${index + 1} has invalid chunk_index`);
            }
            if (!msg.id.includes('_chunk_')) {
                throw new Error(`Split message ${index + 1} should have _chunk_ in id`);
            }
        }
    });

    console.log('\nMessage chunking test completed successfully');
}

async function testEmbeddingGeneration(token) {
    console.log('Testing embedding generation...');
    
    // First get some messages to embed
    const response = await request
        .get('/api/rag/messages')
        .set('Authorization', `Bearer ${token}`)
        .query({ offset: 0, limit: 3 })
        .expect(200);

    const messages = response.body?.messages || [];
    if (messages.length === 0) {
        throw new Error('No messages found to test embeddings');
    }

    console.log(`Found ${messages.length} messages to embed`);

    // Generate embeddings
    const embeddingResponse = await request
        .post('/api/rag/embeddings')
        .set('Authorization', `Bearer ${token}`)
        .send({ messages })
        .expect(200);

    const messagesWithEmbeddings = embeddingResponse.body?.messages || [];
    console.log(`Generated embeddings for ${messagesWithEmbeddings.length} messages`);

    // Verify embeddings
    messagesWithEmbeddings.forEach((msg, index) => {
        console.log(`\nVerifying embedding for message ${index + 1}:`);
        
        // Verify embedding array exists and has correct format
        if (!msg.embedding || !Array.isArray(msg.embedding)) {
            throw new Error(`Message ${index + 1} is missing embedding array`);
        }

        // OpenAI text-embedding-3-large produces 3072-dimensional vectors
        if (msg.embedding.length !== 3072) {
            throw new Error(`Message ${index + 1} has incorrect embedding dimensions: ${msg.embedding.length}`);
        }

        // Check if embedding values are valid numbers
        const hasInvalidValues = msg.embedding.some(value => 
            typeof value !== 'number' || isNaN(value)
        );
        if (hasInvalidValues) {
            throw new Error(`Message ${index + 1} has invalid embedding values`);
        }

        // Verify all original message properties are preserved
        if (!msg.id) {
            throw new Error(`Message ${index + 1} is missing id`);
        }
        if (!msg.content) {
            throw new Error(`Message ${index + 1} is missing content`);
        }
        if (!msg.metadata) {
            throw new Error(`Message ${index + 1} is missing metadata`);
        }

        // Verify specific metadata fields
        const requiredMetadataFields = ['sender_id', 'sender_username', 'created_at', 'type'];
        for (const field of requiredMetadataFields) {
            if (!(field in msg.metadata)) {
                throw new Error(`Message ${index + 1} is missing metadata field: ${field}`);
            }
        }

        console.log('- Embedding verification passed');
        console.log('- Dimensions:', msg.embedding.length);
        console.log('- First few values:', msg.embedding.slice(0, 3));
        console.log('- Metadata preserved:', Object.keys(msg.metadata).join(', '));
    });

    console.log('\nEmbedding generation test completed successfully');
}

async function testVectorStoreConnection(token) {
    console.log('\nTesting vector store connection...');
    
    // Test connection status
    const statusResponse = await axios.get(`${API_URL}/rag/vectorstore/status`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Vector store status:', statusResponse.data);
    if (!statusResponse.data.isConnected) {
        throw new Error('Vector store connection failed');
    }

    // Test index configuration
    const indexResponse = await axios.get(`${API_URL}/rag/vectorstore/index`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Vector store index info:', indexResponse.data);
    
    const indexInfo = indexResponse.data;
    if (!indexInfo.name || indexInfo.name !== (process.env.PINECONE_INDEX || 'chatgenius-rag-index')) {
        throw new Error('Incorrect index name');
    }
    if (!indexInfo.dimension || indexInfo.dimension !== 3072) {
        throw new Error('Incorrect vector dimension');
    }
    if (!indexInfo.metric || indexInfo.metric !== 'cosine') {
        throw new Error('Incorrect similarity metric');
    }

    // Test vector store stats
    const statsResponse = await axios.get(`${API_URL}/rag/vectorstore/stats`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Vector store stats:', statsResponse.data);
    
    const stats = statsResponse.data;
    if (typeof stats.vectorCount !== 'number' || stats.vectorCount < 0) {
        throw new Error('Invalid vector count in stats');
    }

    console.log('Vector store connection test passed!');
}

async function testVectorUpsert(token) {
    console.log('\nTesting vector upserting...');
    
    // First get some messages to embed and upsert
    const response = await request
        .get('/api/rag/messages')
        .set('Authorization', `Bearer ${token}`)
        .query({ offset: 0, limit: 3 })
        .expect(200);

    const messages = response.body?.messages || [];
    if (messages.length === 0) {
        throw new Error('No messages found to test upserting');
    }

    console.log(`Found ${messages.length} messages to upsert`);

    // Upsert vectors
    const upsertResponse = await request
        .post('/api/rag/vectorstore/upsert')
        .set('Authorization', `Bearer ${token}`)
        .send({ messages })
        .expect(200);

    console.log('Upsert response:', upsertResponse.body);

    if (!upsertResponse.body.success) {
        throw new Error('Vector upsert failed');
    }

    // Verify the upsert count matches
    if (upsertResponse.body.upsertedCount !== messages.length) {
        throw new Error(`Upsert count mismatch: expected ${messages.length}, got ${upsertResponse.body.upsertedCount}`);
    }

    // Wait for upsert to complete (serverless indexes take longer)
    console.log('Waiting for upsert to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Verify by fetching one of the vectors
    const firstMessageId = messages[0].id;
    console.log(`Verifying upsert by fetching vector with ID: ${firstMessageId}`);
    
    const fetchResponse = await request
        .get(`/api/rag/vectorstore/vectors/${firstMessageId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

    if (!fetchResponse.body.success || !fetchResponse.body.vector) {
        throw new Error('Failed to fetch upserted vector');
    }

    // Verify vector has correct dimensions and metadata
    const vector = fetchResponse.body.vector;
    if (!vector.values || vector.values.length !== 3072) {
        throw new Error(`Invalid vector dimensions: ${vector.values?.length}`);
    }
    if (!vector.metadata || !vector.metadata.content) {
        throw new Error('Vector missing metadata');
    }

    console.log('Vector upsert test passed!');
}

async function testRandomVectorQuery(token) {
    console.log('Testing random vector query...');
    
    const response = await request
        .get('/api/rag/vectorstore/vectors/random')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

    if (!response.body.success) {
        throw new Error('Failed to query random vectors');
    }

    const vectors = response.body.vectors;
    if (!vectors || vectors.length === 0) {
        throw new Error('No vectors returned from random query');
    }

    // Verify each vector has the required fields
    vectors.forEach((vector, index) => {
        if (!vector.id) {
            throw new Error(`Vector ${index} missing ID`);
        }
        if (!vector.values || vector.values.length !== 3072) {
            throw new Error(`Vector ${index} has invalid dimensions: ${vector.values?.length}`);
        }
        if (!vector.metadata || !vector.metadata.content) {
            throw new Error(`Vector ${index} missing metadata`);
        }
    });

    console.log('Random vector query test passed!');
}

async function testVectorContentMatches(token) {
    console.log('\nTesting vector content matches...');
    try {
        // Wait for vectors to be fully indexed before starting verification
        console.log('Waiting for vectors to be fully indexed (5s)...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // First get the original messages we upserted
        const response = await request
            .get('/api/rag/messages')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        
        // Extract messages from the response
        if (!response.body?.success || !Array.isArray(response.body?.messages)) {
            console.error('Unexpected messages response format:', JSON.stringify(response.body, null, 2));
            throw new Error('Messages response is not in the expected format');
        }
        
        const originalMessages = response.body.messages;
        console.log(`Found ${originalMessages.length} original messages`);

        // Now get random vectors with retries
        let vectorResponse;
        let retryCount = 0;
        const maxRetries = 5;

        while (retryCount < maxRetries) {
            vectorResponse = await request
                .get('/api/rag/vectorstore/vectors/random?count=10')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            if (vectorResponse.body.success && vectorResponse.body.vectors?.length > 0) {
                break;
            }
            retryCount++;
            // Exponential backoff: 2s, 4s, 6s, 8s, 10s
            const delay = 2000 * retryCount;
            console.log(`No vectors found on attempt ${retryCount}, waiting ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        if (!vectorResponse.body.success) {
            throw new Error('Failed to get random vectors after multiple attempts');
        }

        const vectors = vectorResponse.body.vectors;
        console.log(`Retrieved ${vectors.length} random vectors`);

        // Log sample data to help debug matching issues
        console.log('Sample original message:', JSON.stringify(originalMessages[0], null, 2));
        console.log('Sample vector metadata:', JSON.stringify(vectors[0].metadata, null, 2));

        // Verify each vector has the expected fields and content
        for (const vector of vectors) {
            if (!vector.id || !vector.values || !vector.metadata || !vector.metadata.content) {
                throw new Error('Vector missing required fields');
            }

            // Verify vector dimensions
            if (vector.values.length !== 3072) {
                throw new Error(`Vector has wrong dimension: ${vector.values.length}`);
            }

            // Verify content exists in original messages
            const matchingMessage = originalMessages.find(msg => {
                // Try different ways to match the content
                const contentMatch = msg.content === vector.metadata.content;
                const idMatch = msg.id === vector.id;
                const originalIdMatch = msg.id === vector.metadata.original_message_id;
                
                // Log debug info if no match is found
                if (!contentMatch && !idMatch && !originalIdMatch) {
                    console.log('No match found for vector:', {
                        vectorId: vector.id,
                        vectorContent: vector.metadata.content?.substring(0, 50) + '...',
                        messageId: msg.id,
                        messageContent: msg.content?.substring(0, 50) + '...'
                    });
                }
                
                return contentMatch || idMatch || originalIdMatch;
            });

            if (!matchingMessage) {
                throw new Error(`Vector content not found in original messages: ${vector.id}`);
            }
        }

        console.log('Vector content test passed!');
    } catch (error) {
        console.error('Vector content test failed:', error);
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
        
        await testMessageChunking(token);
        console.log('Message chunking test completed');

        await testEmbeddingGeneration(token);
        console.log('Embedding generation test completed');

        await testVectorStoreConnection(token);
        console.log('Vector store connection test completed');

        await testVectorUpsert(token);
        console.log('Vector upsert test completed');

        await testRandomVectorQuery(token);
        console.log('Random vector query test completed');

        await testVectorContentMatches(token);
        console.log('Vector content test completed');
        
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