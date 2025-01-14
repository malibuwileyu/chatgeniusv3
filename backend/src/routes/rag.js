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

export default router; 