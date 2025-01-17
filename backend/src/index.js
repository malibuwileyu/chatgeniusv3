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
import { authenticateJWT } from './middleware/auth.js';

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

// CORS configuration
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:5173',
            'https://chatgeniusv3-frontend.vercel.app',
            'https://chatgeniusv3-frontend.vercel.app/',
            'https://chatgeniusv3-frontend-ax5uh99o4-ryan-herons-projects.vercel.app/'
        ];
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        
        return callback(null, origin);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization'],
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

// Only start server if running locally
if (process.env.NODE_ENV !== 'production') {
    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        // Initialize development services after server starts
        initDevServices().catch(console.error);
    });
} 