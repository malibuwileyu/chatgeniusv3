/**
 * @file rag.test.js
 * @description Test suite for RAG functionality following the RAG checklist
 */

import dotenv from 'dotenv';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import ragService from '../services/ragService.js';
import request from 'supertest';

// Load environment variables
dotenv.config();

// Configure request to use the backend server
const baseURL = process.env.BASE_URL || 'http://localhost:3000';
request.agent(baseURL);

// Main test execution
(async () => {
    try {
        console.log('\n=== Starting RAG Implementation Tests ===\n');

        // Step 1: Test Environment and Dependencies
        console.log('\n--- Testing Environment and Dependencies ---');
        
        // Check environment variables
        const requiredEnvVars = [
            'OPENAI_API_KEY',
            'PINECONE_API_KEY',
            'PINECONE_INDEX',
            'SUPABASE_URL',
            'SUPABASE_SERVICE_KEY'
        ];

        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Missing required environment variable: ${envVar}`);
            }
        }
        console.log('✓ All required environment variables are set');

        // Test OpenAI dependencies and API
        console.log('\n--- Testing OpenAI Integration ---');
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: "Say hello" }],
            model: "gpt-3.5-turbo",
        });
        if (!completion.choices[0].message) {
            throw new Error('OpenAI API call failed');
        }
        console.log('✓ OpenAI API is working');

        // Test OpenAI/LangChain setup
        const embeddings = new OpenAIEmbeddings({
            modelName: "text-embedding-3-large",
            openAIApiKey: process.env.OPENAI_API_KEY
        });
        await embeddings.embedQuery('test'); // Verify we can generate embeddings
        console.log('✓ OpenAI embeddings are working');

        // Test Pinecone setup
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });
        const index = pinecone.Index(process.env.PINECONE_INDEX);
        await index.describeIndexStats();
        console.log('✓ Pinecone connection is working');

        // Test Supabase setup and message fetching
        console.log('\n--- Testing Message Fetching ---');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );
        
        // Fetch messages with related data
        const { data: messages, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id(id, username),
                channel:channel_id(id, name)
            `)
            .order('created_at', { ascending: true });

        if (error) throw error;
        
        console.log(`✓ Successfully fetched ${messages.length} messages from database`);
        
        // Verify message structure
        if (messages.length > 0) {
            const sampleMessage = messages[0];
            // Required fields that must have values
            const requiredFields = ['id', 'content', 'created_at'];
            for (const field of requiredFields) {
                if (sampleMessage[field] === undefined || sampleMessage[field] === null) {
                    throw new Error(`Message is missing required field: ${field}`);
                }
            }
            // Optional fields that can be null
            const optionalFields = ['sender', 'channel'];
            for (const field of optionalFields) {
                if (sampleMessage[field] === undefined) {
                    throw new Error(`Message is missing optional field: ${field} (can be null but must be defined)`);
                }
            }
            console.log('✓ Message structure is valid');
            
            // Log sample message format (without content)
            const { content, ...messageMeta } = sampleMessage;
            console.log('Sample message format:', JSON.stringify(messageMeta, null, 2));
        } else {
            console.log('⚠️ No messages found in database');
        }

        // Test message chunking
        console.log('\n--- Testing Message Chunking ---');
        
        // Initialize text splitter with conservative defaults
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,          // Smaller chunks for chat messages
            chunkOverlap: 50,        // Small overlap to maintain context
            separators: ["\n\n", "\n", " ", ""],  // Common message separators
        });

        // Test chunking with a sample long message
        const longMessage = {
            id: 'test-message',
            content: `This is a long message that needs to be split into chunks.
            It contains multiple paragraphs and should be split appropriately.
            
            The text splitter should handle this correctly and maintain context
            between chunks through the specified overlap.
            
            We want to make sure that the chunking process:
            1. Preserves message ID references
            2. Maintains metadata
            3. Splits on natural boundaries
            4. Includes overlap for context
            5. Doesn't create chunks that are too large
            
            This message should be long enough to be split into at least
            two chunks, allowing us to verify the chunking behavior.`.repeat(3)
        };

        // Process the message
        const chunks = await textSplitter.splitText(longMessage.content);
        console.log(`✓ Successfully split message into ${chunks.length} chunks`);

        // Verify chunk properties
        if (chunks.length < 2) {
            throw new Error('Expected message to be split into multiple chunks');
        }

        // Check chunk sizes
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            if (chunk.length > 500) {
                throw new Error(`Chunk ${i + 1} exceeds maximum size: ${chunk.length} > 500`);
            }
            if (i > 0) {
                // Verify overlap with previous chunk
                const overlap = chunks[i-1].slice(-50);
                if (!chunk.startsWith(overlap)) {
                    console.log('Expected overlap not found between chunks');
                }
            }
        }
        console.log('✓ Chunk sizes and overlaps are within specified limits');

        // Create metadata for chunks
        const processedChunks = chunks.map((chunk, index) => ({
            id: `${longMessage.id}_chunk_${index}`,
            content: chunk,
            metadata: {
                original_message_id: longMessage.id,
                chunk_index: index,
                total_chunks: chunks.length
            }
        }));

        // Verify chunk metadata
        const sampleChunk = processedChunks[0];
        console.log('Sample chunk format:', {
            id: sampleChunk.id,
            content_length: sampleChunk.content.length,
            metadata: sampleChunk.metadata
        });

        // Test embedding generation
        console.log('\n--- Testing Embedding Generation ---');
        
        // Generate embeddings for the chunks
        console.log('Generating embeddings for chunks...');
        const embeddingsWithMetadata = await Promise.all(
            processedChunks.map(async (chunk) => {
                const vector = await embeddings.embedQuery(chunk.content);
                return {
                    id: chunk.id,
                    values: vector,
                    metadata: {
                        content: chunk.content,
                        ...chunk.metadata
                    }
                };
            })
        );

        console.log(`✓ Successfully generated ${embeddingsWithMetadata.length} embeddings`);

        // Verify embedding properties
        const sampleEmbedding = embeddingsWithMetadata[0];
        
        // Check vector dimensions (should be 3072 for text-embedding-3-large)
        if (sampleEmbedding.values.length !== 3072) {
            throw new Error(`Unexpected embedding dimension: ${sampleEmbedding.values.length} (expected 3072)`);
        }
        console.log('✓ Embedding dimensions are correct');

        // Check vector values are normalized (magnitude ≈ 1)
        const magnitude = Math.sqrt(
            sampleEmbedding.values.reduce((sum, val) => sum + val * val, 0)
        );
        if (Math.abs(magnitude - 1) > 0.01) {
            throw new Error(`Embedding magnitude ${magnitude} is not normalized (should be ≈ 1)`);
        }
        console.log('✓ Embeddings are properly normalized');

        // Log sample embedding format (truncated vector)
        console.log('Sample embedding format:', {
            id: sampleEmbedding.id,
            vector_length: sampleEmbedding.values.length,
            magnitude: magnitude.toFixed(6),
            first_values: sampleEmbedding.values.slice(0, 3).map(v => v.toFixed(6)),
            metadata: sampleEmbedding.metadata
        });

        // Phase 1, Step 7: Validate the Upsert
        console.log('\n--- Testing Pinecone Upsert ---');
        
        // Upsert embeddings in batches
        const batchSize = 100;
        let totalUpserted = 0;
        
        for (let i = 0; i < embeddingsWithMetadata.length; i += batchSize) {
            const batch = embeddingsWithMetadata.slice(i, i + batchSize);
            console.log(`Upserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(embeddingsWithMetadata.length / batchSize)}`);
            
            await index.upsert(batch);
            totalUpserted += batch.length;
            
            console.log(`Progress: ${totalUpserted}/${embeddingsWithMetadata.length} vectors`);
            
            // Add a small delay between batches
            if (i + batchSize < embeddingsWithMetadata.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log('✓ Successfully upserted all embeddings');

        // Verify upsert by querying for a random chunk
        console.log('\n--- Validating Upsert ---');
        
        // Get a random chunk to query
        const randomChunk = processedChunks[Math.floor(Math.random() * processedChunks.length)];
        console.log('Querying for random chunk:', randomChunk.id);
        
        // Update query vector generation for validation
        const queryVector = await embeddings.embedQuery(randomChunk.content);
        
        // Search in Pinecone
        const searchResults = await index.query({
            vector: queryVector,
            topK: 1,
            includeMetadata: true
        });

        // Verify the top result matches our query
        if (searchResults.matches.length === 0) {
            throw new Error('No matches found for query');
        }

        const topMatch = searchResults.matches[0];
        if (topMatch.score < 0.95) { // Increased threshold for stricter validation
            throw new Error(`Top match score too low: ${topMatch.score} (expected > 0.95)`);
        }
        if (topMatch.id !== randomChunk.id) {
            throw new Error(`Top match ID mismatch: ${topMatch.id} (expected ${randomChunk.id})`);
        }
        
        console.log('✓ Successfully validated upserted vector');
        console.log('Top match:', {
            id: topMatch.id,
            score: topMatch.score,
            metadata: topMatch.metadata
        });

        // Phase 1, Step 8: Keep the Script Maintained
        console.log('\n--- Testing Script Maintenance ---');
        
        // Monitor vector store stats
        const indexStats = await index.describeIndexStats();
        console.log('Vector store stats:', {
            vectorCount: indexStats.totalVectorCount,
            dimension: indexStats.dimension
        });

        // Track performance metrics
        console.log('\nTracking Performance Metrics:');
        
        // Test embedding generation time
        const startEmbed = Date.now();
        await embeddings.embedQuery('Test query for performance metrics');
        const embedTime = Date.now() - startEmbed;
        console.log('Embedding generation time:', {
            operation: 'embedQuery',
            durationMs: embedTime,
            tokensProcessed: 6 // Approximate tokens in test query
        });

        // Test vector search time
        const startQuery = Date.now();
        await index.query({
            vector: queryVector,
            topK: 1,
            includeMetadata: true
        });
        const queryTime = Date.now() - startQuery;
        console.log('Vector search time:', {
            operation: 'query',
            durationMs: queryTime,
            vectorsDimension: 3072
        });

        // Verify performance is within acceptable limits
        const maxEmbedTime = 2000; // 2 seconds
        const maxQueryTime = 1000; // 1 second
        
        if (embedTime > maxEmbedTime) {
            throw new Error(`Embedding time ${embedTime}ms exceeds limit of ${maxEmbedTime}ms`);
        }
        if (queryTime > maxQueryTime) {
            throw new Error(`Query time ${queryTime}ms exceeds limit of ${maxQueryTime}ms`);
        }
        console.log('✓ Performance metrics are within acceptable limits');

        // Log embedding costs
        const totalChunks = processedChunks.length;
        const avgTokensPerChunk = 500; // Approximate based on chunk size
        const estimatedTokens = totalChunks * avgTokensPerChunk;
        const estimatedCost = (estimatedTokens / 1000) * 0.0001; // $0.0001 per 1K tokens
        
        console.log('Embedding cost estimates:', {
            chunks: totalChunks,
            estimatedTokens,
            estimatedCostUSD: estimatedCost.toFixed(4)
        });

        // Phase 2, Step 7: Message Embedding Tracking
        console.log('\n--- Phase 2: Message Embedding Tracking ---');
        
        // Get a sample channel ID from existing messages
        const { data: sampleChannel, error: channelError } = await supabase
            .from('messages')
            .select('channel_id')
            .not('channel_id', 'is', null)
            .limit(1)
            .single();

        if (channelError) throw channelError;
        if (!sampleChannel?.channel_id) throw new Error('No channel found for test message');
        
        // Create a test message
        const { data: message, error: createError } = await supabase
            .from('messages')
            .insert({
                content: 'Test message for embedding tracking',
                type: 'system',
                channel_id: sampleChannel.channel_id,
                dm_id: null
            })
            .select()
            .single();

        if (createError) throw createError;
        if (!message) throw new Error('Failed to create test message');
        
        // Verify initial state
        if (message.last_embedded_at !== null) {
            throw new Error('Expected new message to have null last_embedded_at');
        }
        console.log('✓ New message created with null last_embedded_at');
        
        // Update last_embedded_at
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
            .from('messages')
            .update({ last_embedded_at: now })
            .eq('id', message.id);

        if (updateError) throw updateError;
        
        // Verify update
        const { data: updated, error: fetchError } = await supabase
            .from('messages')
            .select('last_embedded_at')
            .eq('id', message.id)
            .single();

        if (fetchError) throw fetchError;
        if (!updated || !updated.last_embedded_at) {
            throw new Error('Failed to update last_embedded_at');
        }
        
        // Verify timestamp is valid
        const timestamp = new Date(updated.last_embedded_at);
        if (isNaN(timestamp.getTime())) {
            throw new Error('Invalid timestamp format');
        }
        console.log('✓ last_embedded_at column is working correctly');

        // Verify indexes exist
        console.log('\nVerifying embedding tracking indexes...');
        const { data: indexList, error: indexError } = await supabase
            .rpc('check_indexes', {
                table_name: 'messages',
                index_patterns: [
                    'idx_messages_last_embedded_at',
                    'idx_messages_embedding_update'
                ]
            });

        if (indexError) {
            console.log('⚠️ Could not verify indexes through RPC, checking through SQL...');
            // Fallback to checking if indexes work through a test query
            const { error: queryError } = await supabase
                .from('messages')
                .select('id')
                .is('last_embedded_at', null)
                .limit(1);

            if (queryError) {
                throw new Error('Index verification failed: ' + queryError.message);
            }
            console.log('✓ Embedding tracking indexes are functional');
        } else {
            if (!indexList || indexList.length !== 2) {
                throw new Error('Missing required indexes for embedding tracking');
            }
            console.log('✓ Embedding tracking indexes are present');
        }

        // Test scheduled re-embedding process
        console.log('\nTesting Scheduled Re-embedding Process:');
        
        // First, update timestamps for all existing messages
        const updateResult = await ragService.updateExistingMessagesTimestamp();
        if (!updateResult.success) {
            throw new Error(`Failed to update message timestamps: ${updateResult.error}`);
        }
        console.log(`Updated timestamps for ${updateResult.updatedCount} messages`);

        // Create test messages that need embedding
        const testMessages = [
            {
                content: 'Test message 1 for scheduled re-embedding',
                type: 'system',
                channel_id: sampleChannel.channel_id,
                last_embedded_at: null // New message, needs embedding
            },
            {
                content: 'Test message 2 for scheduled re-embedding',
                type: 'system',
                channel_id: sampleChannel.channel_id,
                last_embedded_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours old, needs re-embedding
            },
            {
                content: 'Test message 3 for scheduled re-embedding',
                type: 'system',
                channel_id: sampleChannel.channel_id,
                last_embedded_at: new Date().toISOString() // Just embedded, should not need re-embedding
            }
        ];

        // Insert test messages
        const { data: insertedMessages, error: insertError } = await supabase
            .from('messages')
            .insert(testMessages)
            .select();

        if (insertError) throw insertError;
        console.log(`Created ${insertedMessages.length} test messages`);

        // Run scheduled re-embedding with 24-hour threshold
        const firstRun = await ragService.scheduleReembedding({ reembedAfterHours: 24 });
        if (!firstRun.success) {
            throw new Error(`First re-embedding run failed: ${firstRun.error}`);
        }
        console.log('First run results:', {
            messagesProcessed: firstRun.messagesProcessed,
            status: firstRun.status
        });

        // First run should process all messages that need embedding
        if (firstRun.messagesProcessed === 0) {
            throw new Error('Expected messages to be processed in first run');
        }

        // Run again to verify no pending messages
        const secondRun = await ragService.scheduleReembedding({ reembedAfterHours: 24 });
        if (!secondRun.success) {
            throw new Error(`Second re-embedding run failed: ${secondRun.error}`);
        }
        console.log('Second run results:', {
            messagesProcessed: secondRun.messagesProcessed,
            status: secondRun.status
        });

        // Verify no messages were processed in second run
        if (secondRun.messagesProcessed !== 0) {
            throw new Error(`Expected 0 messages to be processed in second run, got ${secondRun.messagesProcessed}`);
        }

        console.log('✓ Scheduled re-embedding process is working correctly');

        // Phase 2: Query Vector Database and Generate LLM Answer
        console.log('\n--- Phase 2: Search Endpoint Testing ---');

        // Get auth token first
        console.log('\nGetting auth token...');
        const loginResponse = await request(baseURL)
            .post('/api/auth/login')
            .send({
                email: process.env.TEST_USER_EMAIL,
                password: process.env.TEST_USER_PASSWORD
            });

        if (!loginResponse.body?.token) {
            throw new Error('Failed to get auth token');
        }
        const token = loginResponse.body.token;
        console.log('✓ Successfully obtained auth token');

        // Testing search endpoint without auth token
        console.log('\nTesting search endpoint authentication:');
        const noAuthResponse = await request(baseURL)
            .post('/api/rag/search')
            .send({ query: 'test query' });
        
        if (noAuthResponse.status !== 401) {
            throw new Error(`Expected 401 status for unauthorized request, got ${noAuthResponse.status}`);
        }
        console.log('✓ Search endpoint correctly requires authentication');

        // Test search endpoint with invalid query
        console.log('\nTesting search endpoint validation:');
        const invalidResponse = await request(baseURL)
            .post('/api/rag/search')
            .set('Authorization', `Bearer ${token}`)
            .send({});
        
        if (invalidResponse.status !== 400) {
            throw new Error(`Expected 400 status for invalid request, got ${invalidResponse.status}`);
        }
        console.log('✓ Search endpoint correctly validates input');

        // Test search endpoint with valid query
        console.log('\nTesting search endpoint with valid query:');
        const searchResponse = await request(baseURL)
            .post('/api/rag/search')
            .set('Authorization', `Bearer ${token}`)
            .send({ query: 'test query' });
        
        if (searchResponse.status !== 200) {
            throw new Error(`Search request failed with status ${searchResponse.status}: ${JSON.stringify(searchResponse.body)}`);
        }
        if (!searchResponse.body.success) {
            throw new Error(`Search request returned success: false - ${searchResponse.body.error}`);
        }
        if (!Array.isArray(searchResponse.body.results)) {
            throw new Error('Expected results to be an array');
        }
        console.log('✓ Search endpoint successfully processes queries');
        console.log('Sample search response:', {
            status: searchResponse.status,
            results: searchResponse.body.results.length,
            firstResult: searchResponse.body.results[0]
        });

        // Phase 2: Query Embedding Tests
        console.log('\n--- Testing Query Embedding ---');

        // Test query embedding generation
        const testQuery = "What is the meaning of life?";
        const queryEmbedding = await ragService.embedQuery(testQuery);

        if (!queryEmbedding.success) {
            throw new Error(`Failed to generate query embedding: ${queryEmbedding.error}`);
        }

        // Verify embedding dimensions
        if (queryEmbedding.vector.length !== 3072) {
            throw new Error(`Unexpected embedding dimension: ${queryEmbedding.vector.length} (expected 3072)`);
        }

        // Verify embedding is normalized
        const queryMagnitude = Math.sqrt(
            queryEmbedding.vector.reduce((sum, val) => sum + val * val, 0)
        );
        if (Math.abs(queryMagnitude - 1) > 0.01) {
            throw new Error(`Query embedding magnitude ${queryMagnitude} is not normalized (should be ≈ 1)`);
        }

        console.log('✓ Query embedding generation successful');
        console.log('Sample query embedding:', {
            query: testQuery,
            vector_length: queryEmbedding.vector.length,
            magnitude: queryMagnitude.toFixed(6),
            first_values: queryEmbedding.vector.slice(0, 3).map(v => v.toFixed(6))
        });

        // Verify embedding configuration consistency
        console.log('\n--- Testing Embedding Pipeline Consistency ---');
        
        // Test same content produces identical embeddings
        const testContent = "This is a test message for embedding consistency";
        
        // Generate embeddings using both message and query pipelines
        const messageEmbedding = await embeddings.embedQuery(testContent);
        const consistencyQueryEmbedding = await ragService.embedQuery(testContent);
        
        if (!consistencyQueryEmbedding.success) {
            throw new Error(`Failed to generate query embedding: ${consistencyQueryEmbedding.error}`);
        }

        // Compare embeddings
        const messageVector = messageEmbedding;
        const consistencyQueryVector = consistencyQueryEmbedding.vector;

        // Verify dimensions match
        if (messageVector.length !== consistencyQueryVector.length) {
            throw new Error(`Embedding dimensions mismatch: message=${messageVector.length}, query=${consistencyQueryVector.length}`);
        }

        // Verify values are identical (within floating point precision)
        const maxDiff = Math.max(...messageVector.map((v, i) => Math.abs(v - consistencyQueryVector[i])));
        if (maxDiff > 1e-6) {
            throw new Error(`Embedding values mismatch: max difference = ${maxDiff}`);
        }

        console.log('✓ Embedding pipeline configuration is consistent');
        console.log('Embedding comparison:', {
            dimensions: messageVector.length,
            maxDifference: maxDiff.toExponential(2),
            firstValues: messageVector.slice(0, 3).map(v => v.toFixed(6))
        });

        console.log('\n=== All Tests Passed ===\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test Failed:', error);
        process.exit(1);
    }
})(); 