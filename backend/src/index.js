/**
 * @file index.js
 * @description Main application entry point that sets up the Express server with middleware,
 * route configurations, and authentication. This file initializes core server functionality
 * including CORS, authentication middleware, and API routes for the chat application.
 * 
 * Key Features:
 * - Express server configuration
 * - CORS setup for frontend communication
 * - Passport authentication integration
 * - API route mounting
 * - Protected route middleware implementation
 * - Scheduled re-embedding process
 * 
 * @version 1.0.0
 * @created 2024-01-14
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from './config/passport.js';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';
import channelRoutes from './routes/channels.js';
import userRoutes from './routes/users.js';
import reactionRoutes from './routes/reactions.js';
import fileRoutes from './routes/files.js';
import ragRoutes from './routes/rag.js';
import { authenticateJWT } from './middleware/auth.js';
import './cron/reembedding.js'; // Import cron job

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/rag', ragRoutes);

// Protected route example
app.get('/api/protected', authenticateJWT, (req, res) => {
    res.json({ message: 'Protected route accessed successfully', user: req.user });
});

// Start server only if not being imported for tests
const server = app.listen(PORT, () => {
    if (process.argv[1] !== new URL(import.meta.url).pathname) {
        console.log('Server started for testing');
    } else {
        console.log(`Server running on port ${PORT}`);
        console.log('Re-embedding cron job started');
    }
});

// Export for testing
export { app, server }; 