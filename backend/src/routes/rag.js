/**
 * @file rag.js
 * @description Routes for RAG (Retrieval Augmented Generation) operations
 */

import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import { ragQueryLimiter } from '../middleware/rateLimit.js';
import ragService from '../services/ragService.js';
import ragController from '../controllers/ragController.js';

const router = express.Router();

// Protect all routes with JWT authentication
router.use(authenticateJWT);

/**
 * @route GET /api/rag/messages
 * @description Fetch messages for embedding with pagination
 */
router.get('/messages', async (req, res) => {
    try {
        const offset = parseInt(req.query.offset) || 0;
        const limit = parseInt(req.query.limit) || 100;

        const messages = await ragService.fetchMessagesForEmbedding({ offset, limit });
        res.json({
            success: true,
            messages,
            metadata: {
                offset,
                limit,
                count: messages.length
            }
        });
    } catch (error) {
        console.error('Error fetching messages for embedding:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch messages',
            details: error.message
        });
    }
});

/**
 * @route POST /api/rag/embeddings
 * @description Generate embeddings for a batch of messages
 */
router.post('/embeddings', async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request: messages array is required'
            });
        }

        const messagesWithEmbeddings = await ragService.generateEmbeddings(messages);
        
        res.json({
            success: true,
            messages: messagesWithEmbeddings,
            status: ragService.getEmbeddingStatus()
        });
    } catch (error) {
        console.error('Error generating embeddings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate embeddings',
            details: error.message
        });
    }
});

/**
 * @route GET /api/rag/vectorstore/status
 * @description Check vector store connection status
 */
router.get('/vectorstore/status', async (req, res) => {
    try {
        const status = await ragService.getVectorStoreStatus();
        res.json(status);
    } catch (error) {
        console.error('Error checking vector store status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check vector store status',
            details: error.message
        });
    }
});

/**
 * @route GET /api/rag/vectorstore/index
 * @description Get vector store index configuration
 */
router.get('/vectorstore/index', async (req, res) => {
    try {
        const indexInfo = await ragService.getVectorStoreIndexInfo();
        res.json(indexInfo);
    } catch (error) {
        console.error('Error getting vector store index info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get vector store index info',
            details: error.message
        });
    }
});

/**
 * @route GET /api/rag/vectorstore/stats
 * @description Get vector store statistics
 */
router.get('/vectorstore/stats', (req, res) => ragController.getVectorStoreStats(req, res));

/**
 * @route POST /api/rag/vectorstore/upsert
 * @description Upsert vectors into the vector store
 */
router.post('/vectorstore/upsert', (req, res) => ragController.upsertVectors(req, res));

/**
 * @route GET /api/rag/vectorstore/vectors/random
 * @description Get random vectors for validation
 */
router.get('/vectorstore/vectors/random', async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 5;
        const result = await ragService.queryRandomVectors(count);
        
        console.log('Random vectors response:', JSON.stringify(result, null, 2));
        
        // Always return 200, even for "no vectors" cases
        res.status(200).json(result);
    } catch (error) {
        console.error('Error querying random vectors:', error);
        // Return 200 with error info instead of 500
        res.status(200).json({
            success: false,
            error: error.message || 'Failed to query random vectors'
        });
    }
});

/**
 * @route GET /api/rag/vectorstore/vectors/:id
 * @description Fetch a vector by ID
 */
router.get('/vectorstore/vectors/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await ragService.fetchVector(id);
        res.json(result);
    } catch (error) {
        console.error('Error fetching vector:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vector',
            details: error.message
        });
    }
});

/**
 * @route POST /api/rag/ask
 * @description Process a user's question using RAG to generate a contextually informed answer
 */
router.post('/ask', async (req, res) => {
    try {
        console.log('Endpoint called: POST /api/rag/ask');
        console.log('Request headers:', req.headers);
        console.log('Request body:', req.body);
        
        const { query } = req.body;
        
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            console.log('Invalid query:', query);
            return res.status(400).json({
                success: false,
                error: 'Invalid or missing query'
            });
        }

        // Return hardcoded response for testing
        const response = {
            success: true,
            answer: "Hello! I'm the AI assistant. I see you're trying to chat with me. This is a test response to confirm the messaging system is working.",
            metadata: {
                query,
                timestamp: new Date().toISOString(),
                endpoint: 'POST /api/rag/ask'
            }
        };
        console.log('Sending response:', response);
        return res.status(200).json(response);

    } catch (error) {
        console.error('Error processing RAG query:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while processing query'
        });
    }
});

// Check which messages have been upserted
router.get('/vectorstore/check-upserted', authenticateJWT, async (req, res) => {
    try {
        const result = await ragController.checkUpsertedMessages(req, res);
        res.json(result);
    } catch (error) {
        console.error('Error checking upserted messages:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to check upserted messages'
        });
    }
});

// Import documents as messages
router.post('/documents/import', authenticateJWT, async (req, res) => {
    try {
        const { documents } = req.body;
        if (!documents || !Array.isArray(documents)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request: documents array required'
            });
        }
        const result = await ragController.importDocuments(req, res);
        res.json(result);
    } catch (error) {
        console.error('Error importing documents:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to import documents'
        });
    }
});

// Upsert all pending messages
router.post('/vectorstore/upsert-pending', authenticateJWT, async (req, res) => {
    try {
        const result = await ragController.upsertPendingMessages(req, res);
        res.json(result);
    } catch (error) {
        console.error('Error upserting pending messages:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upsert pending messages'
        });
    }
});

// Search endpoint
router.post('/search', async (req, res) => {
    try {
        const { query } = req.body;
        
        // Validate input
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Query is required and must be a string'
            });
        }

        // Perform search
        const result = await ragService.search(query);
        
        // Return results
        res.json(result);
    } catch (error) {
        console.error('Error in search endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @route GET /api/rag/reembedding/status
 * @description Get the status of the re-embedding cron job
 */
router.get('/reembedding/status', authenticateJWT, async (req, res) => {
    try {
        const { getJobStatus } = await import('../cron/reembedding.js');
        const status = getJobStatus();

        // Get vector store stats
        const vectorStoreStats = await ragService.getVectorStoreStatus();

        res.json({
            success: true,
            jobStatus: status,
            vectorStore: vectorStoreStats,
            lastCheck: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting re-embedding status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get re-embedding status',
            details: error.message
        });
    }
});

export default router; 