/**
 * @file reembedding.js
 * @description Vercel Cron endpoint to run the re-embedding process every 5 minutes.
 * This file is designed to be called by Vercel's cron system and integrates with 
 * the RAG service for re-embedding.
 */

import { RAGService } from '../../services/ragService.js';
import { supabase } from '../../config/supabase.js';

// Initialize RAG service
const ragService = new RAGService();

// Job status tracking in database
const MAX_CONSECUTIVE_FAILURES = 3;
const MAX_PROCESSING_TIME = 240000; // 4 minutes

/**
 * Send alert for job issues
 * @param {string} type Alert type ('error', 'warning', 'info')
 * @param {string} message Alert message
 * @param {Object} details Additional details
 */
async function sendAlert(type, message, details = {}) {
    console.error(`[ALERT] ${type.toUpperCase()}: ${message}`, details);

    try {
        await supabase
            .from('system_alerts')
            .insert({
                type,
                message,
                details,
                service: 're-embedding',
                created_at: new Date().toISOString()
            });
    } catch (error) {
        console.error('Failed to log alert:', error);
    }
}

/**
 * Check job status from database
 */
async function getJobStatus() {
    try {
        const { data, error } = await supabase
            .from('cron_status')
            .select('*')
            .eq('job_name', 'reembedding')
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting job status:', error);
        return null;
    }
}

/**
 * Update job status in database
 */
async function updateJobStatus(status) {
    try {
        const { error } = await supabase
            .from('cron_status')
            .upsert({
                job_name: 'reembedding',
                ...status,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
    } catch (error) {
        console.error('Error updating job status:', error);
    }
}

/**
 * Main handler for the Vercel Cron job
 */
export default async function handler(req, res) {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Only allow GET and POST methods
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const startTime = Date.now();
    try {
        console.log('\n=== Starting Scheduled Re-embedding Job ===');
        console.log('Time:', new Date().toISOString());

        // Get current job status
        const currentStatus = await getJobStatus();
        const consecutiveFailures = currentStatus?.consecutive_failures || 0;

        // Run the re-embedding process
        const result = await ragService.scheduleReembedding({ reembedAfterHours: 24 });

        // Calculate processing time
        const processingTime = Date.now() - startTime;

        // Update job status
        await updateJobStatus({
            last_run_time: new Date().toISOString(),
            last_run_status: result.success ? 'success' : 'failed',
            consecutive_failures: result.success ? 0 : consecutiveFailures + 1,
            last_processed_count: result.messagesProcessed || 0,
            avg_processing_time: currentStatus?.avg_processing_time 
                ? (currentStatus.avg_processing_time * 0.8 + processingTime * 0.2)
                : processingTime,
            health: result.success ? 'healthy' : (consecutiveFailures + 1 >= MAX_CONSECUTIVE_FAILURES ? 'critical' : 'warning')
        });

        // Check for issues
        if (!result.success) {
            await sendAlert('error', 'Re-embedding job failed', {
                error: result.error,
                consecutiveFailures: consecutiveFailures + 1
            });

            if (consecutiveFailures + 1 >= MAX_CONSECUTIVE_FAILURES) {
                await sendAlert('error', 'Re-embedding job has failed multiple times', {
                    consecutiveFailures: consecutiveFailures + 1,
                    lastError: result.error
                });
            }
        }

        // Check processing time
        if (processingTime > MAX_PROCESSING_TIME) {
            await sendAlert('warning', 'Re-embedding job took longer than expected', {
                processingTime,
                maxAllowed: MAX_PROCESSING_TIME,
                messagesProcessed: result.messagesProcessed
            });
        }

        // Log completion
        console.log('Job completed:', {
            success: result.success,
            messagesProcessed: result.messagesProcessed,
            processingTime,
            status: result.status,
            error: result.error
        });

        return res.status(200).json({
            success: true,
            result: {
                success: result.success,
                messagesProcessed: result.messagesProcessed,
                processingTime,
                status: result.status
            }
        });

    } catch (error) {
        console.error('Error in re-embedding job:', error);
        
        await sendAlert('error', 'Re-embedding job threw an exception', {
            error: error.message,
            stack: error.stack
        });

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
} 