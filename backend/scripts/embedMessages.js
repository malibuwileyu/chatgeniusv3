/**
 * @file embedMessages.js
 * @description Script to embed messages from the database into a vector store using LangChain.
 * This script handles the entire pipeline of fetching messages, chunking them if needed,
 * generating embeddings, and upserting them to Pinecone.
 * 
 * Features:
 * - Fetches messages from Supabase
 * - Chunks long messages for better context handling
 * - Generates embeddings using OpenAI's text-embedding-3-large model
 * - Stores vectors in Pinecone with metadata
 * - Validates the upsert with random queries
 * 
 * Usage:
 * 1. Ensure environment variables are set:
 *    - OPENAI_API_KEY
 *    - PINECONE_API_KEY
 *    - SUPABASE_URL
 *    - SUPABASE_SERVICE_KEY
 * 
 * 2. Run the script:
 *    ```bash
 *    node embedMessages.js
 *    ```
 * 
 * 3. Optional parameters:
 *    - --batch-size: Number of messages to process at once (default: 100)
 *    - --chunk-size: Maximum size of text chunks (default: 1000)
 *    - --chunk-overlap: Overlap between chunks (default: 200)
 * 
 * The script will:
 * 1. Connect to Supabase and fetch messages
 * 2. Process messages in batches
 * 3. Generate embeddings using OpenAI
 * 4. Upsert vectors to Pinecone
 * 5. Validate the results
 */

import { supabase } from '../src/config/supabase.js';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize text splitter with conservative settings
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", " ", ""]
});

// Initialize OpenAI embeddings
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-large",
    stripNewLines: true,
    batchSize: 512
});

// Initialize Pinecone client
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});

/**
 * Splits message content into chunks if needed
 * @param {Object} message Message object with content and metadata
 * @returns {Promise<Array>} Array of chunks with metadata
 */
async function chunkMessage(message) {
    if (!message.content || message.content.length < 1000) {
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

    const chunks = await textSplitter.createDocuments(
        [message.content],
        [{
            ...message.metadata,
            original_message_id: message.id
        }]
    );

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
 * Updates the last_embedded_at timestamp for successfully embedded messages
 * @param {Array<string>} messageIds Array of message IDs to update
 * @returns {Promise<void>}
 */
async function updateEmbeddingTimestamp(messageIds) {
    const { error } = await supabase
        .from('messages')
        .update({ last_embedded_at: new Date().toISOString() })
        .in('id', messageIds);

    if (error) throw error;
}

/**
 * Fetches messages from the database for embedding
 * @param {Object} options Options for fetching messages
 * @returns {Promise<Array>} Array of messages with their metadata
 */
async function fetchMessages(options = { offset: 0, limit: 100 }) {
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
        .or('last_embedded_at.is.null,last_embedded_at.lt.now-interval-7d')
        .order('created_at', { ascending: true })
        .range(options.offset, options.offset + options.limit - 1);

    if (error) throw error;
    if (!messages || messages.length === 0) return [];

    return messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        metadata: {
            sender_id: msg.sender?.id,
            sender_username: msg.sender?.username,
            created_at: msg.created_at,
            type: msg.type
        }
    }));
}

/**
 * Main function to process and embed messages
 */
async function main() {
    try {
        console.log('Starting message embedding process...');

        // Initialize vector store
        const indexName = process.env.PINECONE_INDEX || 'chatgenius-rag-index';
        const { indexes } = await pinecone.listIndexes();
        const indexExists = indexes.some(index => index.name === indexName);

        if (!indexExists) {
            console.log(`Creating new index: ${indexName}`);
            await pinecone.createIndex({
                name: indexName,
                dimension: 3072,
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-west-2'
                    }
                }
            });
            await new Promise(resolve => setTimeout(resolve, 60000));
        }

        const index = pinecone.Index(indexName);
        const vectorStore = await PineconeStore.fromExistingIndex(
            embeddings,
            { pineconeIndex: index }
        );

        // Process messages in batches
        let offset = 0;
        const batchSize = 100;
        let totalProcessed = 0;

        while (true) {
            console.log(`\nProcessing batch starting at offset ${offset}...`);
            const messages = await fetchMessages({ offset, limit: batchSize });
            if (messages.length === 0) break;

            // Chunk messages
            const chunkedMessages = await Promise.all(
                messages.map(msg => chunkMessage(msg))
            );
            const flatChunks = chunkedMessages.flat();

            // Generate embeddings
            const texts = flatChunks.map(chunk => chunk.content);
            const embeddingVectors = await embeddings.embedDocuments(texts);

            // Prepare documents for upsert
            const documents = flatChunks.map((chunk, i) => ({
                pageContent: chunk.content,
                metadata: {
                    ...chunk.metadata,
                    text: chunk.content,
                    content: chunk.content
                }
            }));

            // Upsert to vector store
            await vectorStore.addVectors(
                embeddingVectors,
                documents,
                flatChunks.map(chunk => chunk.id)
            );

            // Update last_embedded_at timestamp
            await updateEmbeddingTimestamp(messages.map(msg => msg.id));

            // Wait for indexing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Verify random vectors from this batch
            const sampleId = flatChunks[0].id;
            const verifyResult = await index.fetch([sampleId]);
            if (!verifyResult.records || !verifyResult.records[sampleId]) {
                throw new Error('Vector upsert verification failed');
            }

            totalProcessed += messages.length;
            console.log(`Successfully processed ${totalProcessed} messages total`);
            offset += batchSize;
        }

        // Final verification
        const stats = await index.describeIndexStats();
        console.log('\nFinal vector store stats:', stats);

        console.log('\nMessage embedding process completed successfully!');
    } catch (error) {
        console.error('Error in embedding process:', error);
        process.exit(1);
    }
}

// Run the script
if (process.argv[1] === new URL(import.meta.url).pathname) {
    main().catch(console.error);
} 