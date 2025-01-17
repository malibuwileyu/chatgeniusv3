/**
 * @file index.js
 * @description Main application entry point that sets up the Express server with middleware,
 * route configurations, and authentication.
 */

// Set LangSmith to use background callbacks
process.env.LANGCHAIN_CALLBACKS_BACKGROUND = 'true';

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
import healthRoutes from './routes/health.js';
import { authenticateJWT } from './middleware/auth.js';
import cronReembedding from './api/cron/reembedding.js';

// Initialize development-only services
async function initDevServices() {
    if (process.env.NODE_ENV !== 'production') {
        try {
            const [reembedding, messageListener] = await Promise.all([
                import('./cron/reembedding.js'),
                import('./services/messageListenerService.js')
            ]);
            console.log('Development services initialized: Cron job and Message Listener');
        } catch (error) {
            console.error('Error initializing development services:', error);
        }
    }
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: ['https://chatgeniusv3-frontend-7p62cpqua-ryan-herons-projects.vercel.app', 'https://chatgeniusv3-frontend.vercel.app', 'http://localhost:5173', ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(passport.initialize());

// Routes

// Root route handler
app.get('/', (req, res) => {
    res.json({
        message: 'ChatGenius API - Use /api/health for server status',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth/*',
            messages: '/api/messages/*',
            channels: '/api/channels/*',
            users: '/api/users/*',
            reactions: '/api/reactions/*',
            files: '/api/files/*',
            rag: '/api/rag/*'
        }
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/cron/reembedding', cronReembedding);

// 404 handler - for undefined routes
app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.method} ${req.originalUrl}`);
    error.status = 404;
    next(error);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        status: err.status || 500,
        path: req.path,
        method: req.method,
        headers: req.headers,
        query: req.query,
        body: req.body
    });

    res.status(err.status || 500).json({
        error: {
            message: err.message,
            status: err.status || 500,
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
        }
    });
});

// Protected route example
app.get('/api/protected', authenticateJWT, (req, res) => {
    res.json({ message: 'Protected route accessed successfully', user: req.user });
});

// Only start server if running locally
if (process.env.NODE_ENV !== 'production') {
    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        // Initialize development services after server starts
        initDevServices().catch(console.error);
    });
} 