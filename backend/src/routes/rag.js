/**
 * @file rag.js
 * @description Routes for RAG (Retrieval Augmented Generation) operations
 */

import express from 'express';
import { authenticateJWT } from '../middleware/auth.js';
import ragService from '../services/ragService.js';

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
router.get('/vectorstore/stats', async (req, res) => {
    try {
        const stats = await ragService.getVectorStoreStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting vector store stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get vector store stats',
            details: error.message
        });
    }
});

/**
 * @route POST /api/rag/vectorstore/upsert
 * @description Upsert vectors into the vector store
 */
router.post('/vectorstore/upsert', async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request: messages array is required'
            });
        }

        // First generate embeddings
        const messagesWithEmbeddings = await ragService.generateEmbeddings(messages);
        
        // Then upsert to vector store
        const upsertResult = await ragService.upsertVectors(messagesWithEmbeddings);
        
        res.json({
            success: true,
            ...upsertResult,
            embeddingStatus: ragService.getEmbeddingStatus()
        });
    } catch (error) {
        console.error('Error upserting vectors:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upsert vectors',
            details: error.message
        });
    }
});

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

export default router; 