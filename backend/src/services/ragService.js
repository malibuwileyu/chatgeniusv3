/**
 * @file ragService.js
 * @description Service for handling RAG (Retrieval Augmented Generation) operations
 */

import { supabase } from '../config/supabase.js';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';

class RAGService {
    constructor() {
        this.embeddingStatus = {
            isComplete: false,
            processedMessages: 0,
            totalMessages: 0,
            error: null
        };
        
        // Initialize text splitter with conservative settings
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
            separators: ["\n\n", "\n", " ", ""]
        });

        // Initialize OpenAI embeddings
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "text-embedding-3-large", // Latest model with 3072 dimensions for higher quality
            stripNewLines: true, // Clean up text for better embeddings
            batchSize: 512 // Process multiple texts in parallel for efficiency
        });

        // Initialize Pinecone client
        this.pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });

        // Initialize vector store asynchronously
        this.initPromise = this.initVectorStore().catch(error => {
            console.error('Error during vector store initialization:', error);
            throw error;
        });
    }

    /**
     * Ensure vector store is initialized
     */
    async ensureInitialized() {
        if (!this.vectorStore) {
            await this.initPromise;
        }
    }

    /**
     * Initialize the vector store connection
     */
    async initVectorStore() {
        try {
            const indexName = process.env.PINECONE_INDEX || 'chatgenius-rag-index';
            
            // Get list of indexes
            const { indexes } = await this.pinecone.listIndexes();
            const indexExists = indexes.some(index => index.name === indexName);
            
            if (!indexExists) {
                console.log(`Creating new index: ${indexName}`);
                await this.pinecone.createIndex({
                    name: indexName,
                    dimension: 3072, // text-embedding-3-large dimension
                    metric: 'cosine',
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-west-2'
                        }
                    }
                });
                // Wait for index to be ready
                await new Promise(resolve => setTimeout(resolve, 60000));
            }

            // Get the index instance
            this.index = this.pinecone.Index(indexName);

            // Initialize LangChain's vector store integration
            this.vectorStore = await PineconeStore.fromExistingIndex(
                this.embeddings,
                { pineconeIndex: this.index }
            );

            this.vectorStoreStatus = {
                isConnected: true,
                indexName,
                error: null
            };
        } catch (error) {
            console.error('Error initializing vector store:', error);
            this.vectorStoreStatus = {
                isConnected: false,
                error: error.message
            };
            throw error;
        }
    }

    /**
     * Get current vector store connection status
     * @returns {Object} Current status of the vector store connection
     */
    async getVectorStoreStatus() {
        if (!this.vectorStoreStatus) {
            await this.initVectorStore();
        }
        return this.vectorStoreStatus;
    }

    /**
     * Get vector store index information
     * @returns {Object} Index configuration and metadata
     */
    async getVectorStoreIndexInfo() {
        try {
            const indexName = process.env.PINECONE_INDEX || 'chatgenius';
            const indexDescription = await this.pinecone.describeIndex(indexName);
            
            return {
                name: indexName,
                dimension: indexDescription.dimension,
                metric: indexDescription.metric,
                podType: indexDescription.podType,
                indexConfig: indexDescription.configuration
            };
        } catch (error) {
            console.error('Error getting index info:', error);
            throw error;
        }
    }

    /**
     * Splits message content into chunks if needed
     * @param {Object} message Message object with content and metadata
     * @returns {Promise<Array>} Array of chunks with metadata
     */
    async chunkMessage(message) {
        if (!message.content || message.content.length < 1000) {
            // If content is short enough, return as single chunk
            return [{
                id: message.id,
                content: message.content,
                metadata: {
                    ...message.metadata,
                    chunk_index: 0,
                    total_chunks: 1,
                    original_message_id: message.id
                }
            }];
        }

        // Split longer content into chunks
        const chunks = await this.textSplitter.createDocuments(
            [message.content],
            [{
                ...message.metadata,
                original_message_id: message.id
            }]
        );

        // Add chunk indexing metadata
        return chunks.map((chunk, index) => ({
            id: `${message.id}_chunk_${index}`,
            content: chunk.pageContent,
            metadata: {
                ...chunk.metadata,
                chunk_index: index,
                total_chunks: chunks.length
            }
        }));
    }

    /**
     * Fetches messages from the database for embedding
     * @param {Object} options Options for fetching messages
     * @param {number} options.offset Offset for pagination
     * @param {number} options.limit Maximum number of messages to fetch
     * @returns {Promise<Array>} Array of messages with their metadata
     */
    async fetchMessagesForEmbedding(options = { offset: 0, limit: 100 }) {
        try {
            const { data: messages, error } = await supabase
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
                .neq('type', 'system')
                .order('created_at', { ascending: true })
                .range(options.offset, options.offset + options.limit - 1);

            if (error) {
                console.error('Error fetching messages:', error);
                throw error;
            }

            if (!messages || messages.length === 0) {
                return [];
            }

            // Transform and chunk messages
            const transformedMessages = messages
                .filter(msg => msg && msg.content && msg.sender)
                .map(msg => ({
                    id: msg.id,
                    content: msg.content,
                    metadata: {
                        sender_id: msg.sender.id,
                        sender_username: msg.sender.username,
                        created_at: msg.created_at,
                        type: msg.type
                    }
                }));

            // Process each message and chunk if needed
            const chunkedMessages = await Promise.all(
                transformedMessages.map(msg => this.chunkMessage(msg))
            );

            // Flatten the array of chunks
            return chunkedMessages.flat();
        } catch (error) {
            console.error('Error in fetchMessagesForEmbedding:', error);
            throw error;
        }
    }

    /**
     * Generate embeddings for a batch of messages
     * @param {Array} messages Array of message chunks to embed
     * @returns {Promise<Array>} Array of messages with their embeddings
     */
    async generateEmbeddings(messages) {
        try {
            if (!messages || messages.length === 0) {
                return [];
            }

            // Update status
            this.embeddingStatus = {
                isComplete: false,
                processedMessages: 0,
                totalMessages: messages.length,
                error: null
            };

            // Extract content for embedding
            const texts = messages.map(msg => msg.content);

            // Generate embeddings in batches
            const embeddings = await this.embeddings.embedDocuments(texts);

            // Combine embeddings with original messages
            const messagesWithEmbeddings = messages.map((msg, index) => ({
                ...msg,
                embedding: embeddings[index]
            }));

            // Update status
            this.embeddingStatus.processedMessages = messages.length;
            this.embeddingStatus.isComplete = true;

            return messagesWithEmbeddings;
        } catch (error) {
            // Update error status
            this.embeddingStatus.error = error.message;
            console.error('Error generating embeddings:', error);
            throw error;
        }
    }

    /**
     * Get current embedding process status
     * @returns {Object} Current status of the embedding process
     */
    getEmbeddingStatus() {
        return { ...this.embeddingStatus };
    }

    /**
     * Get vector store statistics
     * @returns {Promise<Object>} Vector store statistics
     */
    async getVectorStoreStats(maxRetries = 3) {
        try {
            await this.ensureInitialized();
            if (!this.index) {
                throw new Error('Vector store not initialized');
            }
            
            // Try multiple times to get stats, with increasing delays
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                const stats = await this.index.describeIndexStats();
                const vectorCount = stats.totalVectorCount || 0;
                
                if (vectorCount > 0) {
                    return {
                        success: true,
                        vectorCount,
                        dimensionCount: 3072,
                        indexFullness: 0
                    };
                }
                
                // If no vectors found and we have more retries, wait before trying again
                // Exponential backoff: 1s, 2s, 4s
                if (attempt < maxRetries - 1) {
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`No vectors found in stats on attempt ${attempt + 1}, waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
            // If we've exhausted all retries, return whatever the last stats were
            const finalStats = await this.index.describeIndexStats();
            return {
                success: true,
                vectorCount: finalStats.totalVectorCount || 0,
                dimensionCount: 3072,
                indexFullness: 0
            };
        } catch (error) {
            console.error('Error getting vector store stats:', error);
            throw error;
        }
    }

    /**
     * Upsert vectors into Pinecone
     * @param {Array} messagesWithEmbeddings Array of messages with their embeddings
     * @returns {Promise<Object>} Upsert status with count information
     */
    async upsertVectors(messagesWithEmbeddings) {
        await this.ensureInitialized();
        
        try {
            if (!messagesWithEmbeddings || messagesWithEmbeddings.length === 0) {
                return {
                    success: true,
                    upsertedCount: 0,
                    message: 'No vectors to upsert'
                };
            }

            console.log(`Upserting ${messagesWithEmbeddings.length} vectors to Pinecone...`);
            let totalUpserted = 0;

            // Process in batches for efficiency
            const batchSize = 100;
            for (let i = 0; i < messagesWithEmbeddings.length; i += batchSize) {
                const batch = messagesWithEmbeddings.slice(i, i + batchSize);
                
                // Prepare documents for LangChain's vector store
                const documents = batch.map(msg => {
                    const content = msg.content;
                    return {
                        pageContent: content,
                        metadata: {
                            ...msg.metadata,
                            text: content,
                            pageContent: content,
                            content: content
                        }
                    };
                });

                // Add vectors with explicit IDs
                await this.vectorStore.addVectors(
                    batch.map(msg => msg.embedding),
                    documents,
                    batch.map(msg => msg.id)
                );

                // Wait for vectors to be indexed (2 seconds minimum)
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Verify vectors were actually added by checking one from the batch
                const sampleId = batch[0].id;
                let verifyResult;
                let retryCount = 0;
                const maxRetries = 5;

                while (retryCount < maxRetries) {
                    verifyResult = await this.index.fetch([sampleId]);
                    if (verifyResult.records && verifyResult.records[sampleId]) {
                        break;
                    }
                    retryCount++;
                    // Exponential backoff: 2s, 4s, 6s, 8s, 10s
                    const delay = 2000 * retryCount;
                    console.log(`Vector not found on attempt ${retryCount}, waiting ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                if (!verifyResult.records || !verifyResult.records[sampleId]) {
                    throw new Error('Vector upsert verification failed - vectors not found after upsert');
                }

                totalUpserted += batch.length;
                console.log(`Upserted and verified batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(messagesWithEmbeddings.length / batchSize)}`);
            }

            // Final verification - check a random vector from each batch
            console.log('Performing final verification...');
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before final verification
            
            const verificationIds = [];
            for (let i = 0; i < messagesWithEmbeddings.length; i += batchSize) {
                const batch = messagesWithEmbeddings.slice(i, i + batchSize);
                verificationIds.push(batch[0].id);
            }
            
            const finalVerification = await this.index.fetch(verificationIds);
            const missingVectors = verificationIds.filter(id => !finalVerification.records[id]);
            if (missingVectors.length > 0) {
                throw new Error(`Final verification failed - missing vectors: ${missingVectors.join(', ')}`);
            }

            return {
                success: true,
                upsertedCount: totalUpserted,
                message: `Successfully upserted ${totalUpserted} vectors`
            };
        } catch (error) {
            console.error('Error upserting vectors:', error);
            throw error;
        }
    }

    /**
     * Fetch a vector by ID from Pinecone
     * @param {string} id Vector ID to fetch
     * @returns {Promise<Object>} Vector data or error
     */
    async fetchVector(id) {
        await this.ensureInitialized();
        
        try {
            console.log(`Attempting to fetch vector with ID: ${id}`);
            const result = await this.index.fetch([id]);

            console.log('Raw Pinecone response:', JSON.stringify(result, null, 2));

            // Check result.records instead of result.vectors
            if (!result || !result.records || !result.records[id]) {
                console.warn(`No vector found for ID: ${id}`);
                return {
                    success: false,
                    error: 'Vector not found'
                };
            }

            const record = result.records[id];
            return {
                success: true,
                vector: {
                    id,
                    values: record.values,
                    metadata: record.metadata
                }
            };
        } catch (error) {
            console.error('Error fetching vector:', error);
            throw new Error(`Failed to fetch vector: ${error.message}`);
        }
    }

    /**
     * Query random vectors for validation
     * @param {number} count Number of random vectors to query
     * @returns {Promise<Array>} Array of random vectors with their metadata
     */
    async queryRandomVectors(count = 5) {
        try {
            await this.ensureInitialized();
            
            // Create a neutral vector of 3072 dimensions
            const neutralVector = Array(3072).fill(0.1);
            
            // Query with the neutral vector to get random-like results
            // Use a higher topK to ensure we get results
            const result = await this.index.query({
                vector: neutralVector,
                topK: Math.max(count * 2, 10), // Request more than needed to ensure we get enough
                includeMetadata: true,
                includeValues: true
            });

            if (!result.matches || result.matches.length === 0) {
                console.error('No matches found in query response');
                return {
                    success: false,
                    error: 'No vectors found in index'
                };
            }

            // Take only the requested number of matches
            const vectors = result.matches.slice(0, count).map(match => ({
                id: match.id,
                values: match.values,
                metadata: {
                    ...match.metadata,
                    content: match.metadata.text || match.metadata.content || match.metadata.pageContent
                }
            }));

            console.log(`Found ${vectors.length} random vectors`);
            return {
                success: true,
                vectors
            };
        } catch (error) {
            console.error('Error querying random vectors:', error);
            return {
                success: false,
                error: error.message || 'Failed to query random vectors'
            };
        }
    }
}

export default new RAGService(); 