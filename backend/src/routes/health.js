import express from 'express';
import { createClient } from '@supabase/supabase-js';
import pkg from '@pinecone-database/pinecone';
const { PineconeClient } = pkg;
import { OpenAI } from 'openai';
import os from 'os';

const router = express.Router();

router.get('/', async (req, res) => {
    const health = {
        timestamp: new Date().toISOString(),
        status: 'checking',
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
        server: {
            platform: process.platform,
            nodeVersion: process.version,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            vercel: {
                environment: process.env.VERCEL_ENV || 'not set',
                url: process.env.VERCEL_URL || 'not set',
                region: process.env.VERCEL_REGION || 'not set'
            },
            env: {
                port: process.env.PORT || '3000',
                hasOpenAIKey: !!process.env.OPENAI_API_KEY,
                hasPineconeKey: !!process.env.PINECONE_API_KEY,
                hasSupabaseUrl: !!process.env.SUPABASE_URL,
                hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
                supabaseUrl: process.env.SUPABASE_URL || 'not set',
                supabaseKey: process.env.SUPABASE_SERVICE_KEY ? '[present]' : 'not set',
                pineconeKey: process.env.PINECONE_API_KEY ? '[present]' : 'not set',
                pineconeIndex: process.env.PINECONE_INDEX || 'not set'
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
            if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
                throw new Error('Missing Supabase credentials');
            }
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_KEY
            );
            const { data, error } = await supabase.from('users').select('id').limit(1);
            if (error) throw error;
            health.services.supabase = 'healthy';
        } catch (error) {
            health.services.supabase = 'unhealthy';
            health.errors.push({
                service: 'supabase',
                error: error.message,
                context: {
                    hasUrl: !!process.env.SUPABASE_URL,
                    hasKey: !!process.env.SUPABASE_SERVICE_KEY,
                    url: process.env.SUPABASE_URL || 'not set'
                }
            });
        }

        // Check Pinecone
        try {
            if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
                throw new Error('Missing Pinecone credentials');
            }
            const pinecone = new PineconeClient();
            await pinecone.init({
                apiKey: process.env.PINECONE_API_KEY,
            });
            const indexes = await pinecone.listIndexes();
            health.services.pinecone = 'healthy';
        } catch (error) {
            health.services.pinecone = 'unhealthy';
            health.errors.push({
                service: 'pinecone',
                error: error.message,
                context: {
                    hasKey: !!process.env.PINECONE_API_KEY,
                    hasIndex: !!process.env.PINECONE_INDEX,
                    index: process.env.PINECONE_INDEX || 'not set'
                }
            });
        }

        // Check OpenAI
        try {
            if (!process.env.OPENAI_API_KEY) {
                throw new Error('Missing OpenAI API key');
            }
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
            const models = await openai.models.list();
            health.services.openai = 'healthy';
        } catch (error) {
            health.services.openai = 'unhealthy';
            health.errors.push({
                service: 'openai',
                error: error.message,
                context: {
                    hasKey: !!process.env.OPENAI_API_KEY
                }
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