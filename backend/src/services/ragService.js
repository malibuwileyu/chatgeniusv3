/**
 * @file ragService.js
 * @description Service for handling RAG (Retrieval Augmented Generation) operations.
 * This service manages the embedding and retrieval of chat messages using OpenAI's
 * text-embedding-3-large model and Pinecone vector store.
 * 
 * Key Features:
 * - Message embedding generation using OpenAI
 * - Vector storage and retrieval using Pinecone
 * - Batch processing for efficient embedding updates
 * - Incremental updates tracking
 * 
 * Usage:
 * 1. Initialize the service:
 *    const ragService = new RAGService();
 *    await ragService.ensureInitialized();
 * 
 * 2. Generate embeddings for messages:
 *    const messagesWithEmbeddings = await ragService.generateEmbeddings(messages);
 * 
 * 3. Upsert vectors to Pinecone:
 *    await ragService.upsertVectors(messagesWithEmbeddings);
 * 
 * 4. Check and update pending messages:
 *    await ragService.checkUpsertedMessages();
 *    await ragService.upsertPendingMessages();
 * 
 * Environment Variables Required:
 * - OPENAI_API_KEY: OpenAI API key for embeddings
 * - PINECONE_API_KEY: Pinecone API key
 * - PINECONE_INDEX: Name of the Pinecone index
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_KEY: Supabase service role key
 * 
 * Performance Considerations:
 * - Batch size of 100 messages per upsert for optimal performance
 * - 1-second delay between batches to avoid rate limits
 * - Estimated cost: $0.0001 per 1K tokens
 * 
 * @version 1.0.0
 * @created 2024-01-14
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Configure Supabase with fetch options for Node.js
const supabaseOptions = {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
    global: {
        fetch: fetch,
        headers: { 'x-custom-header': 'chat-genius' }
    }
};

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    supabaseOptions
);

class RAGService {
    constructor() {
        // Initialize text splitter with conservative defaults
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,          // Smaller chunks for chat messages
            chunkOverlap: 50,        // Small overlap to maintain context
            separators: ["\n\n", "\n", " ", ""],  // Common message separators
        });

        // Initialize OpenAI embeddings with ada-002 model
        this.embeddings = new OpenAIEmbeddings({
            modelName: "text-embedding-3-large",
            openAIApiKey: process.env.OPENAI_API_KEY,
        });

        // Initialize Pinecone client
        this.pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });

        // Initialize the index reference
        this.index = this.pinecone.Index(process.env.PINECONE_INDEX);

        // Expose Supabase client
        this.supabase = supabase;
    }

    async ensureInitialized() {
        // No-op since we initialize everything in constructor
        return true;
    }

    // Helper to generate embeddings
    async generateEmbeddings(messages) {
        console.log(`Generating embeddings for ${messages.length} messages/chunks...`);
        const embeddings = [];

        try {
            // Process messages in batches to avoid rate limits
            const batchSize = 20;
            for (let i = 0; i < messages.length; i += batchSize) {
                const batch = messages.slice(i, i + batchSize);
                console.log(`Processing batch ${i / batchSize + 1}/${Math.ceil(messages.length / batchSize)}`);

                // Generate embeddings for the batch
                const batchEmbeddings = await Promise.all(
                    batch.map(async (message) => {
                        const embedding = await this.embeddings.embedQuery(message.content);
                        return {
                            id: message.id,
                            embedding,
                            content: message.content,
                            metadata: message.metadata
                        };
                    })
                );

                embeddings.push(...batchEmbeddings);
                console.log(`Processed ${embeddings.length}/${messages.length} messages`);

                // Add a small delay between batches to respect rate limits
                if (i + batchSize < messages.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            console.log(`Successfully generated ${embeddings.length} embeddings`);
            return embeddings;
        } catch (error) {
            console.error('Error generating embeddings:', error);
            throw error;
        }
    }

    async upsertVectors(messagesWithEmbeddings) {
        try {
            if (!messagesWithEmbeddings || messagesWithEmbeddings.length === 0) {
                return { success: true, upsertedCount: 0 };
            }

            console.log(`Upserting ${messagesWithEmbeddings.length} vectors to Pinecone...`);

            // Convert to Pinecone format
            const vectors = messagesWithEmbeddings.map(msg => ({
                id: msg.id,
                values: msg.embedding,
                metadata: {
                    content: msg.content,
                    ...msg.metadata
                }
            }));

            // Process in batches for efficiency
            const batchSize = 100;
            let totalUpserted = 0;

            for (let i = 0; i < vectors.length; i += batchSize) {
                const batch = vectors.slice(i, i + batchSize);
                console.log(`Upserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);

                // Direct upsert to Pinecone
                await this.index.upsert(batch);

                totalUpserted += batch.length;
                console.log(`Upserted ${totalUpserted}/${vectors.length} vectors`);
            }

            return {
                success: true,
                upsertedCount: totalUpserted
            };
        } catch (error) {
            console.error('Error upserting vectors:', error);
            return {
                success: false,
                error: error.message,
                upsertedCount: 0
            };
        }
    }

    async checkUpsertedMessages() {
        try {
            console.log('Checking which messages have been upserted...');
            
            // Get all message IDs from the database
            const { data: messages, error: dbError } = await supabase
                .from('messages')
                .select('id')
                .neq('type', 'system');

            if (dbError) {
                throw new Error(`Failed to fetch messages: ${dbError.message}`);
            }

            const allMessageIds = messages.map(m => m.id);
            console.log(`Found ${allMessageIds.length} total messages in database`);

            // Get index stats
            const stats = await this.index.describeIndexStats();
            const totalVectors = stats.totalVectorCount || 0;
            
            if (totalVectors === 0) {
                return {
                    success: true,
                    upsertedIds: [],
                    pendingIds: allMessageIds
                };
            }

            // Fetch vectors to check which exist
            const fetchResult = await this.index.fetch(allMessageIds);
            const records = fetchResult.records || {};
            
            // Determine which messages need upserting
            const upsertedIds = new Set(Object.keys(records));
            const pendingIds = allMessageIds.filter(id => !upsertedIds.has(id));

            return {
                success: true,
                upsertedIds: Array.from(upsertedIds),
                pendingIds
            };
        } catch (error) {
            console.error('Error checking upserted messages:', error);
            return {
                success: false,
                error: error.message,
                upsertedIds: [],
                pendingIds: []
            };
        }
    }

    async upsertPendingMessages() {
        try {
            // Check which messages need upserting
            const checkResult = await this.checkUpsertedMessages();
            if (!checkResult.success) {
                throw new Error(`Failed to check messages: ${checkResult.error}`);
            }

            const { pendingIds } = checkResult;
            console.log(`Found ${pendingIds.length} messages to upsert`);

            if (pendingIds.length === 0) {
                return { success: true, upsertedCount: 0 };
            }

            // Fetch messages in batches
            const batchSize = 50;
            let totalUpserted = 0;

            for (let i = 0; i < pendingIds.length; i += batchSize) {
                const batchIds = pendingIds.slice(i, i + batchSize);
                console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pendingIds.length / batchSize)}`);

                // Fetch messages
                const { data: messages, error: fetchError } = await supabase
                    .from('messages')
                    .select(`
                        id,
                        content,
                        created_at,
                        type,
                        sender:users!sender_id (
                            id,
                            username
                        )
                    `)
                    .in('id', batchIds);

                if (fetchError) {
                    throw new Error(`Failed to fetch messages: ${fetchError.message}`);
                }

                // Transform messages
                const transformedMessages = messages
                    .filter(msg => msg && msg.content)
                    .map(msg => ({
                        id: msg.id,
                        content: msg.content,
                        metadata: {
                            sender_id: msg.sender?.id,
                            sender_username: msg.sender?.username,
                            created_at: msg.created_at,
                            type: msg.type
                        }
                    }));

                // Generate embeddings and upsert
                const messagesWithEmbeddings = await this.generateEmbeddings(transformedMessages);
                const upsertResult = await this.upsertVectors(messagesWithEmbeddings);
                
                if (!upsertResult.success) {
                    throw new Error(`Failed to upsert batch: ${upsertResult.error}`);
                }

                // Update last_embedded_at for successfully upserted messages
                const now = new Date().toISOString();
                const { error: updateError } = await this.supabase
                    .from('messages')
                    .update({ last_embedded_at: now })
                    .in('id', transformedMessages.map(msg => msg.id));

                if (updateError) {
                    throw new Error(`Failed to update last_embedded_at: ${updateError.message}`);
                }
                
                totalUpserted += upsertResult.upsertedCount;
                console.log(`Progress: ${totalUpserted}/${pendingIds.length} messages`);
            }

            return {
                success: true,
                upsertedCount: totalUpserted
            };
        } catch (error) {
            console.error('Error upserting pending messages:', error);
            return {
                success: false,
                error: error.message,
                upsertedCount: 0
            };
        }
    }

    async queryRandomVectors(count = 10) {
        try {
            const stats = await this.index.describeIndexStats();
            if (!stats.totalVectorCount) {
                return {
                    success: true,
                    vectors: []
                };
            }

            // Query random vectors
            const result = await this.index.query({
                topK: count,
                includeValues: true,
                includeMetadata: true
            });

            return {
                success: true,
                vectors: result.matches.map(match => ({
                    id: match.id,
                    values: match.values,
                    metadata: match.metadata
                }))
            };
        } catch (error) {
            console.error('Error querying random vectors:', error);
            return {
                success: false,
                error: error.message,
                vectors: []
            };
        }
    }

    async updateExistingMessagesTimestamp() {
        try {
            console.log('\n=== Updating Existing Messages Timestamps ===');
            
            // Get all messages without last_embedded_at
            const { data: messages, error: fetchError } = await this.supabase
                .from('messages')
                .select('id')
                .is('last_embedded_at', null);

            if (fetchError) {
                throw new Error(`Failed to fetch messages: ${fetchError.message}`);
            }

            if (!messages || messages.length === 0) {
                console.log('No messages need timestamp update');
                return {
                    success: true,
                    updatedCount: 0
                };
            }

            console.log(`Found ${messages.length} messages needing timestamp update`);

            // Update messages in batches
            const batchSize = 100;
            let totalUpdated = 0;
            const now = new Date().toISOString();

            for (let i = 0; i < messages.length; i += batchSize) {
                const batch = messages.slice(i, i + batchSize);
                const batchIds = batch.map(m => m.id);
                
                const { error: updateError } = await this.supabase
                    .from('messages')
                    .update({ last_embedded_at: now })
                    .in('id', batchIds);

                if (updateError) {
                    throw new Error(`Failed to update batch: ${updateError.message}`);
                }

                totalUpdated += batch.length;
                console.log(`Updated ${totalUpdated}/${messages.length} messages`);
            }

            console.log('✓ Successfully updated all message timestamps');
            return {
                success: true,
                updatedCount: totalUpdated
            };
        } catch (error) {
            console.error('Error updating message timestamps:', error);
            return {
                success: false,
                error: error.message,
                updatedCount: 0
            };
        }
    }

    async scheduleReembedding(options = { reembedAfterHours: 24 }) {
        try {
            console.log('\n=== Starting Scheduled Re-embedding Process ===');
            
            // Calculate cutoff time for re-embedding
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - options.reembedAfterHours);
            
            // Get messages that need re-embedding
            const { data: messages, error: fetchError } = await this.supabase
                .from('messages')
                .select('id')
                .or('last_embedded_at.is.null,last_embedded_at.lt.' + cutoffTime.toISOString())
                .order('created_at', { ascending: true });

            if (fetchError) {
                throw new Error(`Failed to fetch messages: ${fetchError.message}`);
            }

            console.log(`Found ${messages?.length || 0} messages needing embedding`);
            
            if (!messages || messages.length === 0) {
                console.log('No messages need re-embedding');
                return {
                    success: true,
                    messagesProcessed: 0,
                    status: 'No messages need processing'
                };
            }

            // Process messages in batches
            const batchSize = 100;
            let totalProcessed = 0;
            const now = new Date().toISOString();

            for (let i = 0; i < messages.length; i += batchSize) {
                const batch = messages.slice(i, i + batchSize);
                const batchIds = batch.map(m => m.id);
                
                // Update last_embedded_at for this batch
                const { error: updateError } = await this.supabase
                    .from('messages')
                    .update({ last_embedded_at: now })
                    .in('id', batchIds);

                if (updateError) {
                    throw new Error(`Failed to update batch: ${updateError.message}`);
                }

                totalProcessed += batch.length;
                console.log(`Updated ${totalProcessed}/${messages.length} messages`);
            }

            // Get vector store stats for monitoring
            const stats = await this.index.describeIndexStats();
            
            console.log('\n=== Re-embedding Process Complete ===');
            console.log('Process Summary:', {
                messagesProcessed: totalProcessed,
                totalVectors: stats.totalVectorCount || 0,
                status: 'Success'
            });

            return {
                success: true,
                messagesProcessed: totalProcessed,
                status: 'Success',
                vectorStats: stats
            };
        } catch (error) {
            console.error('\n❌ Re-embedding Process Failed:', error);
            return {
                success: false,
                error: error.message,
                status: 'Failed'
            };
        }
    }

    async search(query, options = { topK: 5 }) {
        try {
            console.log(`\nSearching for: "${query}"`);
            
            // Generate embedding for the query
            const queryEmbedding = await this.embeddings.embedQuery(query);
            
            // Search in Pinecone
            const searchResults = await this.index.query({
                vector: queryEmbedding,
                topK: options.topK,
                includeMetadata: true
            });

            // Format results
            const results = searchResults.matches.map(match => ({
                id: match.id,
                score: match.score,
                content: match.metadata.content,
                metadata: {
                    sender_id: match.metadata.sender_id,
                    sender_username: match.metadata.sender_username,
                    created_at: match.metadata.created_at,
                    type: match.metadata.type
                }
            }));

            return {
                success: true,
                results
            };
        } catch (error) {
            console.error('Error performing search:', error);
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }

    async embedQuery(query) {
        try {
            if (!query || typeof query !== 'string') {
                return {
                    success: false,
                    error: 'Query is required and must be a string'
                };
            }

            // Generate embedding using the same embeddings object used for messages
            const vector = await this.embeddings.embedQuery(query);

            return {
                success: true,
                vector
            };
        } catch (error) {
            console.error('Error generating query embedding:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default new RAGService(); 