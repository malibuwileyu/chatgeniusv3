import express from 'express';
import { createClient } from '@supabase/supabase-js';
import pkg from '@pinecone-database/pinecone';
const { PineconeClient } = pkg;
import { OpenAI } from 'openai';
import os from 'os';

const router = express.Router();

// Initialize clients
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const pinecone = new PineconeClient();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

router.get('/', async (req, res) => {
    const health = {
        timestamp: new Date().toISOString(),
        status: 'checking',
        environment: process.env.NODE_ENV || 'unknown',
        server: {
            platform: process.platform,
            nodeVersion: process.version,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            env: {
                port: process.env.PORT || '3000',
                hasOpenAIKey: !!process.env.OPENAI_API_KEY,
                hasPineconeKey: !!process.env.PINECONE_API_KEY,
                hasSupabaseUrl: !!process.env.SUPABASE_URL,
                hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
                corsOrigins: process.env.CORS_ORIGINS || 'not set'
            }
        },
        services: {
            supabase: 'checking',
            pinecone: 'checking',
            openai: 'checking'
        },
        errors: []
    };

    try {
        // Check Supabase
        try {
            const { data, error } = await supabase.from('users').select('id').limit(1);
            if (error) throw error;
            health.services.supabase = 'healthy';
        } catch (error) {
            health.services.supabase = 'unhealthy';
            health.errors.push({
                service: 'supabase',
                error: error.message
            });
        }

        // Check Pinecone
        try {
            await pinecone.init({
                environment: process.env.PINECONE_ENVIRONMENT,
                apiKey: process.env.PINECONE_API_KEY,
            });
            const indexes = await pinecone.listIndexes();
            health.services.pinecone = 'healthy';
        } catch (error) {
            health.services.pinecone = 'unhealthy';
            health.errors.push({
                service: 'pinecone',
                error: error.message
            });
        }

        // Check OpenAI
        try {
            const models = await openai.models.list();
            health.services.openai = 'healthy';
        } catch (error) {
            health.services.openai = 'unhealthy';
            health.errors.push({
                service: 'openai',
                error: error.message
            });
        }

        // Set overall status
        health.status = health.errors.length === 0 ? 'healthy' : 'degraded';

    } catch (error) {
        health.status = 'unhealthy';
        health.errors.push({
            service: 'general',
            error: error.message
        });
    }

    res.json(health);
});

export default router; 