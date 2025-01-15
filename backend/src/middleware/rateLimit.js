/**
 * @file rateLimit.js
 * @description Rate limiting middleware for RAG queries
 */

import rateLimit from 'express-rate-limit';
import { MemoryStore } from 'express-rate-limit';

// Rate limit for RAG queries - 10 requests per minute per IP
export const ragQueryLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 10, // limit each IP to 10 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests, please try again later.',
        details: 'Rate limit exceeded: Maximum 10 requests per minute.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting in test environment
    skip: (req) => process.env.NODE_ENV === 'test',
    // Use memory store from express-rate-limit
    store: new MemoryStore()
}); 